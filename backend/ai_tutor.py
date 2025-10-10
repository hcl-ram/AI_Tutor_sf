# ai_tutor.py
import os
import json
import boto3
from dotenv import load_dotenv
from s3_handler import upload_file_to_s3
from dynamo_handler import save_chat_to_dynamo

load_dotenv()

AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
AWS_ACCESS_KEY = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
BEDROCK_MODEL_ID = os.getenv("BEDROCK_MODEL_ID", "anthropic.claude-3-sonnet-20240229-v1:0")

bedrock = boto3.client(
    "bedrock-runtime",
    region_name=AWS_REGION,
    aws_access_key_id=AWS_ACCESS_KEY,
    aws_secret_access_key=AWS_SECRET_KEY
)

def process_user_query(user_id: str, user_message: str, attachment_path: str = None) -> str:
    """Processes user input: uploads attachment, generates AI response, saves chat."""
    print(f"🧠 Processing query for user: {user_id}")

    # Step 1: Upload attachment (if any)
    attachment_url = None
    if attachment_path:
        attachment_url = upload_file_to_s3(attachment_path, user_id)

    # Step 2: Build the prompt for LLM
    context_prompt = f"""
    You are an intelligent NCERT-based AI Tutor.
    Answer the user's query clearly and descriptively.
    If an attachment is provided, use it as a reference when possible.

    User query: "{user_message}"
    Attachment URL (if any): {attachment_url or 'None'}

    Format the response as plain text.
    """

    # Step 3: Call Bedrock LLM
    try:
        body = json.dumps({
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 800,
            "temperature": 0.7,
            "messages": [
                {"role": "user", "content": context_prompt}
            ]
        })

        response = bedrock.invoke_model(
            modelId=BEDROCK_MODEL_ID,
            body=body
        )

        result = json.loads(response["body"].read())
        answer = result.get("content", [{}])[0].get("text", "").strip()

        # Step 4: Save chat to DynamoDB
        save_chat_to_dynamo(user_id, user_message, answer, attachment_url)

        print("✅ AI Tutor response generated.")
        return answer

    except Exception as e:
        print(f"❌ Bedrock call failed: {e}")
        return "Sorry, I encountered an issue while processing your query."
