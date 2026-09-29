from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import grading, statistics, results
from contextlib import asynccontextmanager
from database import engine
import models
import os
import json

@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(models.Base.metadata.create_all)
    yield

app = FastAPI(title="Grading Service API", lifespan=lifespan)

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

app.include_router(grading.router)
app.include_router(statistics.router)
app.include_router(results.router)

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
