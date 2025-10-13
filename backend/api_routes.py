import os
import json
import uuid
from datetime import datetime, timedelta
from typing import List, Literal

import bcrypt
import boto3
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from jose import jwt
try:
    from dotenv import load_dotenv as _load_dotenv
except Exception:
    _load_dotenv = None  # type: ignore

from quiz_generator import generate_quiz
from recommendation_engine import generate_recommendations
from ai_tutor import generate_answer_with_context, process_user_query
from s3_handler import upload_bytes_to_s3
from dynamo_handler import get_chat_history
from rag_service import build_context_from_document, summarize_document, get_bedrock_runtime_client


JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret-change-me")
JWT_ALG = os.getenv("JWT_ALG", "HS256")
JWT_EXPIRE_MIN = int(os.getenv("JWT_EXPIRE_MIN", "60"))
if _load_dotenv is not None:
    _load_dotenv(os.getenv("ENV_FILE", ".env"))

AWS_REGION = os.getenv("AWS_REGION", "us-east-1")


app = FastAPI(title="Unified API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

auth_scheme = HTTPBearer(auto_error=True)


def require_auth(creds: HTTPAuthorizationCredentials = Depends(auth_scheme)):
    token = creds.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return payload


class QuizRequest(BaseModel):
    class_level: str
    subject: str
    topic: str
    difficulty: str
    num_questions: int = 5


class RecommendationItem(BaseModel):
    question: str
    options: List[str]
    correct_index: int
    selected_index: int | None = None
    explanation: str | None = None
    student_explanation: str | None = None


class RecommendationsRequest(BaseModel):
    subject: str
    topic: str
    class_level: str | None = None
    difficulty: str | None = None
    results: List[RecommendationItem]


class TutorRAGRequest(BaseModel):
    question: str
    s3_key: str


class DocSummaryRequest(BaseModel):
    s3_key: str


# =========================
# Auth Models & Utilities
# =========================

class SignupRequest(BaseModel):
    name: str
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


def generate_token(sub: str, role: Literal["student", "teacher"], name: str, user_id: str) -> str:
    exp = datetime.utcnow() + timedelta(minutes=JWT_EXPIRE_MIN)
    payload = {"sub": sub, "role": role, "name": name, "uid": user_id, "exp": exp}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


# DynamoDB setup
session = boto3.Session(region_name=AWS_REGION)
dynamodb = session.resource("dynamodb", region_name=AWS_REGION)
students_table = dynamodb.Table("Students")
teachers_table = dynamodb.Table("Teachers")


def email_exists(table, email: str) -> bool:
    resp = table.get_item(Key={"email": email})
    return "Item" in resp


def put_user(table, name: str, email: str, password: str, role: str):
    user_id = str(uuid.uuid4())
    password_hash = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    item = {
        "email": email,
        "name": name,
        "password": password_hash,
        "created_at": datetime.utcnow().isoformat(),
        "id": user_id,
        "role": role,
    }
    table.put_item(Item=item)
    return item


def verify_user(table, email: str, password: str):
    resp = table.get_item(Key={"email": email})
    user = resp.get("Item")
    if not user:
        return None
    if not bcrypt.checkpw(password.encode("utf-8"), user.get("password", "").encode("utf-8")):
        return None
    return user


@app.get("/health")
def health():
    return {"ok": True, "ts": datetime.utcnow().isoformat()}


@app.post("/quiz/generate")
def quiz_generate(req: QuizRequest, user=Depends(require_auth)):
    questions = generate_quiz(
        class_level=req.class_level,
        subject=req.subject,
        topic=req.topic,
        difficulty=req.difficulty,
        num_questions=req.num_questions,
    )
    return {"questions": questions}


@app.post("/quiz/recommendations")
def quiz_recommendations(req: RecommendationsRequest, user=Depends(require_auth)):
    # Convert pydantic models to simple dicts for the engine
    result_dicts = [
        {
            "question": r.question,
            "options": r.options,
            "correct_index": r.correct_index,
            "selected_index": r.selected_index,
            "explanation": r.explanation or "",
            "student_explanation": r.student_explanation or "",
        }
        for r in req.results
    ]
    recs = generate_recommendations(
        result_dicts,
        subject=req.subject,
        topic=req.topic,
        class_level=req.class_level,
        difficulty=req.difficulty,
    )
    return {"recommendations": recs}


@app.post("/tutor/rag-answer")
def tutor_rag_answer(req: TutorRAGRequest, user=Depends(require_auth)):
    # Build context from the referenced document
    try:
        context, sources = build_context_from_document(req.question, req.s3_key, top_k=5)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to build context: {e}")

    if not context:
        # Fallback 1: try to summarize document and use as context
        try:
            summary_ctx = summarize_document(req.s3_key)
        except Exception:
            summary_ctx = ""
        # Fallback 2: call LLM with whatever minimal context we have
        answer = generate_answer_with_context(req.question, summary_ctx or "")
        return {"answer": answer, "sources": []}

    answer = generate_answer_with_context(req.question, context)
    return {"answer": answer, "sources": sources}


@app.post("/tutor/doc-summary")
def tutor_doc_summary(req: DocSummaryRequest, user=Depends(require_auth)):
    try:
        summary = summarize_document(req.s3_key)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to summarize: {e}")
    return {"summary": summary}


# Fallback endpoint: directly generate answer from provided raw context (frontend may pass summary)
class AnswerWithContextRequest(BaseModel):
    question: str
    context: str


@app.post("/tutor/answer-with-context")
def tutor_answer_with_context(req: AnswerWithContextRequest, user=Depends(require_auth)):
    answer = generate_answer_with_context(req.question, req.context or "")
    return {"answer": answer, "sources": []}


# Pure LLM answer endpoint: bypass RAG and answer directly
class LLMAnswerRequest(BaseModel):
    question: str
    attachment_path: str | None = None


@app.post("/tutor/llm-answer")
def tutor_llm_answer(req: LLMAnswerRequest, user=Depends(require_auth)):
    user_id = user.get("uid") or user.get("sub") or "anonymous"
    answer = process_user_query(user_id=user_id, user_message=req.question, attachment_path=req.attachment_path)
    return {"answer": answer}


# =========================
# Support Chat (Help & Support)
# =========================

class SupportAskRequest(BaseModel):
    question: str
    subject: str | None = None
    topic: str | None = None


@app.post("/support/ask")
def support_ask(req: SupportAskRequest):
    """Lightweight endpoint that proxies a user question to the Bedrock chat model.

    This endpoint is deliberately unauthenticated so the floating help widget can work
    on all pages. Harden/rate-limit as needed in production.
    """
    question = (req.question or "").strip()
    if not question:
        raise HTTPException(status_code=400, detail="question is required")

    client = get_bedrock_runtime_client()

    # Resolve model id strictly from BEDROCK_MODEL_ID and derive family
    model_id = os.getenv("BEDROCK_MODEL_ID", "").strip()
    if not model_id:
        raise HTTPException(status_code=500, detail="BEDROCK_MODEL_ID is not set in environment.")

    system_instructions = (
        "You are a concise and friendly product support assistant for an AI learning app. "
        "Answer clearly in 2-5 sentences. If asked about account-specific data, respond that "
        "you cannot access private data here and provide general guidance."
    )
    context_prefix = ""
    if req.subject:
        context_prefix += f"Subject: {req.subject}\n"
    if req.topic:
        context_prefix += f"Topic: {req.topic}\n"
    prompt = f"{system_instructions}\n\n{context_prefix}User question: {question}\nAssistant:"

    # Build payload depending on the model family
    family = (model_id.split(".")[0].lower() if "." in model_id else model_id.lower())
    payload = {}
    if family == "anthropic":
        # Distinguish Claude 3/3.5 (messages API) vs Claude v1/v2 (prompt API)
        if "claude-3" in model_id or "claude-3-5" in model_id:
            payload = {
                "anthropic_version": "bedrock-2023-05-31",
                "messages": [
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": prompt}
                        ],
                    }
                ],
                "max_tokens": 512,
                "temperature": 0.3,
            }
        else:
            # Claude v2 style
            payload = {
                "prompt": f"\n\nHuman: {prompt}\n\nAssistant:",
                "max_tokens_to_sample": 512,
                "temperature": 0.3,
                "stop_sequences": ["\n\nHuman:"],
            }
    elif model_id.startswith("amazon.titan-text"):
        payload = {
            "inputText": prompt,
            "textGenerationConfig": {
                "maxTokenCount": 512,
                "temperature": 0.3,
                "topP": 0.9,
            },
        }
    else:
        # Sensible default: try Titan schema
        payload = {
            "inputText": prompt,
            "textGenerationConfig": {
                "maxTokenCount": 512,
                "temperature": 0.3,
                "topP": 0.9,
            },
        }
    try:
        resp = client.invoke_model(
            modelId=model_id,
            body=json.dumps(payload).encode("utf-8"),
            contentType="application/json",
            accept="application/json",
        )
        data = json.loads(resp["body"].read())
        answer = ""
        if family == "anthropic":
            if "content" in data and isinstance(data["content"], list) and data["content"]:
                # Claude 3 style
                # content: [ {"type":"text","text":"..."}, ... ]
                parts = []
                for part in data["content"]:
                    text = part.get("text") or part.get("content") or ""
                    if text:
                        parts.append(text)
                answer = "\n".join(parts)
            elif "completion" in data:
                # Claude v2 style
                answer = data.get("completion", "")
        else:
            if isinstance(data, dict) and "results" in data and data["results"]:
                answer = data["results"][0].get("outputText", "")
            elif "content" in data and isinstance(data["content"], list):
                parts = []
                for item in data["content"]:
                    text = item.get("text") or item.get("content") or ""
                    if text:
                        parts.append(text)
                answer = "\n".join(parts)
        return {"answer": answer or "Sorry, I couldn't generate a response right now."}
    except Exception as e:
        # Surface detailed error for easier debugging in frontend
        raise HTTPException(status_code=500, detail=f"Bedrock error: {e}")


