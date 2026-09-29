import redis.asyncio as redis
import json
from fastapi.encoders import jsonable_encoder

class CacheService:
    def __init__(self, redis_url: str):
        self.redis = redis.from_url(redis_url)

    async def get(self, key: str):
        val = await self.redis.get(key)
        if val is None:
            return None
        return val.decode('utf-8') if isinstance(val, bytes) else str(val)

    async def set(self, key: str, value: str, ttl: int = 86400):
        await self.redis.setex(key, ttl, str(value))

    async def get_or_set(self, key: str, func, ttl: int = 300):
        cached = await self.redis.get(key)
        if cached:
            return json.loads(cached)
        
        data = await func()
        serialized = json.dumps(jsonable_encoder(data))
        await self.redis.setex(key, ttl, serialized)
        return data

    async def invalidate(self, *keys: str):
        if keys:
            await self.redis.delete(*keys)

    async def invalidate_pattern(self, pattern: str):
        keys = await self.redis.keys(pattern)
        if keys:
            await self.redis.delete(*keys)
