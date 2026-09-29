import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, patch, MagicMock
import datetime
import uuid

from main import app
from dependencies import get_current_user
from database import get_db
import models

EXAM_ID = str(uuid.uuid4())
ATTEMPT_ID = str(uuid.uuid4())
USER_ID = "student1"
USER_ID_2 = "student2"

client = TestClient(app)

def override_get_current_user():
    return {"id": USER_ID, "role": "student"}

async def override_get_db():
    db_mock = AsyncMock()
    yield db_mock

app.dependency_overrides[get_current_user] = override_get_current_user
app.dependency_overrides[get_db] = override_get_db

class DummyExam:
    def __init__(self, status="published", max_attempts=1, duration_minutes=60):
        self.id = uuid.UUID(EXAM_ID)
        self.status = status
        self.max_attempts = max_attempts
        self.duration_minutes = duration_minutes
        self.roster = []
        self.is_public = True

class DummyAttempt:
    def __init__(self, user_id=USER_ID, status="in_progress", expires_in_mins=60):
        self.id = uuid.UUID(ATTEMPT_ID)
        self.exam_id = uuid.UUID(EXAM_ID)
        self.user_id = user_id
        self.attempt_number = 1
        self.status = status
        self.started_at = datetime.datetime.now(datetime.timezone.utc)
        self.expires_at = self.started_at + datetime.timedelta(minutes=expires_in_mins)
        self.submitted_at = None
        self.created_at = self.started_at

@patch("routes.exams.crud")
def test_start_exam_lifecycle(mock_crud):
    mock_crud.get_exam_by_id = AsyncMock(return_value=DummyExam())
    mock_crud.get_active_exam_attempt = AsyncMock(return_value=None)
    mock_crud.get_exam_attempt_count = AsyncMock(return_value=0)
    mock_crud.create_exam_attempt = AsyncMock(return_value=DummyAttempt())

    response = client.post(f"/api/v1/exams/{EXAM_ID}/start")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == ATTEMPT_ID
    assert data["status"] == "in_progress"
    
@patch("routes.exams.crud")
def test_timer_validation_expired(mock_crud):
    attempt = DummyAttempt(expires_in_mins=-10)
    mock_crud.get_exam_attempt = AsyncMock(return_value=attempt)
    mock_crud.upsert_exam_attempt_answer = AsyncMock()
    
    async def mock_submit(*args, **kwargs):
        attempt.status = "submitted"
        return attempt, True
        
    mock_crud.submit_exam_attempt = AsyncMock(side_effect=mock_submit)
    
    response = client.post(
        f"/api/v1/exams/attempts/{ATTEMPT_ID}/answers",
        json={"question_id": "q1", "selected_answer": "A"}
    )
    assert response.status_code == 400
    assert "expired" in response.json()["detail"].lower()
    assert attempt.status == "submitted"

@patch("routes.exams.crud")
def test_duplicate_submit(mock_crud):
    attempt = DummyAttempt(status="submitted")
    mock_crud.get_exam_attempt = AsyncMock(return_value=attempt)
    
    response = client.post(f"/api/v1/exams/attempts/{ATTEMPT_ID}/submit")
    assert response.status_code == 400
    assert "already submitted" in response.json()["detail"].lower()

@patch("routes.exams.crud")
def test_authorization_idor(mock_crud):
    attempt = DummyAttempt(user_id=USER_ID_2)
    mock_crud.get_exam_attempt = AsyncMock(return_value=attempt)
    
    response = client.post(
        f"/api/v1/exams/attempts/{ATTEMPT_ID}/answers",
        json={"question_id": "q1", "selected_answer": "A"}
    )
    assert response.status_code == 403
    assert response.json()["detail"] == "Access denied"

    response = client.post(f"/api/v1/exams/attempts/{ATTEMPT_ID}/submit")
    assert response.status_code == 403
    assert response.json()["detail"] == "Access denied"

@patch("routes.exams.crud")
@patch("httpx.AsyncClient.post")
def test_submit_success(mock_post, mock_crud, monkeypatch):
    from routes.exams import crud
    attempt = DummyAttempt()
    mock_crud.get_exam_attempt = AsyncMock(return_value=attempt)
    
    async def mock_submit(*args, **kwargs):
        dummy = DummyAttempt()
        dummy.status = "submitted"
        return dummy, True
    
    monkeypatch.setattr(crud, "submit_exam_attempt", mock_submit)
    
    async def mock_execute_return(*args, **kwargs):
        class MockResult:
            def scalars(self):
                class MockScalars:
                    def all(self):
                        return []
                return MockScalars()
        return MockResult()

    async def custom_override_get_db():
        db_mock = AsyncMock()
        db_mock.execute = mock_execute_return
        yield db_mock
        
    app.dependency_overrides[get_db] = custom_override_get_db
    
    response = client.post(f"/api/v1/exams/attempts/{ATTEMPT_ID}/submit")
    assert response.status_code == 200
    assert response.json()["status"] == "submitted"
