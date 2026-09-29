from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/exam_db"
    REDIS_URL: str = "redis://localhost:6379"
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    REALTIME_SERVICE_URL: str = "http://realtime_service:8000"

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
