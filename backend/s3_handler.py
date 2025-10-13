# s3_handler.py
import os
import boto3
from dotenv import load_dotenv

load_dotenv()

AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
AWS_ACCESS_KEY = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
S3_BUCKET_NAME = os.getenv("S3_BUCKET_NAME")

s3 = boto3.client(
    "s3",
    region_name=AWS_REGION,
    aws_access_key_id=AWS_ACCESS_KEY,
    aws_secret_access_key=AWS_SECRET_KEY
)

def upload_file_to_s3(file_path: str, user_id: str) -> str:
    """Uploads a file to S3 and returns its public URL."""
    if not file_path or not os.path.exists(file_path):
        return None

    file_name = os.path.basename(file_path)
    s3_key = f"{user_id}/{file_name}"

    try:
        s3.upload_file(file_path, S3_BUCKET_NAME, s3_key)
        file_url = f"https://{S3_BUCKET_NAME}.s3.{AWS_REGION}.amazonaws.com/{s3_key}"
        print(f"✅ Uploaded {file_name} to S3: {file_url}")
        return file_url
    except Exception as e:
        print(f"❌ Failed to upload file: {e}")
        return None


def upload_bytes_to_s3(file_bytes: bytes, user_id: str, file_name: str) -> str:
    """Uploads bytes to S3 and returns the S3 key (not public URL)."""
    if not file_bytes or not file_name or not user_id:
        return None

    s3_key = f"{user_id}/{file_name}"
    try:
        s3.put_object(Bucket=S3_BUCKET_NAME, Key=s3_key, Body=file_bytes)
        print(f"✅ Uploaded bytes to S3: s3://{S3_BUCKET_NAME}/{s3_key}")
        return s3_key
    except Exception as e:
        print(f"❌ Failed to upload bytes: {e}")
        return None