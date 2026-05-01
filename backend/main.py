import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from models.mongo import connect_db, close_db
from routers import auth, upload, analysis, charts, custom, export, insights
from routers import admin as admin_router
from routers import teacher as teacher_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_db()
    from routers.auth import seed_admin
    await seed_admin()
    yield
    await close_db()


app = FastAPI(title="AnalytiData — Student Analytics", version="2.0.0", lifespan=lifespan)

# ── CORS ─────────────────────────────────────────────────────────────────────
# Build allowed origins from env vars — filter empty strings so an unset
# FRONTEND_URL doesn't add a blank entry that breaks CORS.
_extra_origins = [
    o.strip()
    for o in os.getenv("FRONTEND_URL", "").split(",")
    if o.strip()
]

ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
] + _extra_origins

print(f"[CORS] Allowed origins: {ALLOWED_ORIGINS}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = os.getenv("UPLOAD_DIR", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Existing routers
app.include_router(auth.router,     prefix="/api/auth", tags=["auth"])
app.include_router(upload.router,   prefix="/api",      tags=["upload"])
app.include_router(analysis.router, prefix="/api",      tags=["analysis"])
app.include_router(charts.router,   prefix="/api",      tags=["charts"])
app.include_router(custom.router,   prefix="/api",      tags=["custom"])
app.include_router(export.router,   prefix="/api",      tags=["export"])
app.include_router(insights.router, prefix="/api",      tags=["insights"])

# Student analytics routers
app.include_router(admin_router.router,   prefix="/api", tags=["admin"])
app.include_router(teacher_router.router, prefix="/api", tags=["teacher"])


@app.get("/")
async def root():
    return {"message": "AnalytiData Student Analytics API v2"}


@app.get("/api/health")
async def health():
    return {"status": "ok"}
