import boto3
import os
import time


def create_table(dynamodb, table_name: str):
    existing = dynamodb.meta.client.list_tables().get("TableNames", [])
    if table_name in existing:
        print(f"Table '{table_name}' already exists. Skipping creation.")
        return

    print(f"Creating table '{table_name}' ...")
    dynamodb.create_table(
        TableName=table_name,
        KeySchema=[{"AttributeName": "email", "KeyType": "HASH"}],
        AttributeDefinitions=[{"AttributeName": "email", "AttributeType": "S"}],
        BillingMode="PAY_PER_REQUEST",
        Tags=[{"Key": "Project", "Value": "AI_Tutor_sf"}],
    )

    waiter = dynamodb.meta.client.get_waiter("table_exists")
    waiter.wait(TableName=table_name)
    # Extra small delay to ensure ACTIVE
    while True:
        desc = dynamodb.meta.client.describe_table(TableName=table_name)["Table"]
        if desc.get("TableStatus") == "ACTIVE":
            break
        time.sleep(1)
    print(f"✅ Table '{table_name}' is ACTIVE.")


if __name__ == "__main__":
    region = os.getenv("AWS_REGION", "us-east-1")
    session = boto3.Session(region_name=region)
    dynamodb = session.resource("dynamodb", region_name=region)

    # Create Students and Teachers tables with primary key: email (S)
    create_table(dynamodb, "Students")
    create_table(dynamodb, "Teachers")

    print("All requested tables ensured.")


