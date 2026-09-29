import os
import json
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from config import settings
from database import connect_to_mongo, close_mongo_connection
from routes import questions, categories, import_export, snapshots

@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_to_mongo()
    yield
    await close_mongo_connection()

app = FastAPI(title="Question Service API", lifespan=lifespan)

# Setup CORS
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

app.include_router(questions.router, prefix="/api/v1/questions", tags=["questions"])
app.include_router(categories.router, prefix="/api/v1/categories", tags=["categories"])
app.include_router(import_export.router, prefix="/api/v1/questions", tags=["import_export"])
app.include_router(snapshots.router, prefix="/api/v1/snapshots", tags=["snapshots"])

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "question_service"}