# =========================
# Flashcards Generation
# =========================

class FlashcardsRequest(BaseModel):
    subject: str
    topic: str
    num_cards: int = 6


@app.post("/tutor/flashcards")
def tutor_flashcards(req: FlashcardsRequest):
    subject = (req.subject or "").strip()
    topic = (req.topic or "").strip()
    if not subject or not topic:
        raise HTTPException(status_code=400, detail="subject and topic are required")

    client = get_bedrock_runtime_client()
    model_id = os.getenv("BEDROCK_MODEL_ID", "").strip()
    if not model_id:
        raise HTTPException(status_code=500, detail="BEDROCK_MODEL_ID is not set in environment.")

    family = (model_id.split(".")[0].lower() if "." in model_id else model_id.lower())
    system = (
        "You generate concise educational flashcards as JSON. Each card has 'front' and 'back'. "
        "Front is a question or term; back is a clear, student-friendly answer."
    )
    instruction = (
        f"Create {max(2, min(20, req.num_cards))} flashcards for Subject: {subject}, Topic: {topic}. "
        "Return ONLY valid JSON array like: [{\"front\":\"...\",\"back\":\"...\"}]."
    )
    prompt = f"{system}\n\n{instruction}"

    if family == "anthropic":
        if "claude-3" in model_id or "claude-3-5" in model_id:
            payload = {
                "anthropic_version": "bedrock-2023-05-31",
                "messages": [
                    {"role": "user", "content": [{"type": "text", "text": prompt}]}
                ],
                "max_tokens": 1024,
                "temperature": 0.3,
            }
        else:
            payload = {
                "prompt": f"\n\nHuman: {prompt}\n\nAssistant:",
                "max_tokens_to_sample": 1024,
                "temperature": 0.3,
                "stop_sequences": ["\n\nHuman:"],
            }
    else:
        payload = {
            "inputText": prompt,
            "textGenerationConfig": {
                "maxTokenCount": 1024,
                "temperature": 0.3,
                "topP": 0.9,
            },
        }

    try:
        resp = client.invoke_model(
            modelId=model_id,
            body=json.dumps(payload).encode("utf-8"),
            contentType="application/json",
            accept="application/json",
        )
        data = json.loads(resp["body"].read())
        if family == "anthropic":
            if "content" in data and isinstance(data["content"], list) and data["content"]:
                text = "\n".join([part.get("text") or part.get("content") or "" for part in data["content"]])
            else:
                text = data.get("completion", "")
        else:
            if isinstance(data, dict) and "results" in data and data["results"]:
                text = data["results"][0].get("outputText", "")
            else:
                text = ""

        cards = []
        try:
            parsed = json.loads(text)
            if isinstance(parsed, list):
                for it in parsed:
                    front = (it.get("front") or "").strip()
                    back = (it.get("back") or "").strip()
                    if front and back:
                        cards.append({"front": front, "back": back})
        except Exception:
            pass

        if not cards:
            # Fallback: naive split by double newline
            parts = [p.strip() for p in text.split("\n\n") if p.strip()]
            for part in parts[:req.num_cards]:
                chunks = part.split("\n", 1)
                if len(chunks) == 2:
                    cards.append({"front": chunks[0].strip(), "back": chunks[1].strip()})

        if not cards:
            raise RuntimeError("LLM did not return flashcards")

        return {"flashcards": cards[: req.num_cards]}
    except HTTPException:
        raise
    except Exception as e:
        # Fallback to simple locally generated flashcards so the UI still works
        fallback = [
            {"front": f"Key concept in {topic}?", "back": f"A fundamental idea from {subject} - {topic}."},
            {"front": f"Define {topic}", "back": f"Brief definition of {topic} in {subject}."},
            {"front": f"Example problem in {topic}", "back": f"A short example related to {topic}."},
            {"front": f"Common mistake in {topic}", "back": f"A typical error learners make in {topic}."},
            {"front": f"Tip for {topic}", "back": f"A practical tip to remember for {topic}."},
            {"front": f"Why {topic} matters", "back": f"Where {topic} is used in real life."},
        ][: req.num_cards]
        return {"flashcards": fallback, "warning": f"Bedrock error: {e}"}

