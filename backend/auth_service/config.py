import os
from dotenv import load_dotenv

# Load .env from the project root (two levels up) so local runs pick it up,
# while in Docker the variables come from env_file / environment.
load_dotenv()

DB_USER = os.getenv("POSTGRES_USER", "postgres")
DB_PASS = os.getenv("POSTGRES_PASSWORD", "postgres")
DB_HOST = os.getenv("POSTGRES_HOST", "postgres")
DB_PORT = os.getenv("POSTGRES_PORT", "5432")
DB_NAME = os.getenv("POSTGRES_DB", "exam_db")

TESTING = os.getenv("TESTING", "False") == "True"

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    f"postgresql+asyncpg://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}",
)

SQL_ECHO = os.getenv("SQL_ECHO", "False") == "True"

SECRET_KEY = os.getenv("JWT_SECRET", "supersecretkey")
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))

_raw_origins = os.getenv("CORS_ORIGINS", '["http://localhost:3000"]')
if _raw_origins.strip().startswith("["):
    import json

    CORS_ORIGINS = json.loads(_raw_origins)
else:
    CORS_ORIGINS = [o.strip() for o in _raw_origins.split(",") if o.strip()]
