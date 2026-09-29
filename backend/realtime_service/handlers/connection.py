from urllib.parse import parse_qs
from dependencies import validate_token
from services.redis_client import redis_client

def register_connection_handlers(sio):
    @sio.event
    async def connect(sid, environ):
        query_string = environ.get('QUERY_STRING', '')
        query_params = parse_qs(query_string)
        token = query_params.get('token', [None])[0]
        
        if not token:
            print(f"Connection rejected for {sid}: missing token")
            return False
            
        try:
            user = validate_token(token)
            
            client_ip = environ.get('HTTP_X_REAL_IP') or environ.get('HTTP_X_FORWARDED_FOR') or environ.get('REMOTE_ADDR', '127.0.0.1')
            if client_ip and ',' in client_ip:
                client_ip = client_ip.split(',')[0].strip()

            # Save user session details in socketio session
            await sio.save_session(sid, {
                'user_id': user['id'],
                'username': user.get('username') or '',
                'full_name': user.get('full_name') or '',
                'role': user.get('role'),
                'token': token,
                'client_ip': client_ip or '127.0.0.1'
            })
            
            print(f"Client {sid} connected with user_id: {user['id']}")
            return True
        except ValueError as e:
            print(f"Connection rejected for {sid}: {e}")
            return False

    @sio.event
    async def disconnect(sid):
        session = await sio.get_session(sid)
        if session:
            exam_id = session.get('exam_id')
            user_id = session.get('user_id')
            print(f"Client {sid} (user_id: {user_id}) disconnected")
            
            if exam_id and user_id:
                # Remove user from active room count if needed
                client = await redis_client.get_client()
                await client.srem(f"exam:room:{exam_id}:clients", user_id)
                await client.delete(f"exam:room:{exam_id}:sid:{user_id}")
                # Emit to proctor room
                await sio.emit("proctor:student_left", {"exam_id": exam_id, "user_id": user_id}, room=f"proctor:{exam_id}")
        else:
            print(f"Client {sid} disconnected")
