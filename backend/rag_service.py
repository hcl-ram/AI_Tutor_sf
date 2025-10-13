import os
import io
import json
import time
import shutil
import string
import logging
import threading
from typing import List, Dict, Optional, Tuple

import boto3
from botocore.client import Config
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
try:
    from dotenv import load_dotenv
except Exception:
    load_dotenv = None  # type: ignore

try:
    import faiss  # type: ignore
except Exception as faiss_error:  # pragma: no cover - runtime dependency
    faiss = None  # type: ignore

try:
    from pypdf import PdfReader
except Exception as pdf_error:  # pragma: no cover - runtime dependency
    PdfReader = None  # type: ignore


# ------------------------------
# Configuration
# ------------------------------

# Load environment from .env if present
if load_dotenv is not None:
    # Allow overriding path via ENV_FILE, else default to .env in cwd
    load_dotenv(os.getenv("ENV_FILE", ".env"))

AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
S3_BUCKET = os.getenv("S3_BUCKET", "")
S3_PREFIX = os.getenv("S3_PREFIX", "")  # e.g., "documents/"
DATA_DIR = os.getenv("RAG_DATA_DIR", os.path.join(os.getcwd(), "data"))
INDEX_DIR = os.getenv("RAG_INDEX_DIR", os.path.join(os.getcwd(), "index"))

# Bedrock models (override via env if needed)
BEDROCK_EMBED_MODEL_ID = os.getenv("BEDROCK_EMBED_MODEL_ID", "amazon.titan-embed-text-v2:0")
BEDROCK_CHAT_MODEL_ID = os.getenv("BEDROCK_CHAT_MODEL_ID", "amazon.titan-text-premier-v1:0")

os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(INDEX_DIR, exist_ok=True)


# ------------------------------
# App setup
# ------------------------------

app = FastAPI(title="RAG Service", version="0.2.0-bedrock")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logger = logging.getLogger("rag_service")
logging.basicConfig(level=logging.INFO)


# ------------------------------
# Models
# ------------------------------

class AskRequest(BaseModel):
    question: str
    top_k: int = 5


class AskResponse(BaseModel):
    answer: str
    sources: List[Dict[str, str]]
    took_ms: int


# ------------------------------
# Utilities
# ------------------------------

def normalize_text(text: str) -> str:
    if not text:
        return ""
    # Collapse whitespace and strip control chars
    text = " ".join(text.split())
    printable = set(string.printable)
    return "".join(ch for ch in text if ch in printable)


def chunk_text(text: str, chunk_size: int = 800, chunk_overlap: int = 150) -> List[str]:
    if not text:
        return []
    text = normalize_text(text)
    chunks: List[str] = []
    start = 0
    n = len(text)
    while start < n:
        end = min(n, start + chunk_size)
        chunk = text[start:end]
        chunks.append(chunk)
        start = end - chunk_overlap
        if start < 0:
            start = 0
        if start >= n:
            break
        if end == n:
            break
    return chunks


def load_pdf_bytes_to_text(file_bytes: bytes) -> str:
    if PdfReader is None:
        raise RuntimeError("pypdf is required for PDF parsing. Install with: pip install pypdf")
    reader = PdfReader(io.BytesIO(file_bytes))
    pages_text: List[str] = []
    for page in reader.pages:
        try:
            pages_text.append(page.extract_text() or "")
        except Exception:
            pages_text.append("")
    return "\n".join(pages_text)


def load_object_bytes_to_text(key: str, file_bytes: bytes) -> str:
    key_lower = key.lower()
    if key_lower.endswith(".pdf"):
        return load_pdf_bytes_to_text(file_bytes)
    # Assume utf-8 text for .txt, .md, .csv, etc.
    try:
        return file_bytes.decode("utf-8", errors="ignore")
    except Exception:
        return ""


# ------------------------------
# Index & Embeddings
# ------------------------------

index_lock = threading.RLock()
faiss_index = None  # type: ignore
docstore: List[Dict[str, str]] = []  # {"chunk": str, "source": str}

# Bedrock runtime client (created lazily to allow import without AWS creds set)
_bedrock_runtime_client = None
_boto3_session = None


