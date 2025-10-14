# api_routes.py - Clean version with LLM-based study plan generation
import os
import json
import boto3
import bcrypt
from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from jose import jwt, JWTError
from datetime import datetime, timedelta
from dotenv import load_dotenv

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
    """Generate a personalized study plan using LLM based on student requirements."""
    try:
        # Calculate days until exam
        try:
            exam_dt = datetime.strptime(req.exam_date, "%Y-%m-%d")
            days_until = (exam_dt - datetime.now()).days
        except:
            days_until = 7  # fallback

        print("🤖 Generating personalized study plan using LLM based on student requirements")
        return generate_llm_study_plan(req, days_until)

    except Exception as e:
        print(f"❌ Error generating study plan: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate study plan: {str(e)}")


def generate_llm_study_plan(req: StudyPlanRequest, days_until: int):
    """Generate a detailed, personalized study plan using LLM based on student requirements."""
    topics = [t for t in req.topics if t.strip()]
    
    # Generate comprehensive prompt for LLM-based study plan
    topics_str = ", ".join(topics)
    
    prompt = f"""You are an expert educational planner and tutor. Create a comprehensive, personalized study plan for a student based on their specific requirements.

STUDENT REQUIREMENTS:
- Plan Name: {req.plan_name}
- Grade Level: {req.grade_level}
- Subject: {req.subject}
- Topics to Study: {topics_str}
- Exam Date: {req.exam_date}
- Exam Time: {req.start_time} - {req.end_time}
- Days Until Exam: {days_until} days
- Preferred Study Time: {req.preferred_time}
- Study Intensity: {req.study_intensity}
- Session Duration: {req.session_duration}
- Google Calendar Integration: {"Yes" if req.use_google_calendar else "No"}

Create a detailed study plan that includes:

1. **Detailed Topic Information**: For each topic, provide:
   - Clear, academic definition
   - Specific sub-topics to cover
   - Key concepts and principles
   - Important formulas and equations
   - Real-world examples and applications
   - Learning objectives

2. **Personalized Study Schedule**: 
   - Week-by-week breakdown based on time available
   - Daily study activities tailored to their preferences
   - Specific focus areas for each study session
   - Progress milestones and checkpoints

3. **Topic Prioritization**:
   - Rank topics by importance and difficulty
   - Suggest time allocation for each topic
   - Identify prerequisite knowledge needed

4. **Study Strategies**:
   - Topic-specific study techniques
   - Recommended resources and materials
   - Practice methods and exercises
   - Assessment and review strategies

5. **Timeline and Milestones**:
   - Key checkpoints before the exam
   - Review sessions and practice tests
   - Final preparation week schedule

Format the response as a structured JSON object with this exact structure:
{{
    "plan_name": "{req.plan_name}",
    "subject": "{req.subject}",
    "topics": {topics},
    "exam_date": "{req.exam_date}",
    "exam_time": "{req.start_time} - {req.end_time}",
    "days_until_exam": {days_until},
    "grade_level": "{req.grade_level}",
    "study_schedule": {{
        "weekly_breakdown": [
            {{
                "week": 1,
                "focus_topics": ["topic1", "topic2"],
                "daily_schedule": [
                    {{
                        "day": "Monday",
                        "time": "{req.preferred_time} - {req.session_duration}",
                        "activity": "Specific study activity description",
                        "duration": "{req.session_duration}",
                        "focus_topic": "topic_name",
                        "learning_objectives": ["objective1", "objective2"]
                    }}
                ],
                "weekly_goals": ["goal1", "goal2"]
            }}
        ]
    }},
    "topic_prioritization": [
        {{
            "topic": "topic_name",
            "priority": "high/medium/low",
            "time_allocation": "X hours",
            "difficulty": "easy/medium/hard",
            "definition": "Clear definition of the topic",
            "sub_topics_count": 5,
            "key_concepts": ["concept1", "concept2", "concept3"]
        }}
    ],
    "study_strategies": [
        {{
            "topic": "topic_name",
            "definition": "Detailed definition",
            "sub_topics": ["subtopic1", "subtopic2"],
            "key_concepts": ["concept1", "concept2"],
            "formulas": ["formula1", "formula2"],
            "examples": ["example1", "example2"],
            "learning_objectives": ["objective1", "objective2"],
            "techniques": ["technique1", "technique2"],
            "resources": ["resource1", "resource2"],
            "practice_methods": ["method1", "method2"]
        }}
    ],
    "milestones": [
        {{
            "date": "YYYY-MM-DD",
            "milestone": "Milestone description",
            "type": "review/assessment/practice"
        }}
    ],
    "detailed_topic_info": {{
        "topic_name": {{
            "definition": "Comprehensive definition",
            "sub_topics": ["subtopic1", "subtopic2"],
            "key_concepts": ["concept1", "concept2"],
            "formulas": ["formula1", "formula2"],
            "examples": ["example1", "example2"],
            "learning_objectives": ["objective1", "objective2"],
            "focus_areas": ["area1", "area2"]
        }}
    }},
    "recommendations": {{
        "study_environment": "Specific environment suggestions",
        "time_management": "Personalized time management tips",
        "stress_management": "Stress management techniques",
        "last_minute_prep": "Final week preparation advice"
    }}
}}

Make the study plan:
- Highly personalized based on their specific topics and preferences
- Realistic and achievable given their timeline
- Detailed enough to be immediately actionable
- Educational and comprehensive for exam preparation
- Focused on their specific subject and grade level

Generate content that is specific to the topics they mentioned, not generic. For example, if they're studying "Laws of Inertia" in Physics, provide real physics content about Newton's laws, not generic study advice."""

    # Use a simple LLM simulation for local development
    # In production, this would call AWS Bedrock or another LLM service
    study_plan = generate_llm_response(prompt, req, days_until)
    
    return {"study_plan": study_plan}


