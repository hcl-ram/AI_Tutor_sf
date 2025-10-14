# api_routes.py - Clean version with LLM-based study plan generation
import os
import json
import re
import boto3
import bcrypt
from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from jose import jwt, JWTError
from datetime import datetime, timedelta
from dotenv import load_dotenv
from study_plan_service import generate_study_plan_with_bedrock

load_dotenv()

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

# Other existing models would go here...

def get_bedrock_runtime_client():
    """Get Bedrock runtime client."""
    return boto3.client(
        service_name="bedrock-runtime",
        region_name=os.getenv("AWS_REGION", "us-east-1"),
        aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
        aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY")
    )

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




# Health check endpoint
@app.get("/health")
def health_check():
    return {"status": "healthy", "message": "AI Tutor API is running"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)
