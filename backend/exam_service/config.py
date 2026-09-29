import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    QUESTION_SERVICE_URL: str = "http://question_service:8000"
    GRADING_SERVICE_URL: str = "http://grading_service:8000"

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
