import httpx
from config import settings
from typing import List, Dict, Any

class ExamClient:
    def __init__(self):
        self.base_url = settings.EXAM_SERVICE_URL
        self.question_url = settings.QUESTION_SERVICE_URL
        
    async def get_exam_questions(self, exam_id: str, token: str) -> List[Dict[str, Any]]:
        # This will be replaced by the subagent but I'll leave it intact here
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.question_url}/api/v1/snapshots/{exam_id}",
                headers={"X-Internal-Token": token}
            )
            
            if response.status_code == 200:
                snapshots = response.json()
                questions = []
                for sn in snapshots:
                    q_data = {
                        "id": sn.get("question_id"),
                        "question_text": sn.get("question_text"),
                        "type": sn.get("type", "multiple_choice"),
                        "options": sn.get("choices"),
                        "correct_answer": sn.get("correct_answer"),
                        "point_possible": sn.get("points", 1.0)
                    }
                    questions.append(q_data)
                return questions
            return []

    async def verify_exam_access(self, exam_id: str, token: str) -> Dict[str, Any]:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/api/v1/exams/{exam_id}/verify-access",
                headers={"Authorization": f"Bearer {token}"}
            )
            if response.status_code == 200:
                return response.json()
            return {}
