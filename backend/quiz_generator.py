# quiz_generator.py
import os
import json
import re
import boto3
from typing import List, Dict
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Read credentials and region from .env
AWS_ACCESS_KEY = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
BEDROCK_MODEL_ID = os.getenv("BEDROCK_MODEL_ID", "anthropic.claude-3-sonnet-20240229-v1:0")

# Initialize Bedrock client
bedrock = boto3.client(
    service_name="bedrock-runtime",
    region_name=AWS_REGION,
    aws_access_key_id=AWS_ACCESS_KEY,
    aws_secret_access_key=AWS_SECRET_KEY
)

def _sanitize_json_text(raw_text: str) -> str:
    """Attempt to sanitize LLM output to a JSON array string."""
    if not raw_text:
        return ""
    text = raw_text.strip()
    # Remove fenced code blocks anywhere
    text = re.sub(r"```[a-zA-Z]*\n", "", text)
    text = text.replace("```", "")
    # Replace smart quotes
    text = text.replace("“", '"').replace("”", '"').replace("’", "'")
    # Trim preamble/suffix around JSON array
    if '[' in text and ']' in text:
        start = text.find('[')
        end = text.rfind(']')
        if start != -1 and end != -1 and end > start:
            text = text[start:end+1]
    return text.strip()


def _letter_to_index(letter: str) -> int:
    mapping = {'A': 0, 'B': 1, 'C': 2, 'D': 3}
    return mapping.get(letter.strip()[:1].upper(), -1)


def generate_quiz(
    class_level: str,
    subject: str,
    topic: str,
    difficulty: str,
    num_questions: int = 5
) -> List[Dict[str, str]]:
    """
    Generate quiz questions using AWS Bedrock LLM.

    Args:
        class_level (str): Class grade (e.g., '9', '10', '11', '12')
        subject (str): Subject name (e.g., 'Physics', 'History')
        topic (str): Specific topic name within the subject (e.g., 'Newton’s Laws', 'Photosynthesis')
        difficulty (str): Difficulty level ('easy', 'medium', 'hard')
        num_questions (int): Number of questions to generate

    Returns:
        List[Dict[str, str]]: A list of dictionaries containing quiz data
    """

    prompt = f"""
    You are an expert NCERT quiz generator for classes 9–12.

    Generate {num_questions} multiple-choice questions for class {class_level} in {subject},
    specifically focused on the topic: "{topic}".

    Each question should strictly be based on NCERT content and reflect the {difficulty} difficulty level.

    For every question, include:
      - question: the actual question text
      - options: exactly four options (A, B, C, D)
      - answer: the correct option (A/B/C/D)
      - hint: a short hint to help the student think
      - solution: a descriptive explanation of the answer

    Output ONLY valid JSON array (no extra text), like:
    [
      {{
        "question": "...",
        "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
        "answer": "B",
        "hint": "...",
        "solution": "..."
      }},
      ...
    ]
    """

    try:
        # Prepare payload for Bedrock
        body = json.dumps({
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 1500,
            "temperature": 0.3,
            "messages": [
                {"role": "user", "content": prompt}
            ]
        })

        # Invoke Bedrock LLM
        response = bedrock.invoke_model(
            modelId=BEDROCK_MODEL_ID,
            body=body
        )
        # Read and parse provider response body
        raw_body = response["body"].read()
        result = json.loads(raw_body)

        # Anthropic on Bedrock typically returns { content: [ { text: "..." } ] }
        text_output = (
            result.get("content", [{}])[0].get("text")
            or result.get("output_text")
            or result.get("completion")
            or ""
        ).strip()

        # Normalize text
        text_output = _sanitize_json_text(text_output)

        # Attempt direct JSON parse first
        quiz_data = None
        try:
            quiz_data = json.loads(text_output)
        except Exception:
            # Fallback 1: extract array by regex
            match = re.search(r"\[\s*\{[\s\S]*?\}\s*\]", text_output)
            if match:
                try:
                    quiz_data = json.loads(match.group(0))
                except Exception:
                    quiz_data = None
            # Fallback 2: attempt to fix single quotes to double (risk-aware)
            if quiz_data is None and ('\'' in text_output and '"' not in text_output[:50]):
                try:
                    quiz_data = json.loads(text_output.replace("'", '"'))
                except Exception:
                    quiz_data = None

        if quiz_data is None:
            print("⚠️ Model returned invalid JSON format.")
            return []

        # Basic structure validation and light normalization
        valid_quiz = []
        for q in quiz_data:
            if not isinstance(q, dict):
                continue
            question_text = q.get("question") or q.get("prompt") or ""
            options = q.get("options") or []
            answer = q.get("answer") or q.get("correct") or ""
            hint = q.get("hint") or ""
            solution = q.get("solution") or q.get("explanation") or ""

            # Ensure options are a list of strings with length 4
            if not isinstance(options, list):
                continue
            options = [str(o) for o in options][:4]
            if len(options) != 4:
                continue

            # Normalize answer like "B" or "B) ..." to index 0..3, but we keep original for API
            answer_letter = str(answer)
            answer_idx = _letter_to_index(answer_letter)
            if answer_idx == -1:
                # try to infer by matching option prefix "A)" etc.
                if any(opt.strip().upper().startswith("A)") for opt in options):
                    # leave as-is; frontend maps letters to index
                    pass
                else:
                    # Can't validate, but keep entry
                    pass

            valid_quiz.append({
                "question": str(question_text).strip(),
                "options": options,
                "answer": answer_letter.strip()[:1].upper(),
                "hint": str(hint),
                "solution": str(solution),
            })

        return valid_quiz

    except json.JSONDecodeError:
        print("⚠️ Model returned invalid JSON format.")
        return []

    except Exception as e:
        print(f"❌ Error generating quiz: {e}")
        return []

# Optional: Allow direct run for quick testing
if __name__ == "__main__":
    quiz = generate_quiz(
        class_level="10",
        subject="Physics",
        topic="Laws of Motion",
        difficulty="medium",
        num_questions=3
    )
    for i, q in enumerate(quiz, 1):
        print(f"\nQ{i}. {q['question']}")
        for opt in q["options"]:
            print(opt)
        print("Answer:", q["answer"])
        print("Hint:", q["hint"])
        print("Solution:", q["solution"])
