import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

os.environ["TESTING"] = "True"
# Use in-memory SQLite for unit tests (no PostgreSQL required).
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///:memory:"

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.pool import StaticPool

import database
from database import Base, get_db
from main import app

test_engine = None


def _make_test_engine():
    from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
    from sqlalchemy.orm import sessionmaker

    eng = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        poolclass=StaticPool,
        connect_args={"check_same_thread": False},
    )
    return eng, sessionmaker(bind=eng, class_=AsyncSession, expire_on_commit=False)


async def override_get_db():
    _, session_maker = _get_sessions()
    async with session_maker() as session:
        yield session


_session_cache = {}


def _get_sessions():
    global test_engine
    if test_engine is None:
        test_engine, maker = _make_test_engine()
        _session_cache["maker"] = maker
    return test_engine, _session_cache["maker"]


def get_test_session_maker():
    _, maker = _get_sessions()
    return maker


app.dependency_overrides[get_db] = override_get_db


@pytest_asyncio.fixture(autouse=True)
async def init_db():
    engine_obj, _ = _get_sessions()
    async with engine_obj.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine_obj.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def async_client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
