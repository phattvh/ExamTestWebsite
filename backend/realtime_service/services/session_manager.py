import json
from datetime import datetime
from typing import Optional, Dict
from models.session import ExamSession
from services.redis_client import redis_client

class SessionManager:
    SESSION_TTL = 86400  # 24 hours

    def get_session_key(self, exam_id: str, user_id: str) -> str:
        return f"exam:session:{exam_id}:{user_id}"

    async def create_session(self, session_id: str, exam_id: str, user_id: str, total_questions: int, questions: list) -> ExamSession:
        session = ExamSession(
            session_id=session_id,
            exam_id=exam_id,
            user_id=user_id,
            started_at=datetime.utcnow(),
            total_questions=total_questions,
            questions=questions,
            last_heartbeat=datetime.utcnow()
        )
        await self.save_session(session)
        return session

    async def get_session(self, exam_id: str, user_id: str) -> Optional[ExamSession]:
        client = await redis_client.get_client()
        key = self.get_session_key(exam_id, user_id)
        data = await client.get(key)
        if data:
            return ExamSession.model_validate_json(data)
        return None

    async def save_session(self, session: ExamSession):
        client = await redis_client.get_client()
        key = self.get_session_key(session.exam_id, session.user_id)
        session.last_heartbeat = datetime.utcnow()
        await client.setex(key, self.SESSION_TTL, session.model_dump_json())

    async def update_answer(self, exam_id: str, user_id: str, question_index: int, answer: str) -> Optional[ExamSession]:
        session = await self.get_session(exam_id, user_id)
        if session and session.status == "in_progress":
            session.answers[str(question_index)] = answer
            session.current_question = question_index + 1
            await self.save_session(session)
            return session
        return None
    
    async def finish_session(self, exam_id: str, user_id: str) -> Optional[ExamSession]:
        session = await self.get_session(exam_id, user_id)
        if session and session.status == "in_progress":
            session.status = "submitted"
            session.submitted_at = datetime.utcnow()
            await self.save_session(session)
            return session
        return None

    async def heartbeat(self, exam_id: str, user_id: str):
        session = await self.get_session(exam_id, user_id)
        if session:
            await self.save_session(session)

session_manager = SessionManager()
