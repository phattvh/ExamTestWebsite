import json
import asyncio
from typing import Callable, Coroutine, Any
from services.redis_client import redis_client

class PubSubManager:
    def __init__(self):
        self.subscribed_channels = set()
        self.broadcast_callback = None
        
    def set_callback(self, callback: Callable[[str, str, Any], Coroutine]):
        self.broadcast_callback = callback

    async def subscribe_to_exam(self, exam_id: str):
        channel = f"exam:{exam_id}:broadcast"
        if channel not in self.subscribed_channels:
            client = await redis_client.get_client()
            pubsub = client.pubsub()
            await pubsub.subscribe(channel)
            self.subscribed_channels.add(channel)
            asyncio.create_task(self._listen(pubsub, exam_id))

    async def _listen(self, pubsub, exam_id: str):
        try:
            async for message in pubsub.listen():
                if message['type'] == 'message':
                    data = json.loads(message['data'])
                    if self.broadcast_callback:
                        await self.broadcast_callback(exam_id, data['event'], data['data'])
        except Exception as e:
            print(f"PubSub Error for {exam_id}: {e}")

    async def publish(self, exam_id: str, event: str, data: dict):
        channel = f"exam:{exam_id}:broadcast"
        client = await redis_client.get_client()
        message = json.dumps({"event": event, "data": data, "exam_id": exam_id})
        await client.publish(channel, message)

pubsub_manager = PubSubManager()
