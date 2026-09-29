from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    REDIS_URL: str = "redis://localhost:6379"
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    EXAM_SERVICE_URL: str = "http://localhost:8002"

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
