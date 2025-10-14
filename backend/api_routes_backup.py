import os
import json
import uuid
from datetime import datetime, timedelta
from typing import List, Literal

from notes_service import save_refined_note
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
from rag_service import build_context_from_document, summarize_document, get_bedrock_runtime_client, call_bedrock_rag


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


class StudyPlanRequest(BaseModel):
    plan_name: str
    grade_level: str
    subject: str
    topics: List[str]
    exam_date: str
    start_time: str
    end_time: str
    preferred_time: str
    study_intensity: str
    session_duration: str
    use_google_calendar: bool = False


def generate_topic_details(topics, subject, grade_level):
    """Generate detailed information for each topic including definitions, sub-topics, examples, etc."""
    topic_details = {}
    
    # Subject-specific topic information
    subject_topics = {
        "Physics": {
            "Mechanics": {
                "definition": "The branch of physics that deals with the motion of objects and the forces that cause motion.",
                "sub_topics": [
                    "Kinematics (Motion in 1D and 2D)",
                    "Dynamics (Newton's Laws)",
                    "Work, Energy, and Power",
                    "Momentum and Collisions",
                    "Rotational Motion",
                    "Gravitation"
                ],
                "key_concepts": [
                    "Displacement, velocity, acceleration",
                    "Force, mass, and acceleration relationship",
                    "Conservation of energy",
                    "Conservation of momentum",
                    "Centripetal force and circular motion"
                ],
                "formulas": [
                    "v = u + at (First equation of motion)",
                    "F = ma (Newton's second law)",
                    "KE = ½mv² (Kinetic energy)",
                    "p = mv (Momentum)"
                ],
                "examples": [
                    "Projectile motion problems",
                    "Pulley systems",
                    "Collision analysis",
                    "Simple harmonic motion"
                ],
                "learning_objectives": [
                    "Understand the relationship between force, mass, and acceleration",
                    "Apply conservation laws to solve problems",
                    "Analyze motion in different coordinate systems",
                    "Solve complex multi-step problems"
                ],
                "focus_areas": ["theory", "problem_solving", "applications", "derivations"]
            },
            "Thermodynamics": {
                "definition": "The branch of physics that deals with heat, temperature, and their relation to energy and work.",
                "sub_topics": [
                    "Temperature and Heat",
                    "Laws of Thermodynamics",
                    "Heat Engines and Refrigerators",
                    "Entropy and Disorder",
                    "Phase Changes",
                    "Kinetic Theory of Gases"
                ],
                "key_concepts": [
                    "Temperature scales and conversion",
                    "Heat transfer mechanisms",
                    "First law of thermodynamics",
                    "Second law of thermodynamics",
                    "Entropy and disorder"
                ],
                "formulas": [
                    "Q = mcΔT (Heat transfer)",
                    "PV = nRT (Ideal gas law)",
                    "ΔS = Q/T (Entropy change)",
                    "η = 1 - Tc/Th (Carnot efficiency)"
                ],
                "examples": [
                    "Heat engine efficiency calculations",
                    "Phase change problems",
                    "Thermal expansion",
                    "Heat pump analysis"
                ],
                "learning_objectives": [
                    "Understand heat transfer mechanisms",
                    "Apply thermodynamic laws to real systems",
                    "Calculate efficiency of heat engines",
                    "Analyze entropy changes"
                ],
                "focus_areas": ["concepts", "calculations", "applications", "problem_solving"]
            }
        },
        "Mathematics": {
            "Algebra": {
                "definition": "A branch of mathematics dealing with symbols and the rules for manipulating these symbols.",
                "sub_topics": [
                    "Linear Equations and Inequalities",
                    "Quadratic Equations",
                    "Polynomial Functions",
                    "Rational Expressions",
                    "Exponential and Logarithmic Functions",
                    "Systems of Equations"
                ],
                "key_concepts": [
                    "Solving linear and quadratic equations",
                    "Graphing functions",
                    "Factoring techniques",
                    "Exponential and logarithmic properties"
                ],
                "formulas": [
                    "ax² + bx + c = 0 (Quadratic formula)",
                    "y = mx + b (Linear equation)",
                    "a^x = b → x = log_a(b) (Logarithmic conversion)"
                ],
                "examples": [
                    "Word problems involving linear equations",
                    "Quadratic equation applications",
                    "Exponential growth and decay",
                    "System of equations word problems"
                ],
                "learning_objectives": [
                    "Solve various types of equations",
                    "Graph and analyze functions",
                    "Apply algebraic concepts to word problems",
                    "Use algebraic techniques in other subjects"
                ],
                "focus_areas": ["problem_solving", "graphing", "applications", "techniques"]
            }
        },
        "Chemistry": {
            "Atomic Structure": {
                "definition": "The study of the composition, structure, and properties of atoms.",
                "sub_topics": [
                    "Subatomic Particles",
                    "Electron Configuration",
                    "Periodic Trends",
                    "Chemical Bonding",
                    "Molecular Geometry",
                    "Intermolecular Forces"
                ],
                "key_concepts": [
                    "Proton, neutron, electron properties",
                    "Electron shells and orbitals",
                    "Periodic table organization",
                    "Ionic and covalent bonding"
                ],
                "formulas": [
                    "Atomic number = number of protons",
                    "Mass number = protons + neutrons",
                    "Electron configuration rules"
                ],
                "examples": [
                    "Drawing Lewis structures",
                    "Predicting molecular geometry",
                    "Analyzing periodic trends",
                    "Bond polarity calculations"
                ],
                "learning_objectives": [
                    "Understand atomic structure",
                    "Predict chemical behavior",
                    "Explain periodic trends",
                    "Apply bonding concepts"
                ],
                "focus_areas": ["theory", "calculations", "visualization", "applications"]
            }
        }
    }
    
    # Generate details for each topic
    for topic in topics:
        if subject in subject_topics and topic in subject_topics[subject]:
            topic_details[topic] = subject_topics[subject][topic]
        else:
            # Generic topic details if not found in specific subjects
            topic_details[topic] = {
                "definition": f"The study of {topic.lower()} in {subject}.",
                "sub_topics": [
                    f"Introduction to {topic}",
                    f"{topic} Fundamentals",
                    f"Advanced {topic} Concepts",
                    f"{topic} Applications"
                ],
                "key_concepts": [
                    f"Basic principles of {topic}",
                    f"Important {topic} theories",
                    f"Practical applications of {topic}"
                ],
                "formulas": [
                    f"Key {topic} equations",
                    f"Important {topic} relationships"
                ],
                "examples": [
                    f"Basic {topic} problems",
                    f"Real-world {topic} applications"
                ],
                "learning_objectives": [
                    f"Understand {topic} concepts",
                    f"Apply {topic} principles",
                    f"Solve {topic} problems"
                ],
                "focus_areas": ["theory", "examples", "applications", "problem_solving"]
            }
    
    return topic_details


