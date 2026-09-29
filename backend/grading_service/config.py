from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/exam_db"
    REDIS_URL: str = "redis://localhost:6379"
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    EXAM_SERVICE_URL: str = "http://localhost:8002"
    QUESTION_SERVICE_URL: str = "http://localhost:8001"

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
