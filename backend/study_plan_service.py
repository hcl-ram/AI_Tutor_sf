# study_plan_service.py
import os
import json
import re
import boto3
from datetime import datetime
from typing import Dict, Any
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def get_bedrock_runtime_client():
    """Get Bedrock runtime client."""
    return boto3.client(
        service_name="bedrock-runtime",
        region_name=os.getenv("AWS_REGION", "us-east-1"),
        aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
        aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY")
    )

def _sanitize_json_text(raw_text: str) -> str:
    """Sanitize LLM output to extract JSON."""
    if not raw_text:
        return ""
    text = raw_text.strip()
    
    # Remove fenced code blocks
    text = re.sub(r"```[a-zA-Z]*\n", "", text)
    text = text.replace("```", "")
    
    # Replace smart quotes
    text = text.replace(""", '"').replace(""", '"').replace("'", "'")
    
    # Extract JSON object
    if '{' in text and '}' in text:
        start = text.find('{')
        end = text.rfind('}') + 1
        if start != -1 and end != -1 and end > start:
            text = text[start:end]
    
    # Remove trailing commas
    text = re.sub(r",\s*([}\]])", r"\1", text)
    return text.strip()

def generate_study_plan_with_bedrock(study_plan_request: Dict[str, Any], days_until: int) -> Dict[str, Any]:
    """Generate a detailed, personalized study plan using AWS Bedrock LLM."""
    topics = [t for t in study_plan_request["topics"] if t.strip()]
    topics_str = ", ".join(topics)
    
    # Create comprehensive prompt for AWS Bedrock
    prompt = f"""You are an expert educational planner and tutor. Create a comprehensive, personalized study plan for a student based on their specific requirements.

STUDENT REQUIREMENTS:
- Plan Name: {study_plan_request["plan_name"]}
- Grade Level: {study_plan_request["grade_level"]}
- Subject: {study_plan_request["subject"]}
- Topics to Study: {topics_str}
- Exam Date: {study_plan_request["exam_date"]}
- Exam Time: {study_plan_request["start_time"]} - {study_plan_request["end_time"]}
- Days Until Exam: {days_until} days
- Preferred Study Time: {study_plan_request["preferred_time"]}
- Study Intensity: {study_plan_request["study_intensity"]}
- Session Duration: {study_plan_request["session_duration"]}
- Google Calendar Integration: {"Yes" if study_plan_request.get("use_google_calendar", False) else "No"}

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
    "plan_name": "{study_plan_request["plan_name"]}",
    "subject": "{study_plan_request["subject"]}",
    "topics": {topics},
    "exam_date": "{study_plan_request["exam_date"]}",
    "exam_time": "{study_plan_request["start_time"]} - {study_plan_request["end_time"]}",
    "days_until_exam": {days_until},
    "grade_level": "{study_plan_request["grade_level"]}",
    "study_schedule": {{
        "weekly_breakdown": [
            {{
                "week": 1,
                "focus_topics": ["topic1", "topic2"],
                "daily_schedule": [
                    {{
                        "day": "Monday",
                        "time": "{study_plan_request["preferred_time"]} - {study_plan_request["session_duration"]}",
                        "activity": "Specific study activity description",
                        "duration": "{study_plan_request["session_duration"]}",
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

Generate content that is specific to the topics they mentioned, not generic. For example, if they're studying "Laws of Inertia" in Physics, provide real physics content about Newton's laws, not generic study advice.

Return ONLY the JSON object, no additional text or explanations."""

    # Check if AWS credentials are available and valid
    aws_access_key = os.getenv("AWS_ACCESS_KEY_ID", "").strip()
    aws_secret_key = os.getenv("AWS_SECRET_ACCESS_KEY", "").strip()
    
    # Check for dummy/placeholder credentials
    if (not aws_access_key or not aws_secret_key or 
        aws_access_key == "your_aws_access_key_here" or 
        aws_access_key == "dummy" or 
        aws_secret_key == "dummy"):
        print("⚠️ AWS credentials not configured or set to dummy values. Using enhanced fallback study plan.")
        print("💡 To use real LLM generation, set valid AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in .env file")
        return generate_enhanced_fallback_study_plan(study_plan_request, days_until)
    
    try:
        # Get Bedrock client
        client = get_bedrock_runtime_client()
        model_id = os.getenv("BEDROCK_MODEL_ID", "anthropic.claude-3-sonnet-20240229-v1:0")
        
        # Prepare payload for Bedrock (same format as quiz generation)
        body = json.dumps({
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 3000,  # Increased for detailed study plans
            "temperature": 0.3,  # Lower temperature for more consistent output
            "messages": [
                {"role": "user", "content": prompt}
            ]
        })

        print(f"🤖 Calling AWS Bedrock with model: {model_id}")
        
        # Invoke Bedrock LLM
        response = client.invoke_model(
            modelId=model_id,
            body=body
        )
        
        # Read and parse response
        raw_body = response["body"].read()
        result = json.loads(raw_body)

        # Extract text from Anthropic response format
        text_output = (
            result.get("content", [{}])[0].get("text")
            or result.get("output_text")
            or result.get("completion")
            or ""
        ).strip()

        print(f"✅ Received response from Bedrock (length: {len(text_output)} chars)")
        
        # Clean and parse JSON response
        cleaned_text = _sanitize_json_text(text_output)
        
        try:
            study_plan_data = json.loads(cleaned_text)
            print("✅ Successfully parsed JSON response from Bedrock")
            return {"study_plan": study_plan_data}
        except json.JSONDecodeError as e:
            print(f"❌ JSON parsing failed: {e}")
            print(f"Cleaned text: {cleaned_text[:500]}...")
            # Fallback to enhanced response if JSON parsing fails
            return generate_enhanced_fallback_study_plan(study_plan_request, days_until)

    except Exception as e:
        print(f"❌ Bedrock call failed: {e}")
        # Fallback to enhanced response if Bedrock fails
        return generate_enhanced_fallback_study_plan(study_plan_request, days_until)

