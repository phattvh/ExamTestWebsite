import redis.asyncio as redis
from config import settings

class RedisClient:
    def __init__(self):
        self.pool = redis.ConnectionPool.from_url(settings.REDIS_URL, decode_responses=True)
        self.client = redis.Redis(connection_pool=self.pool)

    async def get_client(self):
        return self.client

    async def close(self):
        await self.client.aclose()
        await self.pool.disconnect()

redis_client = RedisClient()
