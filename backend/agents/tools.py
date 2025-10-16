from __future__ import annotations

from typing import Any, Dict, List

from .base import tool
from study_plan_service import generate_study_plan_with_bedrock
from rag_service import build_context_from_document, call_bedrock_rag, summarize_document


@tool
def generate_study_plan(req: Dict[str, Any]) -> Dict[str, Any]:
    """Generate a personalized study plan using Bedrock."""
    # Compute days_until if not provided
    from datetime import datetime

    days_until = req.get("days_until")
    if days_until is None:
        try:
            exam_dt = datetime.strptime(req.get("exam_date", ""), "%Y-%m-%d")
            days_until = (exam_dt - datetime.now()).days
        except Exception:
            days_until = 7
    return generate_study_plan_with_bedrock(req, days_until)


@tool
def rag_answer(question: str, s3_key: str, top_k: int = 5) -> Dict[str, Any]:
    """Answer a question from a document using RAG."""
    context, sources = build_context_from_document(question, s3_key, top_k=top_k)
    if not context:
        # Try summary-based fallback
        try:
            summary = summarize_document(s3_key)
        except Exception:
            summary = ""
        answer = call_bedrock_rag(question, summary or "")
        return {"answer": answer, "sources": []}
    answer = call_bedrock_rag(question, context)
    return {"answer": answer, "sources": sources}


@tool
def doc_summary(s3_key: str) -> Dict[str, str]:
    """Summarize an S3-hosted document."""
    return {"summary": summarize_document(s3_key)}


@tool
def answer_with_context(question: str, context: str) -> Dict[str, str]:
    """Answer using provided context only."""
    answer = call_bedrock_rag(question, context or "")
    return {"answer": answer}