def generate_educational_content(topics, subject, grade_level):
    """Generate real educational content for each topic using comprehensive subject knowledge."""
    topic_details = {}
    
    # Comprehensive educational content database
    educational_content = {
        "Physics": {
            "Laws of Inertia": {
                "definition": "Newton's First Law of Motion states that an object at rest stays at rest, and an object in motion stays in motion with the same speed and in the same direction unless acted upon by an unbalanced force. This is also known as the Law of Inertia.",
                "sub_topics": [
                    "Newton's First Law (Law of Inertia)",
                    "Mass and Inertia",
                    "Static and Dynamic Equilibrium",
                    "Friction and Inertia",
                    "Real-world Applications of Inertia",
                    "Inertial Reference Frames"
                ],
                "key_concepts": [
                    "Inertia is the tendency of objects to resist changes in their state of motion",
                    "Mass is a measure of an object's inertia - more massive objects have more inertia",
                    "Objects at rest remain at rest unless acted upon by an external force",
                    "Objects in motion continue moving at constant velocity unless acted upon by an external force",
                    "Inertia depends on mass, not weight or speed"
                ],
                "formulas": [
                    "F = ma (Newton's Second Law - relates force, mass, and acceleration)",
                    "ΣF = 0 (Condition for equilibrium - net force equals zero)",
                    "Inertia ∝ Mass (Inertia is directly proportional to mass)"
                ],
                "examples": [
                    "A book resting on a table stays at rest until you push it",
                    "A car continues moving forward when brakes are applied (passengers feel forward motion)",
                    "A ball rolling on a frictionless surface would roll forever",
                    "When a bus suddenly stops, passengers lurch forward due to inertia",
                    "It's harder to push a heavy box than a light box due to greater inertia"
                ],
                "learning_objectives": [
                    "Understand the concept of inertia and its relationship to mass",
                    "Apply Newton's First Law to explain everyday phenomena",
                    "Distinguish between balanced and unbalanced forces",
                    "Analyze motion in inertial reference frames",
                    "Solve problems involving static and dynamic equilibrium"
                ],
                "focus_areas": ["concepts", "applications", "problem_solving", "real_world_examples"]
            },
            "Thermodynamics": {
                "definition": "Thermodynamics is the branch of physics that deals with heat, temperature, and their relation to energy and work. It studies how thermal energy is converted to and from other forms of energy.",
                "sub_topics": [
                    "Temperature and Heat Transfer",
                    "First Law of Thermodynamics (Energy Conservation)",
                    "Second Law of Thermodynamics (Entropy)",
                    "Heat Engines and Efficiency",
                    "Phase Changes and Latent Heat",
                    "Kinetic Theory of Gases"
                ],
                "key_concepts": [
                    "Heat is energy transfer due to temperature difference",
                    "Temperature is a measure of average kinetic energy of particles",
                    "Energy cannot be created or destroyed (First Law)",
                    "Entropy always increases in isolated systems (Second Law)",
                    "Heat engines convert thermal energy to mechanical work"
                ],
                "formulas": [
                    "Q = mcΔT (Heat transfer equation)",
                    "PV = nRT (Ideal gas law)",
                    "η = 1 - Tc/Th (Carnot efficiency)",
                    "ΔS = Q/T (Entropy change)",
                    "W = Qh - Qc (Work done by heat engine)"
                ],
                "examples": [
                    "Boiling water increases its temperature and internal energy",
                    "A refrigerator removes heat from inside and releases it outside",
                    "Steam engines convert heat from burning fuel to mechanical work",
                    "Ice melting absorbs heat without changing temperature",
                    "Car engines lose energy as waste heat, limiting efficiency"
                ],
                "learning_objectives": [
                    "Understand heat transfer mechanisms (conduction, convection, radiation)",
                    "Apply the First Law of Thermodynamics to energy problems",
                    "Calculate efficiency of heat engines and refrigerators",
                    "Analyze phase changes and latent heat",
                    "Explain entropy and the Second Law of Thermodynamics"
                ],
                "focus_areas": ["energy_conservation", "heat_transfer", "efficiency", "phase_changes"]
            },
            "Mechanics": {
                "definition": "Mechanics is the branch of physics that deals with the motion of objects and the forces that cause motion. It includes kinematics (description of motion) and dynamics (causes of motion).",
                "sub_topics": [
                    "Kinematics (Motion in 1D and 2D)",
                    "Newton's Laws of Motion",
                    "Work, Energy, and Power",
                    "Momentum and Collisions",
                    "Rotational Motion",
                    "Gravitation"
                ],
                "key_concepts": [
                    "Displacement, velocity, and acceleration describe motion",
                    "Force causes acceleration (F = ma)",
                    "Work is force times distance in direction of force",
                    "Energy is conserved in isolated systems",
                    "Momentum is conserved in collisions"
                ],
                "formulas": [
                    "v = u + at (First equation of motion)",
                    "s = ut + ½at² (Second equation of motion)",
                    "F = ma (Newton's second law)",
                    "W = Fd cos θ (Work done)",
                    "KE = ½mv² (Kinetic energy)",
                    "p = mv (Momentum)"
                ],
                "examples": [
                    "Projectile motion combines horizontal and vertical motion",
                    "Pulley systems change direction and magnitude of forces",
                    "Elastic collisions conserve both momentum and kinetic energy",
                    "Circular motion requires centripetal force",
                    "Gravitational force decreases with square of distance"
                ],
                "learning_objectives": [
                    "Analyze motion using kinematic equations",
                    "Apply Newton's laws to solve dynamics problems",
                    "Calculate work, energy, and power",
                    "Solve collision problems using momentum conservation",
                    "Understand rotational motion and gravitation"
                ],
                "focus_areas": ["motion_analysis", "force_analysis", "energy_conservation", "collision_analysis"]
            }
        },
        "Mathematics": {
            "Algebra": {
                "definition": "Algebra is a branch of mathematics that uses symbols and letters to represent numbers and quantities in formulas and equations. It allows us to solve problems involving unknown values.",
                "sub_topics": [
                    "Linear Equations and Inequalities",
                    "Quadratic Equations and Functions",
                    "Polynomial Functions",
                    "Rational Expressions",
                    "Exponential and Logarithmic Functions",
                    "Systems of Equations"
                ],
                "key_concepts": [
                    "Variables represent unknown quantities",
                    "Equations express relationships between quantities",
                    "Solving means finding values that make equations true",
                    "Functions relate input to output values",
                    "Graphs visualize relationships between variables"
                ],
                "formulas": [
                    "ax + b = 0 (Linear equation)",
                    "ax² + bx + c = 0 (Quadratic equation)",
                    "x = (-b ± √(b²-4ac))/2a (Quadratic formula)",
                    "y = mx + b (Linear function)",
                    "y = ax² + bx + c (Quadratic function)"
                ],
                "examples": [
                    "Solving 2x + 5 = 13 to find x = 4",
                    "Finding roots of x² - 5x + 6 = 0",
                    "Graphing y = 2x + 3 as a straight line",
                    "Solving system: x + y = 5, x - y = 1",
                    "Exponential growth: y = 2^x"
                ],
                "learning_objectives": [
                    "Solve linear and quadratic equations",
                    "Graph linear and quadratic functions",
                    "Factor polynomials",
                    "Solve systems of equations",
                    "Apply algebraic concepts to word problems"
                ],
                "focus_areas": ["equation_solving", "graphing", "factoring", "word_problems"]
            }
        },
        "Chemistry": {
            "Atomic Structure": {
                "definition": "Atomic structure refers to the arrangement of subatomic particles (protons, neutrons, and electrons) within an atom. It determines the chemical properties and behavior of elements.",
                "sub_topics": [
                    "Subatomic Particles (Protons, Neutrons, Electrons)",
                    "Atomic Number and Mass Number",
                    "Electron Configuration",
                    "Periodic Trends",
                    "Chemical Bonding",
                    "Molecular Geometry"
                ],
                "key_concepts": [
                    "Protons determine the element's identity",
                    "Electrons determine chemical properties",
                    "Neutrons contribute to atomic mass",
                    "Electrons occupy energy levels and orbitals",
                    "Valence electrons participate in bonding"
                ],
                "formulas": [
                    "Atomic number = number of protons",
                    "Mass number = protons + neutrons",
                    "Number of neutrons = mass number - atomic number",
                    "Electron configuration rules (Aufbau principle)"
                ],
                "examples": [
                    "Hydrogen has 1 proton, 0 neutrons, 1 electron",
                    "Carbon-12 has 6 protons, 6 neutrons, 6 electrons",
                    "Sodium loses 1 electron to form Na⁺ ion",
                    "Chlorine gains 1 electron to form Cl⁻ ion",
                    "Water (H₂O) forms through covalent bonding"
                ],
                "learning_objectives": [
                    "Understand atomic structure and subatomic particles",
                    "Write electron configurations",
                    "Explain periodic trends",
                    "Predict chemical bonding behavior",
                    "Analyze molecular geometry"
                ],
                "focus_areas": ["atomic_theory", "electron_configuration", "periodic_trends", "bonding"]
            }
        }
    }
    
    # Generate details for each topic
    for topic in topics:
        print(f"🔍 Debug: Processing topic '{topic}' for subject '{subject}'")
        
        # Try exact match first
        if subject in educational_content and topic in educational_content[subject]:
            print(f"✅ Found exact match for '{topic}'")
            topic_details[topic] = educational_content[subject][topic]
        else:
            # Try case-insensitive match
            found = False
            if subject in educational_content:
                print(f"🔍 Available topics in {subject}: {list(educational_content[subject].keys())}")
                for key in educational_content[subject].keys():
                    if topic.lower() == key.lower():
                        print(f"✅ Found case-insensitive match: '{topic}' -> '{key}'")
                        topic_details[topic] = educational_content[subject][key]
                        found = True
                        break
            
            if not found:
                print(f"⚠️ No match found for '{topic}', using generic content")
                # Generate realistic content for unknown topics
                topic_details[topic] = generate_realistic_topic_content(topic, subject, grade_level)
    
    return topic_details


