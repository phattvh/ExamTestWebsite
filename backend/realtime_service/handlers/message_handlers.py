import uuid
from datetime import datetime, timezone
from services.session_manager import session_manager
from services.exam_client import exam_client
from services.pubsub_manager import pubsub_manager
from services.redis_client import redis_client

def register_message_handlers(sio):
    @sio.event
    async def join_exam(sid, data):
        session = await sio.get_session(sid)
        user_id = session['user_id']
        token = session.get('token')
        role = session.get('role')
        
        exam_id = data.get('exam_id')
        session_id = data.get('session_id')

        if not exam_id:
            await sio.emit('error', {'code': 400, 'message': 'exam_id is required'}, room=sid)
            return

        # Join Socket.IO rooms
        await sio.enter_room(sid, exam_id)
        await sio.enter_room(sid, f"exam:{exam_id}")
        await sio.enter_room(sid, f"user:{user_id}")
        await sio.enter_room(sid, f"exam:{exam_id}:user:{user_id}")
        
        client_ip = session.get('client_ip', '127.0.0.1')
        username = session.get('username', '')
        full_name = session.get('full_name', '')
        
        # Keep track of exam_id in socket session for disconnect cleanup.
        await sio.save_session(sid, {
            'user_id': user_id,
            'exam_id': exam_id,
            'token': token,
            'role': role,
            'username': username,
            'full_name': full_name,
            'client_ip': client_ip
        })

        # Add user to Redis set
        client = await redis_client.get_client()
        await client.sadd(f"exam:room:{exam_id}:clients", user_id)
        await client.set(f"exam:room:{exam_id}:sid:{user_id}", sid, ex=3600)
        
        # Save student display info in Redis
        import json
        student_info = {
            "user_id": user_id,
            "username": username,
            "full_name": full_name,
            "ip": client_ip
        }
        await client.set(f"exam:room:{exam_id}:student_info:{user_id}", json.dumps(student_info), ex=7200)
        
        # Notify proctor
        await sio.emit("proctor:student_joined", {
            "exam_id": exam_id,
            "user_id": user_id,
            "username": username,
            "full_name": full_name,
            "ip": client_ip
        }, room=f"proctor:{exam_id}")
        
        # Subscribe to PubSub for this exam room
        await pubsub_manager.subscribe_to_exam(exam_id)

        # Recover or Create Session
        exam_session = None
        if session_id:
            exam_session = await session_manager.get_session(exam_id, user_id)
        
        if exam_session:
            # Recovered existing session
            pass
        else:
            # Create new session
            # Fetch questions from Exam Service
            try:
                questions = await exam_client.get_exam_questions(exam_id, token)
            except Exception as e:
                await sio.emit('error', {'code': 404, 'message': 'Exam not found or unable to fetch'}, room=sid)
                return
            
            new_session_id = str(uuid.uuid4())
            exam_session = await session_manager.create_session(
                session_id=new_session_id,
                exam_id=exam_id,
                user_id=user_id,
                total_questions=len(questions),
                questions=questions
            )

        # Send joined event
        await sio.emit('joined', exam_session.to_dict(), room=sid)

    @sio.event
    async def start_exam(sid, data):
        session = await sio.get_session(sid)
        user_id = session.get('user_id')
        exam_id = session.get('exam_id')
        
        exam_session = await session_manager.get_session(exam_id, user_id)
        if not exam_session:
            await sio.emit('error', {'code': 400, 'message': 'Session not found. Please join first.'}, room=sid)
            return
            
        if exam_session.total_questions > 0:
            question = exam_session.questions[exam_session.current_question]
            await sio.emit('question', {
                'index': exam_session.current_question,
                'question': question,
                'total': exam_session.total_questions,
            }, room=sid)
        else:
            await sio.emit('error', {'code': 400, 'message': 'No questions available'}, room=sid)

    @sio.event
    async def submit_answer(sid, data):
        session = await sio.get_session(sid)
        user_id = session.get('user_id')
        exam_id = session.get('exam_id')
        
        question_index = data.get('question_index')
        answer = data.get('answer')
        
        if question_index is None or answer is None:
            await sio.emit('error', {'code': 400, 'message': 'Invalid payload'}, room=sid)
            return

        exam_session = await session_manager.update_answer(exam_id, user_id, question_index, answer)
        
        if exam_session:
            await sio.emit('answer_saved', {
                'index': question_index,
                'answer': answer,
                'confirmed': True
            }, room=sid)
            
            # Broadcast update via PubSub if needed (e.g. for proctoring/dashboard)
            await pubsub_manager.publish(exam_id, "answer_saved", {
                "user_id": user_id,
                "index": question_index
            })
        else:
            await sio.emit('error', {'code': 400, 'message': 'Failed to save answer'}, room=sid)

    @sio.event
    async def next_question(sid, data):
        session = await sio.get_session(sid)
        user_id = session.get('user_id')
        exam_id = session.get('exam_id')
        
        exam_session = await session_manager.get_session(exam_id, user_id)
        if not exam_session:
            return
            
        if exam_session.current_question < exam_session.total_questions:
            question = exam_session.questions[exam_session.current_question]
            await sio.emit('question', {
                'index': exam_session.current_question,
                'question': question,
                'total': exam_session.total_questions,
            }, room=sid)
        else:
            # End of questions
            pass

    @sio.event
    async def submit_exam(sid, data):
        session = await sio.get_session(sid)
        user_id = session.get('user_id')
        exam_id = session.get('exam_id')
        token = session.get('token')
        
        exam_session = await session_manager.finish_session(exam_id, user_id)
        if exam_session:
            try:
                # Submit to Exam Service
                result_data = {
                    "exam_id": exam_id,
                    "user_id": user_id,
                    "answers": {str(k): v for k, v in exam_session.answers.items()},
                    "metadata_info": {
                        "started_at": exam_session.started_at.isoformat(),
                        "submitted_at": exam_session.submitted_at.isoformat()
                    }
                }
                response = await exam_client.submit_exam_result(exam_id, user_id, result_data, token)
                await sio.emit('exam_submitted', response, room=sid)
            except Exception as e:
                await sio.emit('error', {'code': 500, 'message': f'Failed to submit to server: {e}'}, room=sid)
        else:
            await sio.emit('error', {'code': 400, 'message': 'Session not valid or already submitted'}, room=sid)

    @sio.event
    async def ping(sid, data):
        session = await sio.get_session(sid)
        user_id = session.get('user_id')
        exam_id = session.get('exam_id')
        if exam_id and user_id:
            await session_manager.heartbeat(exam_id, user_id)
        await sio.emit('pong', {}, room=sid)

    @sio.event
    async def join_proctor_room(sid, data):
        session = await sio.get_session(sid)
        role = session.get('role') if session else None
        if role not in ('admin', 'teacher', 'proctor'):
            await sio.emit('error', {'code': 403, 'message': 'Only proctors can join this room'}, room=sid)
            return
        exam_id = data.get('exam_id')
        if exam_id:
            await sio.enter_room(sid, f"proctor:{exam_id}")

    # ===== WebRTC signaling (livestream camera học sinh cho giám thị xem trực tiếp) =====
    @sio.event
    async def webrtc_request_stream(sid, data):
        """Giám thị yêu cầu 1 học sinh cụ thể bắt đầu chia sẻ camera hoặc màn hình làm bài."""
        session = await sio.get_session(sid)
        role = session.get('role') if session else None
        if role not in ('admin', 'teacher', 'proctor'):
            await sio.emit('error', {'code': 403, 'message': 'Only proctors can request a stream'}, room=sid)
            return
        target_user_id = data.get('user_id')
        exam_id = data.get('exam_id')
        stream_type = data.get('stream_type', 'camera')
        if not target_user_id or not exam_id:
            return
        client = await redis_client.get_client()
        student_sid = await client.get(f"exam:room:{exam_id}:sid:{target_user_id}")
        payload = {'proctor_sid': sid, 'stream_type': stream_type, 'target_user_id': target_user_id}
        if student_sid:
            sid_str = student_sid.decode('utf-8') if isinstance(student_sid, bytes) else student_sid
            await sio.emit('webrtc_stream_requested', payload, room=sid_str)
        # Always emit to student's user and exam rooms as guaranteed fallback
        await sio.emit('webrtc_stream_requested', payload, room=f"exam:{exam_id}:user:{target_user_id}")
        await sio.emit('webrtc_stream_requested', payload, room=f"user:{target_user_id}")

    @sio.event
    async def webrtc_offer(sid, data):
        target_sid = data.get('target_sid')
        if target_sid:
            session = await sio.get_session(sid)
            user_id = data.get('user_id') or (session.get('user_id') if session else None)
            await sio.emit('webrtc_offer', {'sdp': data.get('sdp'), 'from_sid': sid, 'user_id': user_id}, room=target_sid)

    @sio.event
    async def webrtc_answer(sid, data):
        target_sid = data.get('target_sid')
        if target_sid:
            await sio.emit('webrtc_answer', {'sdp': data.get('sdp'), 'from_sid': sid}, room=target_sid)

    @sio.event
    async def webrtc_ice_candidate(sid, data):
        target_sid = data.get('target_sid')
        if target_sid:
            await sio.emit('webrtc_ice_candidate', {'candidate': data.get('candidate'), 'from_sid': sid}, room=target_sid)

    @sio.event
    async def student_live_frame(sid, data):
        """Học sinh truyền khung hình snapshot trực tiếp tới phòng giám thị."""
        session = await sio.get_session(sid)
        exam_id = data.get('exam_id') or (session.get('exam_id') if session else None)
        user_id = data.get('user_id') or (session.get('user_id') if session else None)
        frame = data.get('frame')
        stream_type = data.get('stream_type', 'screen')
        if exam_id and user_id and frame:
            await sio.emit('proctor:student_frame', {
                'exam_id': str(exam_id),
                'user_id': str(user_id),
                'frame': frame,
                'stream_type': stream_type,
                'timestamp': datetime.now(timezone.utc).isoformat(),
            }, room=f"proctor:{exam_id}")
