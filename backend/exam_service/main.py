from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import exams, questions, schedules, assignments
from contextlib import asynccontextmanager
from database import engine
import models
import os
import json

@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(models.Base.metadata.create_all)
        from sqlalchemy import text
        try:
            await conn.execute(text("ALTER TABLE exams ADD COLUMN IF NOT EXISTS enable_proctoring BOOLEAN DEFAULT TRUE;"))
            await conn.execute(text("ALTER TABLE exams ADD COLUMN IF NOT EXISTS access_password VARCHAR(255);"))
        except Exception:
            pass
    yield

app = FastAPI(title="Exam Service API", lifespan=lifespan)

origins_str = os.getenv("CORS_ORIGINS", '["http://localhost:3000", "http://localhost:5173"]')
try:
    origins = json.loads(origins_str)
except Exception:
    origins = []
if "http://localhost:5173" not in origins:
    origins.append("http://localhost:5173")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(exams.router)
app.include_router(questions.router)
app.include_router(schedules.router)
app.include_router(assignments.router)

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
