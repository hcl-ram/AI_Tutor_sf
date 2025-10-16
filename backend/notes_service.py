# notes_service.py
import os
import boto3
import uuid
import datetime
from botocore.exceptions import ClientError
from dotenv import load_dotenv
import json

load_dotenv()

# ---------- DynamoDB Setup ----------
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
dynamodb = boto3.resource("dynamodb", region_name=AWS_REGION)
table_name = os.getenv("DYNAMO_TABLE_NAME_USER_NOTES")

# ---------- LLM Call (Amazon Bedrock Example) ----------
def refine_note_with_llm(raw_text: str) -> str:
    """
    Use Amazon Bedrock LLM to enhance and structure the note.
    """
    prompt = f"""
    Refine the following note into well-structured, concise, and meaningful text.
    Improve clarity and formatting:
    {raw_text}
    """

    bedrock = boto3.client(
        service_name="bedrock-runtime",
        region_name=os.getenv("AWS_REGION", "us-east-1"),
        aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
        aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY")
    )

    model_id = os.getenv("BEDROCK_MODEL_ID")
    if not model_id:
        raise ValueError("❌ BEDROCK_MODEL_ID not set in .env")

    payload = {
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens": 300,
        "messages": [
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": prompt
                    }
                ]
            }
        ]
    }

    response = bedrock.invoke_model(
        modelId=model_id,
        body=json.dumps(payload)
    )

    result = json.loads(response["body"].read())
    refined_text = result["content"][0]["text"]

    # 🧹 Remove unwanted prefixes (like “Here’s...”)
    unwanted_prefixes = [
        "Here's a refined version:",
        "Here's the refined version:",
        "Here's a refined and structured version of the note:",
        "Here’s a refined version:",
        "Here’s the refined version:",
        "Here’s a refined and structured version of the note:",
        "Refined version:",
        "Refined note:",
        "Here's a refined version of the note:",
        "Here's a refined and well-structured version of the note:"
    ]

    for prefix in unwanted_prefixes:
        if refined_text.strip().startswith(prefix):
            refined_text = refined_text.strip()[len(prefix):].strip()
            break

    return refined_text.strip()



# ---------- Main Function ----------
def save_refined_note(user_id: str, raw_text: str) -> dict:
    """
    Generate refined note via LLM and store in DynamoDB.
    """
    refined_note = refine_note_with_llm(raw_text)

    note_id = str(uuid.uuid4())
    timestamp = datetime.datetime.utcnow().isoformat()

    table = dynamodb.Table(table_name)
    item = {
        "user_id": user_id,
        "note_id": note_id,
        "raw_text": raw_text,
        "refined_text": refined_note,
        "created_at": timestamp
    }

    table.put_item(Item=item)
    print("✅ Note saved successfully!")
    return item

if __name__ == "__main__":
    # ---------- Configuration ----------
    TEST_USER_ID = "test_user_1"
    TEST_NOTE = "Remembe,r you have the morning badminton practice and then you havve to complete the assignment of physics and chemistry. Also, prepare for the upcoming quiz."

    print("🚀 Running standalone test for note creation...")

    try:
        result = save_refined_note(TEST_USER_ID, TEST_NOTE)
        print("✅ Note saved successfully!")
        print("Saved Item:")
        print(result)
    except Exception as e:
        print("❌ Error while saving note:", e)
