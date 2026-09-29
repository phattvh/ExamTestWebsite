from motor.motor_asyncio import AsyncIOMotorClient
from config import settings

class Database:
    client: AsyncIOMotorClient = None
    db = None

db_instance = Database()

async def connect_to_mongo():
    db_instance.client = AsyncIOMotorClient(settings.MONGODB_URL)
    db_instance.db = db_instance.client[settings.DATABASE_NAME]
    await init_indexes()

async def close_mongo_connection():
    if db_instance.client:
        db_instance.client.close()

async def init_indexes():
    if db_instance.db is not None:
        questions_collection = db_instance.db["questions"]
        await questions_collection.create_index("metadata.subject")
        await questions_collection.create_index("metadata.difficulty")
        await questions_collection.create_index("type")
        await questions_collection.create_index([("metadata.subject", 1), ("metadata.difficulty", -1)])

def get_db():
    return db_instance.db
