import asyncio
from database import async_session_maker
from models import User
import auth

async def create_admin():
    async with async_session_maker() as session:
        from sqlalchemy.future import select
        query = select(User).where(User.username == "admin")
        result = await session.execute(query)
        if result.scalars().first():
            print("Admin already exists")
            return
            
        user = User(
            username="admin",
            email="admin@example.com",
            full_name="System Admin",
            role="admin",
            hashed_password=auth.get_password_hash("admin123")
        )
        session.add(user)
        await session.commit()
        print("Admin user created with username 'admin' and password 'admin123'")

if __name__ == "__main__":
    asyncio.run(create_admin())