@app.post("/tutor/upload")
async def tutor_upload(file: UploadFile = File(...), user=Depends(require_auth)):
    user_id = user.get("uid") or user.get("sub") or "anonymous"
    try:
        file_bytes = await file.read()
        s3_key = upload_bytes_to_s3(file_bytes, user_id=user_id, file_name=file.filename)
        if not s3_key:
            raise HTTPException(status_code=500, detail="S3 upload failed")
        return {"ok": True, "s3Key": s3_key, "fileName": file.filename, "pageCount": 0}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/tutor/chat-history")
def tutor_chat_history(user=Depends(require_auth)):
    user_id = user.get("uid") or user.get("sub") or "anonymous"
    try:
        items = get_chat_history(user_id)
        return {"history": items}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# =========================
# Auth Routes (/auth/*)
# =========================

@app.post("/auth/student/signup")
def student_signup(req: SignupRequest):
    if email_exists(students_table, req.email):
        raise HTTPException(status_code=409, detail="Email already exists")
    user = put_user(students_table, req.name, req.email, req.password, "student")
    token = generate_token(req.email, "student", req.name, user["id"]) \
        if JWT_SECRET else ""
    return {"ok": True, "token": token, "user": {"id": user["id"], "name": user["name"], "email": user["email"], "role": "student"}}


