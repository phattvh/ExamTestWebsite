import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import declarative_base, sessionmaker

Base = declarative_base()

# The engine is created lazily so importing the app (e.g. for unit tests
# backed by in-memory SQLite) does not require PostgreSQL drivers/network.
engine = None
async_session_maker = None


def init_engine(database_url: str | None = None):
    global engine, async_session_maker
    if engine is None:
        from config import DATABASE_URL, SQL_ECHO

        engine = create_async_engine(database_url or DATABASE_URL, echo=SQL_ECHO)
        async_session_maker = sessionmaker(
            bind=engine, class_=AsyncSession, expire_on_commit=False
        )
    return engine


async def get_db():
    init_engine()
    async with async_session_maker() as session:
        yield session


# Initialize for normal runtime so scripts (create_admin.py, etc.) have valid engine/sessionmaker
if os.getenv("TESTING") != "True":
    try:
        init_engine()
    except Exception:
        pass
