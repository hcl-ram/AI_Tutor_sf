# api_routes.py - Clean version with LLM-based study plan generation
import os
import json
import re
import uuid
import boto3
from numpy import append
import bcrypt
from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from jose import jwt, JWTError
from datetime import datetime, timedelta
from typing import Literal, List
from dotenv import load_dotenv
from study_plan_service import generate_study_plan_with_bedrock

load_dotenv()

# Authentication configuration
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret-change-me")
JWT_ALG = os.getenv("JWT_ALG", "HS256")
JWT_EXPIRE_MIN = int(os.getenv("JWT_EXPIRE_MIN", "60"))

# DynamoDB setup
session = boto3.Session(region_name=AWS_REGION)
dynamodb = session.resource("dynamodb", region_name=AWS_REGION)
students_table = dynamodb.Table("Students")
teachers_table = dynamodb.Table("Teachers")

app = FastAPI(title="AI Tutor API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security
security = HTTPBearer()

# Pydantic models
class StudyPlanRequest(BaseModel):
    plan_name: str
    grade_level: str
    subject: str
    topics: list
    exam_date: str
    start_time: str
    end_time: str
    preferred_time: str
    study_intensity: str
    session_duration: str
    use_google_calendar: bool = False

class SignupRequest(BaseModel):
    name: str
    email: EmailStr
    password: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

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

class AnswerWithContextRequest(BaseModel):
    question: str
    context: str

class LLMAnswerRequest(BaseModel):
    question: str
    attachment_path: str | None = None

class SupportAskRequest(BaseModel):
    question: str
    subject: str | None = None
    topic: str | None = None

class FlashcardsRequest(BaseModel):
    subject: str
    topic: str
    num_cards: int = 6

class BedrockAskRequest(BaseModel):
    question: str

# Other existing models would go here...

def get_bedrock_runtime_client():
    """Get Bedrock runtime client."""
    return boto3.client(
        service_name="bedrock-runtime",
        region_name=os.getenv("AWS_REGION", "us-east-1"),
        aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
        aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY")
    )

# Authentication helper functions
def generate_token(sub: str, role: Literal["student", "teacher"], name: str, user_id: str) -> str:
    exp = datetime.utcnow() + timedelta(minutes=JWT_EXPIRE_MIN)
    payload = {"sub": sub, "role": role, "name": name, "uid": user_id, "exp": exp}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)

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

# Authentication dependency
def require_auth(creds: HTTPAuthorizationCredentials = Depends(security)):
    token = creds.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return payload

@app.post("/tutor/generate-study-plan")
def generate_study_plan(req: StudyPlanRequest):
    """Generate a personalized study plan using AWS Bedrock LLM based on student requirements."""
    try:
        # Calculate days until exam
        try:
            exam_dt = datetime.strptime(req.exam_date, "%Y-%m-%d")
            days_until = (exam_dt - datetime.now()).days
        except:
            days_until = 7  # fallback

        print("🤖 Generating personalized study plan using AWS Bedrock LLM")
        
        # Convert Pydantic model to dictionary for the service
        study_plan_request = {
            "plan_name": req.plan_name,
            "grade_level": req.grade_level,
            "subject": req.subject,
            "topics": req.topics,
            "exam_date": req.exam_date,
            "start_time": req.start_time,
            "end_time": req.end_time,
            "preferred_time": req.preferred_time,
            "study_intensity": req.study_intensity,
            "session_duration": req.session_duration,
            "use_google_calendar": req.use_google_calendar
        }
        
        return generate_study_plan_with_bedrock(study_plan_request, days_until)

    except Exception as e:
        print(f"❌ Error generating study plan: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate study plan: {str(e)}")

# Authentication endpoints
@app.post("/auth/student/signup")
def student_signup(req: SignupRequest):
    if email_exists(students_table, req.email):
        raise HTTPException(status_code=409, detail="Email already exists")
    user = put_user(students_table, req.name, req.email, req.password, "student")
    token = generate_token(req.email, "student", req.name, user["id"]) 
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
    token = generate_token(req.email, "teacher", req.name, user["id"]) 
    return {"ok": True, "token": token, "user": {"id": user["id"], "name": user["name"], "email": user["email"], "role": "teacher"}}