@app.post("/auth/student/login")
def student_login(req: LoginRequest):
    user = verify_user(students_table, req.email, req.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = generate_token(user["email"], "student", user.get("name", ""), user.get("id", ""))
    return {"ok": True, "token": token, "user": {"id": user.get("id", ""), "name": user.get("name", ""), "email": user["email"], "role": "student"}}


@app.post("/auth/teacher/signup")
def teacher_signup(req: SignupRequest):
    if email_exists(teachers_table, req.email):
        raise HTTPException(status_code=409, detail="Email already exists")
    user = put_user(teachers_table, req.name, req.email, req.password, "teacher")
    token = generate_token(req.email, "teacher", req.name, user["id"]) \
        if JWT_SECRET else ""
    return {"ok": True, "token": token, "user": {"id": user["id"], "name": user["name"], "email": user["email"], "role": "teacher"}}


@app.post("/auth/teacher/login")
def teacher_login(req: LoginRequest):
    user = verify_user(teachers_table, req.email, req.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = generate_token(user["email"], "teacher", user.get("name", ""), user.get("id", ""))
    return {"ok": True, "token": token, "user": {"id": user.get("id", ""), "name": user.get("name", ""), "email": user["email"], "role": "teacher"}}


# =========================
# Teacher Dashboard Data
# =========================

@app.get("/teacher/students")
def get_teacher_students(user=Depends(require_auth)):
    if user.get("role") != "teacher":
        raise HTTPException(status_code=403, detail="Forbidden")
    # Minimal sample payload to replace frontend mocks; integrate DB later
    return {
        "students": [
            {"id": 1, "name": "Rahul Sharma", "progress": 78, "lastActive": "2 hours ago", "score": 85},
            {"id": 2, "name": "Priya Patel", "progress": 92, "lastActive": "30 minutes ago", "score": 94},
            {"id": 3, "name": "Amit Kumar", "progress": 65, "lastActive": "1 day ago", "score": 72},
            {"id": 4, "name": "Sneha Reddy", "progress": 88, "lastActive": "5 hours ago", "score": 89},
        ]
    }


@app.get("/teacher/heatmap")
def get_teacher_heatmap(user=Depends(require_auth)):
    if user.get("role") != "teacher":
        raise HTTPException(status_code=403, detail="Forbidden")
    return {
        "heatmap": [
            {"topic": "Algebra", "mastery": 85},
            {"topic": "Geometry", "mastery": 62},
            {"topic": "Trigonometry", "mastery": 74},
            {"topic": "Calculus", "mastery": 58},
            {"topic": "Statistics", "mastery": 81},
            {"topic": "Arithmetic", "mastery": 92},
        ]
    }


@app.get("/teacher/interventions")
def get_teacher_interventions(user=Depends(require_auth)):
    if user.get("role") != "teacher":
        raise HTTPException(status_code=403, detail="Forbidden")
    return {
        "interventions": [
            {"id": 1, "title": "Focus on Calculus Fundamentals", "description": "3 students struggling with derivatives. Suggest review session.", "priority": "high", "students": ["Amit Kumar", "Rohit Singh", "Neha Gupta"]},
            {"id": 2, "title": "Geometry Practice Needed", "description": "Multiple students showing weakness in geometry concepts.", "priority": "medium", "students": ["Rahul Sharma", "Sneha Reddy"]},
            {"id": 3, "title": "Advanced Algebra Challenge", "description": "Top performers ready for advanced problems.", "priority": "low", "students": ["Priya Patel", "Arjun Mehta"]},
        ]
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", "8002")))



