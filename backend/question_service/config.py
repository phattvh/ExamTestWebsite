import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    MONGODB_URL: str = os.getenv("MONGO_URI", "mongodb://mongodb:27017")
    DATABASE_NAME: str = os.getenv("DATABASE_NAME", "exam_questions")
    JWT_SECRET: str
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    CORS_ORIGINS: str = os.getenv("CORS_ORIGINS", '["*"]')

    class Config:
        extra = "ignore"

settings = Settings()