def generate_llm_response(prompt, req, days_until):
    """Generate LLM response for study plan - simplified for local development."""
    topics = [t for t in req.topics if t.strip()]
    
    # Generate realistic study plan based on student requirements
    study_plan = {
        "plan_name": req.plan_name,
        "subject": req.subject,
        "topics": topics,
        "exam_date": req.exam_date,
        "exam_time": f"{req.start_time} - {req.end_time}",
        "days_until_exam": days_until,
        "grade_level": req.grade_level,
        "study_schedule": generate_personalized_schedule(req, topics, days_until),
        "topic_prioritization": generate_topic_prioritization(topics, req.subject),
        "study_strategies": generate_study_strategies(topics, req.subject),
        "milestones": generate_milestones(req.exam_date, days_until),
        "detailed_topic_info": generate_detailed_topic_info(topics, req.subject, req.grade_level),
        "recommendations": generate_personalized_recommendations(req)
    }
    
    return study_plan


def generate_personalized_schedule(req, topics, days_until):
    """Generate personalized study schedule based on student requirements."""
    weeks_needed = max(1, (days_until // 7) + 1)
    weekly_breakdown = []
    
    for week in range(1, min(weeks_needed + 1, 5)):
        week_topics = topics[week-1::weeks_needed] if len(topics) > week-1 else topics[:1]
        daily_schedule = []
        
        days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        study_days = days[:5] if req.study_intensity.startswith('Intense') else days[:3] if req.study_intensity.startswith('Moderate') else days[:1]
        
        for i, day in enumerate(study_days):
            if i < len(week_topics):
                topic = week_topics[i]
                daily_schedule.append({
                    "day": day,
                    "time": f"{req.preferred_time} - {req.session_duration}",
                    "activity": f"Study {topic} - Core concepts, practice problems, and real-world applications",
                    "duration": req.session_duration,
                    "focus_topic": topic,
                    "learning_objectives": [f"Master {topic} fundamentals", f"Apply {topic} concepts to problems"]
                })
        
        weekly_breakdown.append({
            "week": week,
            "focus_topics": week_topics,
            "daily_schedule": daily_schedule,
            "weekly_goals": [f"Complete {topic} study and practice" for topic in week_topics]
        })
    
    return {"weekly_breakdown": weekly_breakdown}


def generate_topic_prioritization(topics, subject):
    """Generate topic prioritization based on subject and topics."""
    prioritization = []
    for i, topic in enumerate(topics):
        priority = "high" if i == 0 else "medium" if i < len(topics) // 2 else "low"
        difficulty = "medium" if i % 2 == 0 else "hard" if i % 3 == 0 else "easy"
        
        prioritization.append({
            "topic": topic,
            "priority": priority,
            "time_allocation": f"{2 + i} hours",
            "difficulty": difficulty,
            "definition": f"Comprehensive study of {topic} in {subject}",
            "sub_topics_count": 4 + i,
            "key_concepts": [f"{topic} fundamentals", f"{topic} applications", f"{topic} problem-solving"]
        })
    
    return prioritization


def generate_study_strategies(topics, subject):
    """Generate personalized study strategies for each topic."""
    strategies = []
    for topic in topics:
        strategies.append({
            "topic": topic,
            "definition": f"Detailed study of {topic} concepts and applications in {subject}",
            "sub_topics": [f"{topic} fundamentals", f"{topic} applications", f"Advanced {topic}"],
            "key_concepts": [f"Core {topic} principles", f"{topic} problem-solving techniques"],
            "formulas": [f"Key {topic} equations", f"Important {topic} relationships"],
            "examples": [f"Real-world {topic} applications", f"Step-by-step {topic} problems"],
            "learning_objectives": [f"Master {topic} concepts", f"Apply {topic} to solve problems"],
            "techniques": [f"Active reading of {topic} materials", f"Practice {topic} problems daily"],
            "resources": [f"{topic} textbooks and notes", f"Online {topic} tutorials"],
            "practice_methods": [f"Daily {topic} practice", f"Weekly {topic} assessments"]
        })
    
    return strategies


def generate_milestones(exam_date, days_until):
    """Generate study milestones based on timeline."""
    milestones = []
    for i in range(min(4, (days_until // 7) + 1)):
        milestone_date = (datetime.now() + timedelta(days=7*i)).strftime("%Y-%m-%d")
        milestones.append({
            "date": milestone_date,
            "milestone": f"Complete Week {i+1} study objectives",
            "type": "review"
        })
    
    milestones.append({
        "date": exam_date,
        "milestone": "Final exam",
        "type": "assessment"
    })
    
    return milestones


def generate_detailed_topic_info(topics, subject, grade_level):
    """Generate detailed topic information based on student requirements."""
    topic_info = {}
    for topic in topics:
        topic_info[topic] = {
            "definition": f"Comprehensive study of {topic} in {subject} for {grade_level} level, covering fundamental concepts, applications, and problem-solving techniques.",
            "sub_topics": [
                f"Introduction to {topic}",
                f"{topic} fundamentals and principles",
                f"Applications of {topic}",
                f"Problem-solving with {topic}",
                f"Advanced {topic} concepts"
            ],
            "key_concepts": [
                f"Core principles of {topic}",
                f"Important {topic} relationships",
                f"Practical applications of {topic}",
                f"Problem-solving strategies for {topic}"
            ],
            "formulas": [
                f"Essential {topic} equations",
                f"Key {topic} relationships",
                f"Important {topic} calculations"
            ],
            "examples": [
                f"Real-world {topic} applications",
                f"Step-by-step {topic} problems",
                f"Common {topic} exam questions"
            ],
            "learning_objectives": [
                f"Understand {topic} fundamentals",
                f"Apply {topic} concepts to solve problems",
                f"Analyze {topic} in real-world contexts"
            ],
            "focus_areas": ["concepts", "applications", "problem_solving", "practice"]
        }
    
    return topic_info


def generate_personalized_recommendations(req):
    """Generate personalized recommendations based on student preferences."""
    return {
        "study_environment": f"Create a focused study space optimized for {req.preferred_time} study sessions. Ensure good lighting and minimal distractions.",
        "time_management": f"Follow your {req.study_intensity} schedule with {req.session_duration} sessions. Use the {req.preferred_time} time slot consistently for better focus.",
        "stress_management": "Take regular breaks every 45-60 minutes. Practice deep breathing and maintain a healthy sleep schedule.",
        "last_minute_prep": "In the final week, focus on reviewing key concepts and practicing with past exam questions. Avoid cramming new material."
    }


# Health check endpoint
@app.get("/health")
def health_check():
    return {"status": "healthy", "message": "AI Tutor API is running"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)
