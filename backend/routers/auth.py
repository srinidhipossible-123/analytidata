import os
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel
from models.mongo import get_db
from dotenv import load_dotenv
from bson import ObjectId

load_dotenv()

SECRET_KEY  = os.getenv("SECRET_KEY", "changeme")
ALGORITHM   = os.getenv("ALGORITHM", "HS256")
EXPIRE_MIN  = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 1440))

router = APIRouter()
pwd_context   = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

VALID_ROLES = {"admin", "teacher", "mentor"}


# ── Pydantic models ──────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    username: str
    email: str
    password: str
    role: str = "teacher"   # admin | teacher | mentor


class Token(BaseModel):
    access_token: str
    token_type: str
    username: str
    role: str


class PasswordChange(BaseModel):
    new_password: str


# ── Helpers ──────────────────────────────────────────────────────────────────

def hash_password(p: str) -> str:
    return pwd_context.hash(p)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=EXPIRE_MIN))
    to_encode["exp"] = expire
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


# ── Auth dependencies ────────────────────────────────────────────────────────

async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exc
    except JWTError:
        raise credentials_exc

    db = get_db()
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if user is None:
        raise credentials_exc
    return user


async def require_admin(current_user=Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


# ── Seed default admin ────────────────────────────────────────────────────────

async def seed_admin():
    """Create a default admin account if no admin exists yet."""
    db = get_db()
    existing = await db.users.find_one({"role": "admin"})
    if not existing:
        doc = {
            "username":        "Admin",
            "email":           "admin@datalens.edu",
            "hashed_password": hash_password("admin@123"),
            "role":            "admin",
            "created_at":      datetime.utcnow(),
        }
        await db.users.insert_one(doc)
        print("[SEED] Default admin created → email: admin@datalens.edu | password: admin@123")


# ── Auth endpoints ────────────────────────────────────────────────────────────

@router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    db   = get_db()
    user = await db.users.find_one({"email": form_data.username})
    if not user or not verify_password(form_data.password, user["hashed_password"]):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    token = create_token({"sub": str(user["_id"]), "role": user.get("role", "teacher")})
    return {
        "access_token": token,
        "token_type":   "bearer",
        "username":     user["username"],
        "role":         user.get("role", "teacher"),
    }


@router.get("/me")
async def me(current_user=Depends(get_current_user)):
    return {
        "username": current_user["username"],
        "email":    current_user["email"],
        "role":     current_user.get("role", "teacher"),
    }


# ── Admin: user management ────────────────────────────────────────────────────

@router.get("/admin/users")
async def list_users(admin=Depends(require_admin)):
    db     = get_db()
    cursor = db.users.find({"role": {"$in": ["teacher", "mentor"]}}).sort("created_at", -1)
    users  = []
    async for u in cursor:
        users.append({
            "id":         str(u["_id"]),
            "username":   u["username"],
            "email":      u["email"],
            "role":       u.get("role", "teacher"),
            "created_at": str(u.get("created_at", "")),
        })
    return users


@router.post("/admin/users", status_code=201)
async def create_user(user_in: UserCreate, admin=Depends(require_admin)):
    if user_in.role not in ("teacher", "mentor"):
        raise HTTPException(status_code=400, detail="Role must be teacher or mentor")
    db = get_db()
    if await db.users.find_one({"email": user_in.email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    doc = {
        "username":        user_in.username,
        "email":           user_in.email,
        "hashed_password": hash_password(user_in.password),
        "role":            user_in.role,
        "created_at":      datetime.utcnow(),
    }
    result = await db.users.insert_one(doc)
    return {"id": str(result.inserted_id), "username": user_in.username, "role": user_in.role}


@router.put("/admin/users/{user_id}/password")
async def reset_password(user_id: str, body: PasswordChange, admin=Depends(require_admin)):
    db  = get_db()
    res = await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"hashed_password": hash_password(body.new_password)}}
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "Password updated"}


@router.delete("/admin/users/{user_id}")
async def delete_user(user_id: str, admin=Depends(require_admin)):
    db  = get_db()
    res = await db.users.delete_one({"_id": ObjectId(user_id), "role": {"$ne": "admin"}})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found or cannot delete admin")
    return {"message": "User deleted"}