def get_boto3_session():
    """Create or reuse a boto3 Session respecting .env variables or AWS_PROFILE."""
    global _boto3_session
    if _boto3_session is not None:
        return _boto3_session
    profile = os.getenv("AWS_PROFILE")
    aws_access_key = os.getenv("AWS_ACCESS_KEY_ID")
    aws_secret = os.getenv("AWS_SECRET_ACCESS_KEY")
    if profile:
        _boto3_session = boto3.Session(profile_name=profile, region_name=AWS_REGION)
    elif aws_access_key and aws_secret:
        _boto3_session = boto3.Session(
            aws_access_key_id=aws_access_key,
            aws_secret_access_key=aws_secret,
            region_name=AWS_REGION,
        )
    else:
        # Falls back to env vars from dotenv or instance role
        _boto3_session = boto3.Session(region_name=AWS_REGION)
    return _boto3_session


def get_bedrock_runtime_client():
    global _bedrock_runtime_client
    if _bedrock_runtime_client is None:
        session = get_boto3_session()
        _bedrock_runtime_client = session.client("bedrock-runtime", region_name=AWS_REGION)
    return _bedrock_runtime_client


def build_faiss_index(embeddings: List[List[float]]):
    if faiss is None:
        raise RuntimeError("faiss-cpu is required. Install with: pip install faiss-cpu")
    import numpy as np

    matrix = np.array(embeddings, dtype="float32")
    # Normalize for cosine similarity via inner product
    faiss.normalize_L2(matrix)
    index = faiss.IndexFlatIP(matrix.shape[1])
    index.add(matrix)
    return index


def embed_texts(texts: List[str]) -> List[List[float]]:
    """Embed texts using AWS Bedrock Titan embedding model.

    Note: Titan embedding API is single-input per request. For simplicity and
    robustness, we call it per text. For large corpora, consider batching with
    concurrency or using batch endpoints.
    """
    import numpy as np

    client = get_bedrock_runtime_client()
    vectors: List[List[float]] = []
    for t in texts:
        payload = {"inputText": t}
        body = json.dumps(payload).encode("utf-8")
        resp = client.invoke_model(modelId=BEDROCK_EMBED_MODEL_ID, body=body)
        resp_payload = json.loads(resp["body"].read())
        embedding = resp_payload.get("embedding") or resp_payload.get("vector")
        if not embedding:
            raise RuntimeError("Bedrock embedding response missing 'embedding' field")
        # Normalize to unit length to approximate cosine similarity via dot product
        vec = np.array(embedding, dtype="float32")
        norm = np.linalg.norm(vec)
        if norm > 0:
            vec = vec / norm
        vectors.append(vec.tolist())
    return vectors


def build_context_from_document(question: str, s3_key: str, top_k: int = 5) -> Tuple[str, List[Dict[str, str]]]:
    """Builds a concise context from a single S3 document relevant to the question.

    Returns a tuple of (context, sources).
    """
    # Dev fallback for mock keys: avoid S3 and use embedded sample text
    if s3_key.startswith("mock/"):
        text = (
            "This is a sample document used for development and testing. "
            "It contains sentences about education, mathematics (Pythagorean theorem), science (photosynthesis), "
            "and general facts like the capital of India being New Delhi."
        )
    else:
        client = s3_client()
        try:
            obj = client.get_object(Bucket=S3_BUCKET, Key=s3_key)
            body: bytes = obj["Body"].read()
        except Exception as e:
            raise RuntimeError(f"Failed to fetch document from S3: {e}")

        text = load_object_bytes_to_text(s3_key, body)
    chunks = chunk_text(text)
    if not chunks:
        return "", []

    # Try semantic ranking via Bedrock embeddings; fallback to simple keyword ranking
    try:
        import numpy as np
        chunk_vectors = embed_texts(chunks)
        q_vec = embed_texts([question])[0]
        q = np.array(q_vec, dtype="float32")
        matrix = np.array(chunk_vectors, dtype="float32")
        scores = matrix @ q  # cosine-like because vectors are unit-normalized
        top_k = max(1, min(top_k, len(chunks)))
        top_indices = np.argsort(-scores)[:top_k]
        selected = [chunks[int(i)] for i in top_indices]
        context = "\n\n".join(selected)
        sources = [{"source": s3_key, "score": f"{float(scores[int(i)]):.4f}"} for i in top_indices]
        return context, sources
    except Exception:
        # Fallback: rank by simple keyword overlap; if tie, preserve order
        q_words = [w.lower() for w in question.split() if len(w) > 2]
        def score_chunk(c: str) -> int:
            lc = c.lower()
            return sum(lc.count(w) for w in q_words) or (1 if any(q_words) else 0)
        scored = [(score_chunk(c), idx, c) for idx, c in enumerate(chunks)]
        scored.sort(key=lambda x: (-x[0], x[1]))
        top_k = max(1, min(top_k, len(scored)))
        picked = scored[:top_k]
        selected = [c for _, _, c in picked]
        context = "\n\n".join(selected)
        sources = [{"source": s3_key, "score": str(s)} for s, _, _ in picked]
        return context, sources


