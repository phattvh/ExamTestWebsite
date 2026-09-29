import asyncio, sys
sys.path.append('/app')
from database import engine
from sqlalchemy import text
async def main():
  async with engine.begin() as conn:
    await conn.execute(text('UPDATE exams SET is_public = true;'))
asyncio.run(main())
