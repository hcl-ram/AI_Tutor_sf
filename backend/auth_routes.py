import os
import uuid
import boto3
from datetime import datetime, timedelta
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from typing import Literal
import bcrypt
from jose import jwt


AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret-change-me")
JWT_ALG = os.getenv("JWT_ALG", "HS256")
JWT_EXPIRE_MIN = int(os.getenv("JWT_EXPIRE_MIN", "60"))


session = boto3.Session(region_name=AWS_REGION)
dynamodb = session.resource("dynamodb", region_name=AWS_REGION)
students_table = dynamodb.Table("Students")
teachers_table = dynamodb.Table("Teachers")


app = FastAPI(title="Auth Service")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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


@app.post("/student/signup")
def student_signup(req: SignupRequest):
    if email_exists(students_table, req.email):
        raise HTTPException(status_code=409, detail="Email already exists")
    user = put_user(students_table, req.name, req.email, req.password, "student")
    token = generate_token(req.email, "student", req.name, user["id"]) 
    return {"ok": True, "token": token, "user": {"id": user["id"], "name": user["name"], "email": user["email"], "role": "student"}}


@app.post("/student/login")
def student_login(req: LoginRequest):
    user = verify_user(students_table, req.email, req.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = generate_token(user["email"], "student", user.get("name", ""), user.get("id", ""))
    return {"ok": True, "token": token, "user": {"id": user.get("id", ""), "name": user.get("name", ""), "email": user["email"], "role": "student"}}


@app.post("/teacher/signup")
def teacher_signup(req: SignupRequest):
    if email_exists(teachers_table, req.email):
        raise HTTPException(status_code=409, detail="Email already exists")
    user = put_user(teachers_table, req.name, req.email, req.password, "teacher")
    token = generate_token(req.email, "teacher", req.name, user["id"]) 
    return {"ok": True, "token": token, "user": {"id": user["id"], "name": user["name"], "email": user["email"], "role": "teacher"}}


@app.post("/teacher/login")
def teacher_login(req: LoginRequest):
    user = verify_user(teachers_table, req.email, req.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = generate_token(user["email"], "teacher", user.get("name", ""), user.get("id", ""))
    return {"ok": True, "token": token, "user": {"id": user.get("id", ""), "name": user.get("name", ""), "email": user["email"], "role": "teacher"}}


@app.get("/health")
def health():
    return {"ok": True}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", "8001")))


