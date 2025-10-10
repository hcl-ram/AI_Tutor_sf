import os
import uuid
from datetime import datetime, timedelta
from typing import List, Literal

import bcrypt
import boto3
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from jose import jwt

from quiz_generator import generate_quiz
from recommendation_engine import generate_recommendations
from ai_tutor import generate_answer_with_context
from rag_service import build_context_from_document, summarize_document


JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret-change-me")
JWT_ALG = os.getenv("JWT_ALG", "HS256")
JWT_EXPIRE_MIN = int(os.getenv("JWT_EXPIRE_MIN", "60"))
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
        # Still call model with an empty context to return a safe message
        answer = generate_answer_with_context(req.question, "")
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