def summarize_document(s3_key: str, max_sections: int = 6) -> str:
    """Summarize a document by selecting representative chunks and asking the LLM to summarize."""
    if s3_key.startswith("mock/"):
        text = (
            "This is a sample document used for development and testing. It mentions education, "
            "mathematics (Pythagorean theorem), science (photosynthesis), and New Delhi."
        )
    else:
        client = s3_client()
        try:
            obj = client.get_object(Bucket=S3_BUCKET, Key=s3_key)
            body: bytes = obj["Body"].read()
        except Exception as e:
            raise RuntimeError(f"Failed to fetch document from S3: {e}")

        text = load_object_bytes_to_text(s3_key, body)
    chunks = chunk_text(text)
    if not chunks:
        return ""

    # Pick the first N moderately sized chunks as a coarse summary basis
    selected = chunks[:max_sections]
    context = "\n\n".join(selected)

    prompt = (
        "You are an assistant that writes concise summaries. Read the context and write a clear,"
        " student-friendly summary (5-7 sentences), listing key topics and any important definitions."
    )
    try:
        summary = call_bedrock_rag("Summarize this document.", context=f"{prompt}\n\n{context}")
        return summary.strip()
    except Exception:
        # Fallback: return first chunk if LLM fails
        return selected[0][:500]


def s3_client():
    session = get_boto3_session()
    return session.client("s3", region_name=AWS_REGION, config=Config(signature_version="s3v4"))


def download_from_s3(bucket: str, prefix: str) -> List[Tuple[str, bytes]]:
    if not bucket:
        raise RuntimeError("S3_BUCKET env var is required")
    client = s3_client()
    paginator = client.get_paginator("list_objects_v2")
    pages = paginator.paginate(Bucket=bucket, Prefix=prefix)
    results: List[Tuple[str, bytes]] = []
    for page in pages:
        for obj in page.get("Contents", []) or []:
            key = obj["Key"]
            if key.endswith("/"):
                continue
            resp = client.get_object(Bucket=bucket, Key=key)
            body: bytes = resp["Body"].read()
            results.append((key, body))
    return results


def rebuild_index_from_s3() -> int:
    global faiss_index, docstore
    t0 = time.time()
    # Clean data dir
    if os.path.exists(DATA_DIR):
        shutil.rmtree(DATA_DIR)
    os.makedirs(DATA_DIR, exist_ok=True)

    logger.info("Downloading from S3 bucket=%s prefix=%s", S3_BUCKET, S3_PREFIX)
    objects = download_from_s3(S3_BUCKET, S3_PREFIX)
    logger.info("Downloaded %d objects", len(objects))

    all_chunks: List[str] = []
    docstore = []

    for key, bytes_data in objects:
        try:
            text = load_object_bytes_to_text(key, bytes_data)
        except Exception as e:
            logger.warning("Failed to parse %s: %s", key, e)
            continue
        chunks = chunk_text(text)
        for chunk in chunks:
            all_chunks.append(chunk)
            docstore.append({"chunk": chunk, "source": key})

    if not all_chunks:
        raise RuntimeError("No parsable content found in S3 objects")

    logger.info("Embedding %d chunks with Bedrock model %s", len(all_chunks), BEDROCK_EMBED_MODEL_ID)
    vectors = embed_texts(all_chunks)

    with index_lock:
        faiss_index = build_faiss_index(vectors)

    took = int((time.time() - t0) * 1000)
    logger.info("Index built with %d vectors in %d ms", len(all_chunks), took)
    return len(all_chunks)


