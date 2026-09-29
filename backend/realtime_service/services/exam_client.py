import httpx
from typing import List, Dict
from config import settings

class ExamClient:
    def __init__(self):
        self.base_url = settings.EXAM_SERVICE_URL

    async def get_exam_questions(self, exam_id: str, token: str) -> List[dict]:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"{self.base_url}/api/v1/exams/{exam_id}/questions",
                headers={"Authorization": f"Bearer {token}"}
            )
            response.raise_for_status()
            exam_questions = response.json()
            
            questions = []
            question_url = settings.QUESTION_SERVICE_URL if hasattr(settings, 'QUESTION_SERVICE_URL') else "http://question_service:8000"
            async with httpx.AsyncClient() as q_client:
                for eq in exam_questions:
                    q_id = eq.get("question_id")
                    if not q_id: continue
                    q_res = await q_client.get(f"{question_url}/api/v1/questions/{q_id}")
                    if q_res.status_code == 200:
                        q_data = q_res.json()
                        q_data["point_possible"] = eq.get("point_value", 1.0)
                        q_data["id"] = q_data.get("_id", q_id)
                        questions.append(q_data)
            return questions

    async def get_exam_schedule(self, exam_id: str, token: str) -> dict:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"{self.base_url}/api/v1/exams/{exam_id}/schedule",
                headers={"Authorization": f"Bearer {token}"}
            )
            response.raise_for_status()
            return response.json()

    async def submit_exam_result(self, exam_id: str, user_id: str, result: dict, token: str):
        async with httpx.AsyncClient(timeout=10.0) as client:
            # Get grading service url from env or hardcode for now if missing
            grading_url = settings.GRADING_SERVICE_URL if hasattr(settings, 'GRADING_SERVICE_URL') else "http://grading_service:8000"
            response = await client.post(
                f"{grading_url}/api/v1/grading/submit",
                json=result,
                headers={"Authorization": f"Bearer {token}"}
            )
            response.raise_for_status()
            return response.json()

exam_client = ExamClient()