@app.post("/auth/teacher/login")
def teacher_login(req: LoginRequest):
    user = verify_user(teachers_table, req.email, req.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = generate_token(user["email"], "teacher", user.get("name", ""), user.get("id", ""))
    return {"ok": True, "token": token, "user": {"id": user.get("id", ""), "name": user.get("name", ""), "email": user["email"], "role": "teacher"}}

# Quiz endpoints
@app.post("/quiz/generate")
def quiz_generate(req: QuizRequest, user=Depends(require_auth)):
    # Import quiz generator
    from quiz_generator import generate_quiz
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
    # Import recommendation engine
    from recommendation_engine import generate_recommendations
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

# Teacher endpoints
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

# Tutor endpoints
@app.post("/tutor/rag-answer")
def tutor_rag_answer(req: TutorRAGRequest):
    # Import RAG service
    from rag_service import build_context_from_document, call_bedrock_rag
    # Build context from the referenced document
    try:
        context, sources = build_context_from_document(req.question, req.s3_key, top_k=5)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to build context: {e}")

    if not context:
        # Fallback 1: try to summarize document and use as context
        try:
            from rag_service import summarize_document
            summary_ctx = summarize_document(req.s3_key)
        except Exception:
            summary_ctx = ""
        # Fallback 2: call LLM with whatever minimal context we have
        answer = generate_answer_with_context(req.question, summary_ctx or "")
        return {"answer": answer, "sources": []}

    # Use Bedrock via rag_service to handle model families
    answer = call_bedrock_rag(req.question, context)
    return {"answer": answer, "sources": sources}

@app.post("/tutor/doc-summary")
def tutor_doc_summary(req: DocSummaryRequest):
    try:
        from rag_service import summarize_document
        summary = summarize_document(req.s3_key)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to summarize: {e}")
    return {"summary": summary}

@app.post("/tutor/answer-with-context")
def tutor_answer_with_context(req: AnswerWithContextRequest):
    from rag_service import call_bedrock_rag
    answer = call_bedrock_rag(req.question, req.context or "")
    return {"answer": answer, "sources": []}

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

    try:
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
                "textGenerationConfig": {"maxTokenCount": 1024, "temperature": 0.3, "topP": 0.9},
            }

        resp = client.invoke_model(
            modelId=model_id,
            body=json.dumps(payload).encode("utf-8"),
            contentType="application/json",
            accept="application/json",
        )
        data = json.loads(resp["body"].read())

        # Parse response based on model family
        if family == "anthropic":
            if "content" in data and isinstance(data["content"], list) and data["content"]:
                raw_text = "\n".join([part.get("text") or part.get("content") or "" for part in data["content"]])
            else:
                raw_text = data.get("completion", "")
        else:
            if isinstance(data, dict) and "results" in data and data["results"]:
                raw_text = data["results"][0].get("outputText", "")
            else:
                raw_text = ""

        # Try to parse as JSON first
        try:
            cards = json.loads(raw_text)
            if not isinstance(cards, list):
                raise ValueError("Not a list")
        except:
            # Fallback: parse line by line
            lines = [line.strip() for line in raw_text.split("\n") if line.strip()]
            cards = []
            for line in lines:
                if ":" in line:
                    parts = line.split(":", 1)
                    if len(parts) == 2:
                        cards.append({"front": parts[0].strip(), "back": parts[1].strip()})
                elif "?" in line:
                    chunks = line.split("?", 1)
                    if len(chunks) == 2:
                        cards.append({"front": chunks[0].strip() + "?", "back": chunks[1].strip()})

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

@app.post("/tutor/bedrock-answer")
def tutor_bedrock_answer(req: BedrockAskRequest):
    """Very simple endpoint that calls Bedrock LLM with the question only."""
    question = (req.question or "").strip()
    if not question:
        raise HTTPException(status_code=400, detail="question is required")

    # Load model ID and create Bedrock client
    model_id = os.getenv("BEDROCK_MODEL_ID")
    if not model_id:
        raise HTTPException(status_code=500, detail="BEDROCK_MODEL_ID not set")
    client = get_bedrock_runtime_client()

    # Minimal single prompt
    prompt = f"Answer clearly and concisely:\n\nUser: {question}\nAssistant:"

    payload = {
        "anthropic_version": "bedrock-2023-05-31",
        "messages": [{"role": "user", "content": [{"type": "text", "text": prompt}]}],
        "max_tokens": 300,
        "temperature": 0.5,
    }

    try:
        response = client.invoke_model(
            modelId=model_id,
            body=json.dumps(payload),
            contentType="application/json",
            accept="application/json",
        )

        data = json.loads(response["body"].read())
        # Works for Claude-3/Claude-3.5 — just grab text
        answer = ""
        if isinstance(data, dict):
            parts = data.get("content") or []
            if parts and isinstance(parts, list):
                answer = "".join(p.get("text", "") for p in parts)
            else:
                answer = data.get("completion", "")
        return {"answer": answer or "No response received."}

    except Exception as e:
        return {"answer": f"Error calling Bedrock: {str(e)}"}

# Support endpoint
@app.post("/support/ask")
def support_ask(req: SupportAskRequest):
    """Lightweight endpoint that proxies a user question to the Bedrock chat model."""
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
                        "content": [{"type": "text", "text": prompt}]
                    }
                ],
                "max_tokens": 512,
                "temperature": 0.4,
            }
        else:
            payload = {
                "prompt": f"\n\nHuman: {prompt}\n\nAssistant:",
                "max_tokens_to_sample": 512,
                "temperature": 0.4,
                "stop_sequences": ["\n\nHuman:"],
            }
    else:
        payload = {
            "inputText": prompt,
            "textGenerationConfig": {"maxTokenCount": 512, "temperature": 0.4, "topP": 0.9},
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
                answer = "\n".join([part.get("text") or part.get("content") or "" for part in data["content"]])
            else:
                answer = data.get("completion", "")
        else:
            if isinstance(data, dict) and "results" in data and data["results"]:
                answer = data["results"][0].get("outputText", "")
            else:
                answer = ""
        return {"answer": answer}
    except Exception as e:
        return {"answer": "I'm sorry, I couldn't process your question right now. Please try again."}

# Health check endpoint
@app.get("/health")
def health_check():
    return {"status": "healthy", "message": "AI Tutor API is running"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)