def search_similar_chunks(query: str, k: int = 5) -> List[Tuple[float, Dict[str, str]]]:
    if faiss_index is None or not docstore:
        raise RuntimeError("Index is empty. Call /reload first or set S3 env vars correctly.")
    import numpy as np

    query_vec = embed_texts([query])[0]
    q = np.array([query_vec], dtype="float32")
    # Already normalized by embed_texts
    with index_lock:
        distances, indices = faiss_index.search(q, min(k, len(docstore)))  # type: ignore
    results: List[Tuple[float, Dict[str, str]]] = []
    for score, idx in zip(distances[0], indices[0]):
        if idx == -1:
            continue
        results.append((float(score), docstore[int(idx)]))
    return results


def call_bedrock_rag(question: str, context: str) -> str:
    """Generate an answer using AWS Bedrock text generation (Titan text)."""
    client = get_bedrock_runtime_client()

    system_instructions = (
        "You are a helpful assistant. Use only the provided context to answer. "
        "If the answer is not in the context, say you don't know."
    )
    prompt = (
        f"{system_instructions}\n\nContext:\n{context}\n\nQuestion: {question}\nAnswer concisely."
    )

    payload = {
        "inputText": prompt,
        "textGenerationConfig": {
            "maxTokenCount": 512,
            "temperature": 0.2,
            "topP": 0.9,
        },
    }
    try:
        resp = client.invoke_model(modelId=BEDROCK_CHAT_MODEL_ID, body=json.dumps(payload).encode("utf-8"))
        data = json.loads(resp["body"].read())
        # Titan text returns results list with outputText
        if isinstance(data, dict) and "results" in data and data["results"]:
            return data["results"][0].get("outputText", "")
        # Fallbacks for other providers if user overrides model ID
        if "content" in data and isinstance(data["content"], list):
            # Some models return content blocks
            parts = []
            for item in data["content"]:
                text = item.get("text") or item.get("content") or ""
                if text:
                    parts.append(text)
            if parts:
                return "\n".join(parts)
        return ""
    except Exception as e:
        logger.warning("Bedrock generation error: %s", e)
        return "Generation failed; returning top relevant context.\n\n" + context


# ------------------------------
# API Endpoints
# ------------------------------

@app.get("/health")
def health():
    status = "ready" if faiss_index is not None and len(docstore) > 0 else "not_ready"
    return {"status": status, "chunks": len(docstore)}


@app.post("/reload")
def reload_index():
    try:
        count = rebuild_index_from_s3()
        return {"ok": True, "chunks": count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/ask", response_model=AskResponse)
def ask(req: AskRequest):
    t0 = time.time()
    question = req.question.strip()
    if not question:
        raise HTTPException(status_code=400, detail="question is required")
    try:
        results = search_similar_chunks(question, k=max(1, req.top_k))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    # Build context
    context_parts: List[str] = []
    sources: List[Dict[str, str]] = []
    for score, item in results:
        context_parts.append(item["chunk"])
        sources.append({"source": item["source"], "score": f"{score:.4f}"})
    context = "\n\n".join(context_parts)

    answer = call_bedrock_rag(question, context)
    took_ms = int((time.time() - t0) * 1000)
    return AskResponse(answer=answer, sources=sources, took_ms=took_ms)


def _print_startup_banner() -> None:
    logger.info("RAG Service starting...")
    logger.info("AWS_REGION=%s S3_BUCKET=%s S3_PREFIX=%s", AWS_REGION, S3_BUCKET, S3_PREFIX)
    logger.info("DATA_DIR=%s INDEX_DIR=%s", DATA_DIR, INDEX_DIR)
    logger.info("BEDROCK_EMBED_MODEL_ID=%s", BEDROCK_EMBED_MODEL_ID)
    logger.info("BEDROCK_CHAT_MODEL_ID=%s", BEDROCK_CHAT_MODEL_ID)
    env_file_used = os.getenv("ENV_FILE", ".env")
    if os.path.exists(env_file_used):
        logger.info("Loaded environment from %s", env_file_used)


if __name__ == "__main__":
    _print_startup_banner()
    # Do not auto-load on start to avoid slowing startup; user can call /reload
    import uvicorn  # type: ignore

    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", "8000")))


