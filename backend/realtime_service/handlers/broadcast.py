async def handle_broadcast(sio, exam_id: str, event: str, data: dict):
    """
    Handles messages received from Redis PubSub and broadcasts them
    to the appropriate Socket.IO room (exam_id).
    """
    await sio.emit(event, data, room=exam_id)