def generate_enhanced_fallback_study_plan(study_plan_request: Dict[str, Any], days_until: int) -> Dict[str, Any]:
    """Generate an enhanced fallback study plan with detailed content when AWS Bedrock is not available."""
    print("⚠️ Using enhanced fallback study plan generation (AWS Bedrock not available)")
    topics = [t for t in study_plan_request["topics"] if t.strip()]
    
    # Generate detailed topic information based on subject
    detailed_topic_info = {}
    for topic in topics:
        if study_plan_request["subject"].lower() == "physics":
            if "inertia" in topic.lower():
                detailed_topic_info[topic] = {
                    "definition": "Newton's First Law of Motion states that an object at rest stays at rest, and an object in motion stays in motion with the same speed and in the same direction unless acted upon by an unbalanced force.",
                    "sub_topics": [
                        "Newton's First Law (Law of Inertia)",
                        "Mass and Inertia",
                        "Static and Dynamic Equilibrium",
                        "Friction and Inertia",
                        "Real-world Applications of Inertia"
                    ],
                    "key_concepts": [
                        "Inertia is the tendency of objects to resist changes in their state of motion",
                        "Mass is a measure of an object's inertia",
                        "Objects at rest remain at rest unless acted upon by an external force",
                        "Objects in motion continue moving at constant velocity unless acted upon by an external force"
                    ],
                    "formulas": [
                        "F = ma (Newton's Second Law)",
                        "ΣF = 0 (Condition for equilibrium)",
                        "Inertia ∝ Mass"
                    ],
                    "examples": [
                        "A book resting on a table stays at rest until you push it",
                        "When a bus suddenly stops, passengers lurch forward due to inertia",
                        "It's harder to push a heavy box than a light box due to greater inertia"
                    ],
                    "learning_objectives": [
                        "Understand the concept of inertia and its relationship to mass",
                        "Apply Newton's First Law to explain everyday phenomena",
                        "Distinguish between balanced and unbalanced forces"
                    ],
                    "focus_areas": ["concepts", "applications", "problem_solving"]
                }
            elif "thermodynamics" in topic.lower():
                detailed_topic_info[topic] = {
                    "definition": "Thermodynamics is the branch of physics that deals with heat, temperature, and their relation to energy and work. It studies how thermal energy is converted to and from other forms of energy.",
                    "sub_topics": [
                        "Temperature and Heat Transfer",
                        "First Law of Thermodynamics (Energy Conservation)",
                        "Second Law of Thermodynamics (Entropy)",
                        "Heat Engines and Efficiency",
                        "Phase Changes and Latent Heat"
                    ],
                    "key_concepts": [
                        "Heat is energy transfer due to temperature difference",
                        "Temperature is a measure of average kinetic energy of particles",
                        "Energy cannot be created or destroyed (First Law)",
                        "Entropy always increases in isolated systems (Second Law)"
                    ],
                    "formulas": [
                        "Q = mcΔT (Heat transfer equation)",
                        "PV = nRT (Ideal gas law)",
                        "η = 1 - Tc/Th (Carnot efficiency)"
                    ],
                    "examples": [
                        "Boiling water increases its temperature and internal energy",
                        "A refrigerator removes heat from inside and releases it outside",
                        "Steam engines convert heat from burning fuel to mechanical work"
                    ],
                    "learning_objectives": [
                        "Understand heat transfer mechanisms",
                        "Apply the First Law of Thermodynamics to energy problems",
                        "Calculate efficiency of heat engines"
                    ],
                    "focus_areas": ["energy_conservation", "heat_transfer", "efficiency"]
                }
            else:
                # Generic physics topic
                detailed_topic_info[topic] = {
                    "definition": f"Comprehensive study of {topic} in Physics, covering fundamental concepts, applications, and problem-solving techniques.",
                    "sub_topics": [f"Introduction to {topic}", f"{topic} fundamentals", f"Applications of {topic}"],
                    "key_concepts": [f"Core principles of {topic}", f"Important {topic} relationships"],
                    "formulas": [f"Essential {topic} equations", f"Key {topic} relationships"],
                    "examples": [f"Real-world {topic} applications", f"Step-by-step {topic} problems"],
                    "learning_objectives": [f"Understand {topic} fundamentals", f"Apply {topic} concepts"],
                    "focus_areas": ["concepts", "applications", "problem_solving"]
                }
        else:
            # Generic topic for other subjects
            detailed_topic_info[topic] = {
                "definition": f"Comprehensive study of {topic} in {study_plan_request['subject']}, covering fundamental concepts, applications, and problem-solving techniques.",
                "sub_topics": [f"Introduction to {topic}", f"{topic} fundamentals", f"Applications of {topic}"],
                "key_concepts": [f"Core principles of {topic}", f"Important {topic} relationships"],
                "formulas": [f"Essential {topic} equations", f"Key {topic} relationships"],
                "examples": [f"Real-world {topic} applications", f"Step-by-step {topic} problems"],
                "learning_objectives": [f"Understand {topic} fundamentals", f"Apply {topic} concepts"],
                "focus_areas": ["concepts", "applications", "problem_solving"]
            }
    
    # Generate study schedule based on intensity
    study_days = []
    if study_plan_request["study_intensity"].startswith('Intense'):
        study_days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
    elif study_plan_request["study_intensity"].startswith('Moderate'):
        study_days = ['Monday', 'Wednesday', 'Friday']
    else:
        study_days = ['Monday']
    
    daily_schedule = []
    for i, day in enumerate(study_days):
        if i < len(topics):
            topic = topics[i]
            daily_schedule.append({
                "day": day,
                "time": f"{study_plan_request['preferred_time']} - {study_plan_request['session_duration']}",
                "activity": f"Study {topic} - Core concepts, practice problems, and real-world applications",
                "duration": study_plan_request["session_duration"],
                "focus_topic": topic,
                "learning_objectives": [f"Master {topic} fundamentals", f"Apply {topic} concepts to problems"]
            })
    
    return {"study_plan": {
        "plan_name": study_plan_request["plan_name"],
        "subject": study_plan_request["subject"],
        "topics": topics,
        "exam_date": study_plan_request["exam_date"],
        "exam_time": f"{study_plan_request['start_time']} - {study_plan_request['end_time']}",
        "days_until_exam": days_until,
        "grade_level": study_plan_request["grade_level"],
        "study_schedule": {
            "weekly_breakdown": [{
                "week": 1,
                "focus_topics": topics,
                "daily_schedule": daily_schedule,
                "weekly_goals": [f"Complete {topic} study and practice" for topic in topics]
            }]
        },
        "topic_prioritization": [{
            "topic": topic,
            "priority": "high" if i == 0 else "medium",
            "time_allocation": f"{2 + i} hours",
            "difficulty": "medium",
            "definition": detailed_topic_info[topic]["definition"],
            "sub_topics_count": len(detailed_topic_info[topic]["sub_topics"]),
            "key_concepts": detailed_topic_info[topic]["key_concepts"][:3]
        } for i, topic in enumerate(topics)],
        "study_strategies": [{
            "topic": topic,
            "definition": detailed_topic_info[topic]["definition"],
            "sub_topics": detailed_topic_info[topic]["sub_topics"],
            "key_concepts": detailed_topic_info[topic]["key_concepts"],
            "formulas": detailed_topic_info[topic]["formulas"],
            "examples": detailed_topic_info[topic]["examples"],
            "learning_objectives": detailed_topic_info[topic]["learning_objectives"],
            "techniques": [f"Active reading of {topic} materials", f"Practice {topic} problems daily"],
            "resources": [f"{topic} textbooks and notes", f"Online {topic} tutorials"],
            "practice_methods": [f"Daily {topic} practice", f"Weekly {topic} assessments"]
        } for topic in topics],
        "milestones": [{
            "date": study_plan_request["exam_date"],
            "milestone": "Final exam",
            "type": "assessment"
        }],
        "detailed_topic_info": detailed_topic_info,
        "recommendations": {
            "study_environment": f"Create a focused study space optimized for {study_plan_request['preferred_time']} study sessions. Ensure good lighting and minimal distractions.",
            "time_management": f"Follow your {study_plan_request['study_intensity']} schedule with {study_plan_request['session_duration']} sessions. Use the {study_plan_request['preferred_time']} time slot consistently for better focus.",
            "stress_management": "Take regular breaks every 45-60 minutes. Practice deep breathing and maintain a healthy sleep schedule.",
            "last_minute_prep": "In the final week, focus on reviewing key concepts and practicing with past exam questions. Avoid cramming new material."
        }
    }}