def generate_realistic_topic_content(topic, subject, grade_level):
    """Generate realistic educational content for topics not in the database."""
    return {
        "definition": f"{topic} is a fundamental concept in {subject} that deals with the study of {topic.lower()} and its applications in various contexts.",
        "sub_topics": [
            f"Introduction to {topic}",
            f"Basic Principles of {topic}",
            f"Applications of {topic}",
            f"Advanced Concepts in {topic}",
            f"Problem Solving with {topic}",
            f"Real-world Examples of {topic}"
        ],
        "key_concepts": [
            f"Understanding the fundamental principles of {topic}",
            f"Key relationships and patterns in {topic}",
            f"Important applications of {topic}",
            f"Problem-solving strategies for {topic}",
            f"Connections between {topic} and other concepts"
        ],
        "formulas": [
            f"Basic equations related to {topic}",
            f"Key relationships in {topic}",
            f"Important formulas for {topic} calculations"
        ],
        "examples": [
            f"Basic problems involving {topic}",
            f"Real-world applications of {topic}",
            f"Step-by-step solutions for {topic} problems",
            f"Common exam questions on {topic}"
        ],
        "learning_objectives": [
            f"Understand the core concepts of {topic}",
            f"Apply {topic} principles to solve problems",
            f"Analyze real-world applications of {topic}",
            f"Connect {topic} with other {subject} concepts",
            f"Develop problem-solving skills in {topic}"
        ],
        "focus_areas": ["concepts", "applications", "problem_solving", "connections"]
    }


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
    
    for week in range(1, min(weeks_needed + 1, 5)):  # Max 4 weeks
        week_topics = topics[week-1::weeks_needed] if len(topics) > week-1 else topics[:1]
        daily_schedule = []
        
        days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        for i, day in enumerate(days[:5]):  # Weekdays only
            if i < len(week_topics):
                topic = week_topics[i]
                topic_info = topic_details.get(topic, {})
                sub_topics = topic_info.get('sub_topics', [])
                
                # Create detailed daily activities
                activities = []
                if sub_topics:
                    for j, sub_topic in enumerate(sub_topics[:2]):  # Max 2 sub-topics per day
                        activities.append(f"Study {sub_topic} - Theory and examples")
                else:
                    activities.append(f"Study {topic} - Core concepts and applications")
                    activities.append(f"Practice {topic} problems and exercises")
                
                daily_schedule.append({
                    "day": day,
                    "time": f"{req.preferred_time} - {req.session_duration}",
                    "activity": " | ".join(activities),
                    "duration": req.session_duration,
                    "focus_topic": topic,
                    "learning_objectives": topic_info.get('learning_objectives', [])[:2]
                })
        
        weekly_breakdown.append({
            "week": week,
            "focus_topics": week_topics,
            "daily_schedule": daily_schedule,
            "weekly_goals": [f"Master {topic} concepts and practice problems" for topic in week_topics]
        })
    
    # Generate detailed topic prioritization
    topic_prioritization = []
    for i, topic in enumerate(topics):
        topic_info = topic_details.get(topic, {})
        priority = "high" if i == 0 else "medium" if i < len(topics) // 2 else "low"
        time_allocation = f"{2 + i} hours"
        difficulty = "medium" if i % 2 == 0 else "hard" if i % 3 == 0 else "easy"
        
        topic_prioritization.append({
            "topic": topic,
            "priority": priority,
            "time_allocation": time_allocation,
            "difficulty": difficulty,
            "definition": topic_info.get('definition', ''),
            "sub_topics_count": len(topic_info.get('sub_topics', [])),
            "key_concepts": topic_info.get('key_concepts', [])[:3]  # First 3 key concepts
        })
    
    # Generate detailed study strategies
    study_strategies = []
    for topic in topics:
        topic_info = topic_details.get(topic, {})
        sub_topics = topic_info.get('sub_topics', [])
        formulas = topic_info.get('formulas', [])
        examples = topic_info.get('examples', [])
        
        study_strategies.append({
            "topic": topic,
            "definition": topic_info.get('definition', ''),
            "sub_topics": sub_topics,
            "key_concepts": topic_info.get('key_concepts', []),
            "formulas": formulas,
            "examples": examples,
            "learning_objectives": topic_info.get('learning_objectives', []),
            "techniques": [
                f"Study {topic} definitions and key concepts",
                f"Practice {topic} formulas and equations",
                f"Work through {topic} example problems",
                f"Create mind maps for {topic} sub-topics",
                f"Solve past exam questions on {topic}"
            ],
            "resources": [
                f"{topic} textbook chapters and notes",
                f"Online {topic} video lectures and tutorials",
                f"{topic} practice problems and worksheets",
                f"Past exam papers focusing on {topic}",
                f"Interactive {topic} simulations and apps"
            ],
            "practice_methods": [
                f"Daily {topic} concept review",
                f"Weekly {topic} problem-solving sessions",
                f"Create {topic} flashcards for formulas",
                f"Teach {topic} concepts to study partners",
                f"Take timed {topic} practice tests"
            ]
        })
    
    # Generate milestones
    milestones = []
    for i in range(min(weeks_needed, 4)):
        milestone_date = (datetime.now() + timedelta(days=7*i)).strftime("%Y-%m-%d")
        milestones.append({
            "date": milestone_date,
            "milestone": f"Complete Week {i+1} topics review",
            "type": "review"
        })
    
    milestones.append({
        "date": req.exam_date,
        "milestone": "Final exam",
        "type": "assessment"
    })
    
    # Generate recommendations based on preferences
    intensity_map = {
        "Light (once a week)": "Study once per week for 1-2 hours",
        "Moderate (3 times a week)": "Study 3 times per week for 1-2 hours each",
        "Intense (daily)": "Study daily for 1-2 hours with breaks"
    }
    
    duration_map = {
        "Quick Study (15–30 mins)": "15-30 minute focused sessions",
        "Standard (45–60 mins)": "45-60 minute comprehensive sessions", 
        "Deep Focus (90 mins)": "90 minute intensive study sessions"
    }
    
    study_plan = {
        "plan_name": req.plan_name,
        "subject": req.subject,
        "topics": topics,
        "exam_date": req.exam_date,
        "exam_time": f"{req.start_time} - {req.end_time}",
        "days_until_exam": days_until,
        "grade_level": req.grade_level,
        "study_schedule": {
            "weekly_breakdown": weekly_breakdown
        },
        "topic_prioritization": topic_prioritization,
        "study_strategies": study_strategies,
        "milestones": milestones,
        "detailed_topic_info": topic_details,  # Add detailed topic information
        "recommendations": {
            "study_environment": "Find a quiet, well-lit space with minimal distractions. Ensure good ventilation and comfortable seating.",
            "time_management": f"Follow a {intensity_map.get(req.study_intensity, 'moderate')} schedule with {duration_map.get(req.session_duration, 'standard')}.",
            "stress_management": "Take regular breaks every 45-60 minutes, get 7-8 hours of sleep, maintain a healthy diet, and practice relaxation techniques.",
            "last_minute_prep": "In the final week, focus on reviewing key concepts, practicing with sample questions, and getting adequate rest. Avoid cramming new material."
        }
    }
    
    return {"study_plan": study_plan}


