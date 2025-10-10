import os
import json
import re
from typing import List, Dict, Any
import boto3


AWS_ACCESS_KEY = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
BEDROCK_MODEL_ID = os.getenv("BEDROCK_MODEL_ID", "anthropic.claude-3-sonnet-20240229-v1:0")

bedrock = boto3.client(
    service_name="bedrock-runtime",
    region_name=AWS_REGION,
    aws_access_key_id=AWS_ACCESS_KEY,
    aws_secret_access_key=AWS_SECRET_KEY,
)


def _sanitize_json_text(raw_text: str) -> str:
    if not raw_text:
        return ""
    text = raw_text.strip()
    text = re.sub(r"```[a-zA-Z]*\n", "", text)
    text = text.replace("```", "")
    text = text.replace("“", '"').replace("”", '"').replace("’", "'")
    if '{' in text and '}' in text:
        start = text.find('{')
        end = text.rfind('}')
        if start != -1 and end != -1 and end > start:
            text = text[start:end+1]
    text = re.sub(r",\s*([}\]])", r"\1", text)
    return text.strip()


def generate_recommendations(
    results: List[Dict[str, Any]],
    subject: str,
    topic: str,
    class_level: str | None = None,
    difficulty: str | None = None,
) -> Dict[str, Any]:
    """Call LLM to produce descriptive feedback and learning path.

    Expects each result item to include:
      - question: str
      - options: List[str]
      - correct_index: int (0..3)
      - selected_index: int or None
      - explanation: Optional[str]
    """
    safe_results = []
    for r in (results or []):
        safe_results.append({
            "question": str(r.get("question", "")),
            "options": [str(o) for o in (r.get("options") or [])][:4],
            "correct_index": int(r.get("correct_index", -1)),
            "selected_index": (None if r.get("selected_index") is None else int(r.get("selected_index"))),
            "explanation": str(r.get("explanation", "")),
        })

    # Build compact quiz summary string
    def option_label(i: int) -> str:
        return ["A", "B", "C", "D"][i] if 0 <= i < 4 else "?"

    quiz_lines = []
    for i, item in enumerate(safe_results, 1):
        opts = " | ".join(f"{option_label(idx)}) {opt}" for idx, opt in enumerate(item["options"]))
        quiz_lines.append(
            f"Q{i}: {item['question']}\nOptions: {opts}\nCorrect: {option_label(item['correct_index'])}, Selected: {option_label(item['selected_index']) if item['selected_index'] is not None else 'None'}\n"
        )

    context = (
        f"Subject: {subject}\n"
        f"Topic: {topic}\n"
        f"Class Level: {class_level or 'N/A'}\n"
        f"Difficulty: {difficulty or 'N/A'}\n\n"
        "Here are the quiz details with the learner's answers:\n" + "\n".join(quiz_lines)
    )

    system_prompt = (
        "You are an expert NCERT learning coach. Analyze the learner's answers and produce actionable feedback."
    )
    user_prompt = f"""
Provide a comprehensive analysis in STRICT JSON with the following shape:
{{
  "summary": string,  // one-paragraph overview including overall score and key patterns
  "breakdown": [      // one entry per question with correctness and guidance
    {{
      "question": string,
      "selected": string,         // the selected option text (or "None")
      "correct": string,          // the correct option text
      "is_correct": boolean,
      "explanation": string       // concise reasoning or tip for this question
    }}
  ],
  "learning_path": [  // stepwise plan of what to study/practice next
    string
  ],
  "strong_topics": [string],
  "needs_practice": [string]
}}

Rules:
- Output ONLY valid JSON. Do not include any extra commentary.
- Use the provided options text for "selected" and "correct".
- Keep the plan practical and tailored to the mistakes.

{context}
"""

    body = json.dumps({
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens": 1200,
        "temperature": 0.2,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
    })

    try:
        response = bedrock.invoke_model(modelId=BEDROCK_MODEL_ID, body=body)
        raw_body = response["body"].read()
        result = json.loads(raw_body)
        text_output = (
            result.get("content", [{}])[0].get("text")
            or result.get("output_text")
            or result.get("completion")
            or ""
        )
        text_output = _sanitize_json_text(text_output)
        data = json.loads(text_output)
        # Basic shape guards
        return {
            "summary": str(data.get("summary", "")),
            "breakdown": data.get("breakdown", []),
            "learning_path": data.get("learning_path", []),
            "strong_topics": data.get("strong_topics", []),
            "needs_practice": data.get("needs_practice", []),
        }
    except Exception as e:
        # Fallback: rule-based descriptive analysis so UI always has data
        def extract_skill(question_text: str, subj: str) -> str:
            t = (question_text or "").lower()
            s = (subj or "").lower()
            if s == "mathematics":
                if re.search(r"algebra|linear|equation|polynomial|factor|expression", t):
                    return "Algebra"
                if re.search(r"geometry|triangle|circle|area|perimeter|angle|theorem", t):
                    return "Geometry"
                if re.search(r"trigonometry|sine|cosine|tangent|trig", t):
                    return "Trigonometry"
                if re.search(r"calculus|derivative|integral|limit|differential", t):
                    return "Calculus"
                if re.search(r"statistic|mean|median|mode|probability|data", t):
                    return "Statistics"
                if re.search(r"arithmetic|percentage|ratio|proportion|fraction|integer|number", t):
                    return "Arithmetic"
                return "Mathematics"
            if s == "science":
                if re.search(r"physics|motion|force|energy|newton|electric|current|voltage|light", t):
                    return "Physics"
                if re.search(r"chemistry|reaction|acid|base|salt|compound|molecule|atom", t):
                    return "Chemistry"
                if re.search(r"biology|cell|photosynthesis|organism|ecosystem|genetic", t):
                    return "Biology"
                return "Science"
            if s == "english":
                if re.search(r"grammar|tense|noun|verb|adjective|adverb|preposition", t):
                    return "Grammar"
                if re.search(r"comprehension|passage|infer|author|context", t):
                    return "Comprehension"
                if re.search(r"essay|letter|write|composition|story", t):
                    return "Writing Skills"
                if re.search(r"vocabulary|synonym|antonym|meaning|word", t):
                    return "Vocabulary"
                return "English"
            if s in {"social studies", "social science"}:
                if re.search(r"history|emperor|empire|ancient|medieval|modern", t):
                    return "History"
                if re.search(r"geography|climate|river|mountain|plate|earthquake", t):
                    return "Geography"
                if re.search(r"civics|constitution|rights|duties|parliament|democracy", t):
                    return "Civics"
                if re.search(r"economics|demand|supply|market|gdp|inflation", t):
                    return "Economics"
                return "Social Studies"
            return subj or "General"

        total = len(safe_results)
        correct = 0
        counters: Dict[str, Dict[str, int]] = {}
        breakdown = []
        for r in safe_results:
            is_c = (r["selected_index"] is not None and r["selected_index"] == r["correct_index"])
            if is_c:
                correct += 1
            sel_text = (r["options"][r["selected_index"]] if r["selected_index"] is not None and 0 <= r["selected_index"] < len(r["options"]) else "None")
            cor_text = (r["options"][r["correct_index"]] if 0 <= r["correct_index"] < len(r["options"]) else "")
            breakdown.append({
                "question": r["question"],
                "selected": sel_text,
                "correct": cor_text,
                "is_correct": is_c,
                "explanation": r.get("explanation", ""),
            })
            skill = extract_skill(r["question"], subject)
            if skill not in counters:
                counters[skill] = {"correct": 0, "total": 0}
            counters[skill]["total"] += 1
            if is_c:
                counters[skill]["correct"] += 1

        pct = int(round(100 * correct / max(1, total)))
        # Determine topics
        strengths, weaknesses = [], []
        for skill, agg in counters.items():
            acc = agg["correct"] / max(1, agg["total"])
            if acc >= 0.75 and agg["total"] >= 2:
                strengths.append(skill)
            elif acc <= 0.5 or agg["total"] == 1:
                weaknesses.append(skill)

        # Construct a simple learning path
        learning_path = []
        if weaknesses:
            learning_path.append(f"Review fundamentals in: {', '.join(weaknesses)} (class notes/NCERT).")
            learning_path.append("Redo similar practice questions focusing on mistakes above.")
        learning_path.append("Summarize key formulas/ideas you missed; create 5 flashcards.")
        if strengths:
            learning_path.append(f"Reinforce strengths: {', '.join(strengths)} with 3 challenge problems.")

        return {
            "summary": f"You answered {correct}/{total} correctly ({pct}%). Focus on {', '.join(weaknesses) if weaknesses else 'weaker areas'} and reinforce {', '.join(strengths) if strengths else 'strengths'}.",
            "breakdown": breakdown,
            "learning_path": learning_path,
            "strong_topics": strengths,
            "needs_practice": weaknesses,
        }


