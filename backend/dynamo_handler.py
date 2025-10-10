# dynamo_handler.py
import os
import boto3
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
AWS_ACCESS_KEY = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
DYNAMO_TABLE_NAME = os.getenv("DYNAMO_TABLE_NAME")

dynamodb = boto3.resource(
    "dynamodb",
    region_name=AWS_REGION,
    aws_access_key_id=AWS_ACCESS_KEY,
    aws_secret_access_key=AWS_SECRET_KEY
)

table = dynamodb.Table(DYNAMO_TABLE_NAME)

def save_chat_to_dynamo(session_id: str, user_message: str, bot_response: str, attachment_url: str = None):
    """Saves a chat interaction to DynamoDB."""
    timestamp = datetime.utcnow().isoformat()

    item = {
        "session_id": session_id,
        "timestamp": timestamp,
        "user_message": user_message,
        "bot_response": bot_response,
    }

    if attachment_url:
        item["attachment_url"] = attachment_url

    try:
        table.put_item(Item=item)
        print(f"✅ Saved chat for {session_id} at {timestamp}")
    except Exception as e:
        print(f"❌ Failed to save chat: {e}")


def get_chat_history(session_id: str):
    """Fetches previous chat history for a given session."""
    try:
        response = table.query(
            KeyConditionExpression=boto3.dynamodb.conditions.Key("session_id").eq(session_id)
        )
        return response.get("Items", [])
    except Exception as e:
        print(f"❌ Failed to fetch history: {e}")
        return []
