import redis.asyncio as redis
import json
from fastapi.encoders import jsonable_encoder

class CacheService:
    def __init__(self, redis_url: str):
        self.redis = redis.from_url(redis_url)

    async def get_or_set(self, key: str, func, ttl: int = 300):
        cached = await self.redis.get(key)
        if cached:
            return json.loads(cached)
        
        data = await func()
        serialized = json.dumps(jsonable_encoder(data))
        await self.redis.setex(key, ttl, serialized)
        return data