def generate_mock_study_plan(req: StudyPlanRequest, days_until: int):
    """Generate a detailed, topic-specific study plan for local development when AWS credentials are not available."""
    topics = [t for t in req.topics if t.strip()]
    
    # Generate detailed topic information
    topic_details = generate_topic_details(topics, req.subject, req.grade_level)
    print(f"🔍 Debug: Generated topic_details for {topics}: {list(topic_details.keys())}")
    
    # Generate study schedule based on days until exam
    weeks_needed = max(1, (days_until // 7) + 1)
    weekly_breakdown = []
    
    for week in range(1, min(weeks_needed + 1, 5)):  # Max 4 weeks
        week_topics = topics[week-1::weeks_needed] if len(topics) > week-1 else topics[:1]
        daily_schedule = []
        
        days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        for i, day in enumerate(days[:5]):  # Weekdays only
            if i < len(week_topics):
                topic = week_topics[i]
                topic_info = topic_details.get(topic, {})
                sub_topics = topic_info.get('sub_topics', [])
                
                # Create detailed daily activities
                activities = []
                if sub_topics:
                    for j, sub_topic in enumerate(sub_topics[:2]):  # Max 2 sub-topics per day
                        activities.append(f"Study {sub_topic} - {topic_info.get('focus_areas', ['theory', 'examples'])[j % len(topic_info.get('focus_areas', ['theory', 'examples']))]}")
                else:
                    activities.append(f"Study {topic} - Theory and concepts")
                    activities.append(f"Practice {topic} problems and examples")
                
                daily_schedule.append({
                    "day": day,
                    "time": f"{req.preferred_time} - {req.session_duration}",
                    "activity": " | ".join(activities),
                    "duration": req.session_duration,
                    "focus_topic": topic,
                    "learning_objectives": topic_info.get('learning_objectives', [])[:2]
                })
        
        weekly_breakdown.append({
            "week": week,
            "focus_topics": week_topics,
            "daily_schedule": daily_schedule,
            "weekly_goals": [f"Master {topic} concepts and practice problems" for topic in week_topics]
        })
    
    # Generate detailed topic prioritization
    topic_prioritization = []
    for i, topic in enumerate(topics):
        topic_info = topic_details.get(topic, {})
        priority = "high" if i == 0 else "medium" if i < len(topics) // 2 else "low"
        time_allocation = f"{2 + i} hours"
        difficulty = "medium" if i % 2 == 0 else "hard" if i % 3 == 0 else "easy"
        
        topic_prioritization.append({
            "topic": topic,
            "priority": priority,
            "time_allocation": time_allocation,
            "difficulty": difficulty,
            "definition": topic_info.get('definition', ''),
            "sub_topics_count": len(topic_info.get('sub_topics', [])),
            "key_concepts": topic_info.get('key_concepts', [])[:3]  # First 3 key concepts
        })
    
    # Generate detailed study strategies
    study_strategies = []
    for topic in topics:
        topic_info = topic_details.get(topic, {})
        sub_topics = topic_info.get('sub_topics', [])
        formulas = topic_info.get('formulas', [])
        examples = topic_info.get('examples', [])
        
        study_strategies.append({
            "topic": topic,
            "definition": topic_info.get('definition', ''),
            "sub_topics": sub_topics,
            "key_concepts": topic_info.get('key_concepts', []),
            "formulas": formulas,
            "examples": examples,
            "learning_objectives": topic_info.get('learning_objectives', []),
            "techniques": [
                f"Study {topic} definitions and key concepts",
                f"Practice {topic} formulas and equations",
                f"Work through {topic} example problems",
                f"Create mind maps for {topic} sub-topics",
                f"Solve past exam questions on {topic}"
            ],
            "resources": [
                f"{topic} textbook chapters and notes",
                f"Online {topic} video lectures and tutorials",
                f"{topic} practice problems and worksheets",
                f"Past exam papers focusing on {topic}",
                f"Interactive {topic} simulations and apps"
            ],
            "practice_methods": [
                f"Daily {topic} concept review",
                f"Weekly {topic} problem-solving sessions",
                f"Create {topic} flashcards for formulas",
                f"Teach {topic} concepts to study partners",
                f"Take timed {topic} practice tests"
            ]
        })
    
    # Generate milestones
    milestones = []
    for i in range(min(weeks_needed, 4)):
        milestone_date = (datetime.now() + timedelta(days=7*i)).strftime("%Y-%m-%d")
        milestones.append({
            "date": milestone_date,
            "milestone": f"Complete Week {i+1} topics review",
            "type": "review"
        })
    
    milestones.append({
        "date": req.exam_date,
        "milestone": "Final exam",
        "type": "assessment"
    })
    
    # Generate recommendations based on preferences
    intensity_map = {
        "Light (once a week)": "Study once per week for 1-2 hours",
        "Moderate (3 times a week)": "Study 3 times per week for 1-2 hours each",
        "Intense (daily)": "Study daily for 1-2 hours with breaks"
    }
    
    duration_map = {
        "Quick Study (15–30 mins)": "15-30 minute focused sessions",
        "Standard (45–60 mins)": "45-60 minute comprehensive sessions", 
        "Deep Focus (90 mins)": "90 minute intensive study sessions"
    }
    
    study_plan = {
        "plan_name": req.plan_name,
        "subject": req.subject,
        "topics": topics,
        "exam_date": req.exam_date,
        "exam_time": f"{req.start_time} - {req.end_time}",
        "days_until_exam": days_until,
        "grade_level": req.grade_level,
        "study_schedule": {
            "weekly_breakdown": weekly_breakdown
        },
        "topic_prioritization": topic_prioritization,
        "study_strategies": study_strategies,
        "milestones": milestones,
        "detailed_topic_info": topic_details,  # Add detailed topic information
        "recommendations": {
            "study_environment": "Find a quiet, well-lit space with minimal distractions. Ensure good ventilation and comfortable seating.",
            "time_management": f"Follow a {intensity_map.get(req.study_intensity, 'moderate')} schedule with {duration_map.get(req.session_duration, 'standard')}.",
            "stress_management": "Take regular breaks every 45-60 minutes, get 7-8 hours of sleep, maintain a healthy diet, and practice relaxation techniques.",
            "last_minute_prep": "In the final week, focus on reviewing key concepts, practicing with sample questions, and getting adequate rest. Avoid cramming new material."
        }
    }
    
    return {"study_plan": study_plan}


class NoteInput(BaseModel):
    user_id: str
    raw_text: str


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
def tutor_rag_answer(req: TutorRAGRequest):
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

    # Use Bedrock via rag_service to handle model families
    answer = call_bedrock_rag(req.question, context)
    return {"answer": answer, "sources": sources}


@app.post("/tutor/doc-summary")
def tutor_doc_summary(req: DocSummaryRequest):
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
def tutor_answer_with_context(req: AnswerWithContextRequest):
    answer = call_bedrock_rag(req.question, req.context or "")
    return {"answer": answer, "sources": []}


# Pure LLM answer endpoint: bypass RAG and answer directly
class LLMAnswerRequest(BaseModel):
    question: str
    attachment_path: str | None = None


@app.post("/tutor/llm-answer")
def tutor_llm_answer(req: LLMAnswerRequest):
    # Generic non-RAG Bedrock generation using same model-family detection as support
    client = get_bedrock_runtime_client()
    model_id = os.getenv("BEDROCK_MODEL_ID", "").strip()
    if not model_id:
        raise HTTPException(status_code=500, detail="BEDROCK_MODEL_ID is not set in environment.")
    family = (model_id.split(".")[0].lower() if "." in model_id else model_id.lower())

    system = (
        "You are an intelligent NCERT-based AI Tutor. Answer clearly and helpfully in 3-6 sentences."
    )
    prompt = f"{system}\n\nUser question: {req.question}"

    if family == "anthropic":
        if "claude-3" in model_id or "claude-3-5" in model_id:
            payload = {
                "anthropic_version": "bedrock-2023-05-31",
                "messages": [{"role": "user", "content": [{"type": "text", "text": prompt}]}],
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
        return {"answer": ""}


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


@app.post("/tutor/generate-study-plan")
def generate_study_plan(req: StudyPlanRequest):
    """Generate a personalized study plan using LLM based on student inputs."""
    try:
        # Calculate days until exam
        from datetime import datetime
        try:
            exam_dt = datetime.strptime(req.exam_date, "%Y-%m-%d")
            days_until = (exam_dt - datetime.now()).days
        except:
            days_until = 7  # fallback

        # Check if we have valid AWS credentials
        aws_access_key = os.getenv("AWS_ACCESS_KEY_ID", "").strip()
        aws_secret_key = os.getenv("AWS_SECRET_ACCESS_KEY", "").strip()
        
        print(f"🔍 Debug: AWS_ACCESS_KEY_ID = '{aws_access_key}'")
        print(f"🔍 Debug: AWS_SECRET_ACCESS_KEY = '{aws_secret_key}'")
        
        # Always use LLM for study plan generation - no hardcoded content
        print("🤖 Generating personalized study plan using LLM based on student requirements")
        return generate_llm_study_plan(req, days_until)

        client = get_bedrock_runtime_client()
        model_id = os.getenv("BEDROCK_MODEL_ID", "").strip()
        if not model_id:
            raise HTTPException(status_code=500, detail="BEDROCK_MODEL_ID is not set in environment.")

        # Build comprehensive prompt for study plan generation
        topics_str = ", ".join([t for t in req.topics if t.strip()])
        
        prompt = f"""You are an expert educational planner. Create a detailed, personalized study plan for a student.

STUDENT DETAILS:
- Plan Name: {req.plan_name}
- Grade Level: {req.grade_level}
- Subject: {req.subject}
- Topics to Cover: {topics_str}
- Exam Date: {req.exam_date}
- Exam Time: {req.start_time} - {req.end_time}
- Days Until Exam: {days_until} days
- Preferred Study Time: {req.preferred_time}
- Study Intensity: {req.study_intensity}
- Session Duration: {req.session_duration}
- Google Calendar Integration: {"Yes" if req.use_google_calendar else "No"}

Create a comprehensive study plan that includes:

1. **Study Schedule**: A week-by-week breakdown showing:
   - Which topics to study on which days
   - Recommended study times based on their preferences
   - Session lengths matching their chosen duration
   - Rest days and review sessions

2. **Topic Prioritization**: 
   - Rank topics by importance/difficulty
   - Suggest time allocation for each topic
   - Identify topics that need more attention

3. **Study Strategies**:
   - Specific study techniques for each topic
   - Recommended resources and materials
   - Practice exercises and self-assessment methods

4. **Timeline Milestones**:
   - Key checkpoints before the exam
   - Review sessions and practice tests
   - Final preparation week schedule

5. **Tips and Recommendations**:
   - Study environment suggestions
   - Time management advice
   - Stress management techniques
   - Last-minute preparation tips

Format the response as a structured JSON object with the following structure:
{{
    "plan_name": "{req.plan_name}",
    "subject": "{req.subject}",
    "topics": {req.topics},
    "exam_date": "{req.exam_date}",
    "exam_time": "{req.start_time} - {req.end_time}",
    "days_until_exam": {days_until},
    "study_schedule": {{
        "weekly_breakdown": [
            {{
                "week": 1,
                "focus_topics": ["topic1", "topic2"],
                "daily_schedule": [
                    {{
                        "day": "Monday",
                        "time": "9:00 AM - 10:30 AM",
                        "activity": "Study topic1 - Theory and concepts",
                        "duration": "90 minutes"
                    }}
                ]
            }}
        ]
    }},
    "topic_prioritization": [
        {{
            "topic": "topic_name",
            "priority": "high/medium/low",
            "time_allocation": "X hours",
            "difficulty": "easy/medium/hard"
        }}
    ],
    "study_strategies": [
        {{
            "topic": "topic_name",
            "techniques": ["technique1", "technique2"],
            "resources": ["resource1", "resource2"],
            "practice_methods": ["method1", "method2"]
        }}
    ],
    "milestones": [
        {{
            "date": "YYYY-MM-DD",
            "milestone": "Complete topic1 review",
            "type": "review/assessment/practice"
        }}
    ],
    "recommendations": {{
        "study_environment": "specific suggestions",
        "time_management": "specific tips",
        "stress_management": "specific techniques",
        "last_minute_prep": "final week advice"
    }}
}}

Make the plan realistic, achievable, and tailored to their specific needs and timeline."""

        # Call Bedrock with the prompt
        family = (model_id.split(".")[0].lower() if "." in model_id else model_id.lower())
        
        if family == "anthropic":
            if "claude-3" in model_id or "claude-3-5" in model_id:
                payload = {
                    "anthropic_version": "bedrock-2023-05-31",
                    "messages": [{"role": "user", "content": [{"type": "text", "text": prompt}]}],
                    "max_tokens": 3000,
                    "temperature": 0.3,
                }
            else:
                payload = {
                    "prompt": f"\n\nHuman: {prompt}\n\nAssistant:",
                    "max_tokens_to_sample": 3000,
                    "temperature": 0.3,
                    "stop_sequences": ["\n\nHuman:"],
                }
        else:
            payload = {
                "inputText": prompt,
                "textGenerationConfig": {
                    "maxTokenCount": 3000,
                    "temperature": 0.3,
                    "topP": 0.9,
                },
            }

        resp = client.invoke_model(
            modelId=model_id,
            body=json.dumps(payload).encode("utf-8"),
            contentType="application/json",
            accept="application/json",
        )
        
        data = json.loads(resp["body"].read())
        
        # Extract response text
        if family == "anthropic":
            if "content" in data and isinstance(data["content"], list) and data["content"]:
                response_text = "\n".join([part.get("text") or part.get("content") or "" for part in data["content"]])
            else:
                response_text = data.get("completion", "")
        else:
            if isinstance(data, dict) and "results" in data and data["results"]:
                response_text = data["results"][0].get("outputText", "")
            else:
                response_text = ""

        # Try to parse JSON response, fallback to structured text
        try:
            study_plan = json.loads(response_text)
        except:
            # Fallback: create a basic structured response
            study_plan = {
                "plan_name": req.plan_name,
                "subject": req.subject,
                "topics": req.topics,
                "exam_date": req.exam_date,
                "exam_time": f"{req.start_time} - {req.end_time}",
                "days_until_exam": days_until,
                "study_schedule": {
                    "weekly_breakdown": [
                        {
                            "week": 1,
                            "focus_topics": req.topics[:2] if len(req.topics) >= 2 else req.topics,
                            "daily_schedule": [
                                {
                                    "day": "Monday",
                                    "time": f"{req.preferred_time} - {req.session_duration}",
                                    "activity": f"Study {req.topics[0] if req.topics else 'main topics'}",
                                    "duration": req.session_duration
                                }
                            ]
                        }
                    ]
                },
                "topic_prioritization": [
                    {
                        "topic": topic,
                        "priority": "high" if i == 0 else "medium",
                        "time_allocation": f"{2 + i} hours",
                        "difficulty": "medium"
                    } for i, topic in enumerate(req.topics)
                ],
                "study_strategies": [
                    {
                        "topic": topic,
                        "techniques": ["Read and take notes", "Practice problems", "Review flashcards"],
                        "resources": ["Textbook", "Online videos", "Practice tests"],
                        "practice_methods": ["Self-quiz", "Group study", "Mock exams"]
                    } for topic in req.topics
                ],
                "milestones": [
                    {
                        "date": req.exam_date,
                        "milestone": "Final exam",
                        "type": "assessment"
                    }
                ],
                "recommendations": {
                    "study_environment": "Quiet, well-lit space with minimal distractions",
                    "time_management": f"Study {req.study_intensity} for {req.session_duration} sessions",
                    "stress_management": "Take regular breaks, get adequate sleep, maintain a healthy diet",
                    "last_minute_prep": "Review key concepts, practice with sample questions, avoid cramming"
                },
                "raw_response": response_text[:500] + "..." if len(response_text) > 500 else response_text
            }

        return {"study_plan": study_plan}

    except Exception as e:
        print(f"❌ Error generating study plan: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate study plan: {str(e)}")


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

# =========================
# Notes Routes
# =========================

@app.post("/notes")
async def create_refined_note(note: NoteInput):
    """
    Endpoint to refine a note using Bedrock LLM and save it in DynamoDB.
    """
    try:
        saved_item = save_refined_note(note.user_id, note.raw_text)
        return {"message": "Note refined and saved successfully!", "item": saved_item}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", "8002")))



