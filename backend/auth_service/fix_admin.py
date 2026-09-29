import asyncio
from database import engine, Base
from models import User
import auth
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import sessionmaker

async_session = sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)

async def fix_admin():
    async with async_session() as session:
        query = select(User).where(User.username == 'admin')
        result = await session.execute(query)
        user = result.scalars().first()
        if user:
            user.hashed_password = auth.get_password_hash('admin')
            await session.commit()
            print("Admin password fixed")

asyncio.run(fix_admin())
