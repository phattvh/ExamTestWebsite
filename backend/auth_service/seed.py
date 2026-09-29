"""Seed the database with an admin account and demo teacher/student users.

Usage (inside Docker):  docker compose exec auth_service python seed.py
Locally with SQLite:    DATABASE_URL=sqlite+aiosqlite:///./dev.db python seed.py
Idempotent: existing usernames are left untouched.
"""
import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

import auth
import models
import database
from database import Base, init_engine


USERS = [
    ("admin", "admin@vjp.local", "Admin@12345", "Quản trị viên VJP Pro", "admin"),
    ("teacher01", "teacher01@vjp.local", "Teacher@12345", "GV Nguyễn Thị A", "teacher"),
    ("student01", "student01@vjp.local", "Student@12345", "HS Trần Văn B", "student"),
    ("student02", "student02@vjp.local", "Student@12345", "HS Lê Văn C", "student"),
]


async def main() -> None:
    engine = init_engine()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with database.async_session_maker() as session:
        created = []
        for username, email, password, full_name, role in USERS:
            exists = await session.execute(
                select(models.User).where(models.User.username == username)
            )
            if exists.scalars().first():
                continue
            session.add(
                models.User(
                    username=username,
                    email=email,
                    full_name=full_name,
                    role=role,
                    hashed_password=auth.get_password_hash(password),
                )
            )
            created.append(f"{username} ({role})")
        try:
            await session.commit()
        except IntegrityError:
            await session.rollback()
            print("Some users already existed; nothing to do.")
            return
        if created:
            print("Seeded users:")
            for c in created:
                print(f"  - {c}")
        else:
            print("Database already seeded.")
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
