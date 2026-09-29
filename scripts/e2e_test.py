import httpx
import socketio
import asyncio
import json
import uuid

BASE_URL = "http://localhost/api/v1"
WS_URL = "http://localhost"

async def register(email, username, full_name, password, role):
    async with httpx.AsyncClient(follow_redirects=True) as client:
        response = await client.post(
            f"http://localhost/api/auth/register",
            json={
                "email": email,
                "username": username,
                "full_name": full_name,
                "password": password,
                "role": role
            }
        )
        if response.status_code == 201:
            return response.json()
        elif response.status_code == 400 and "already registered" in response.text:
            return {"email": email}
        else:
            response.raise_for_status()

async def login(email, password):
    async with httpx.AsyncClient(follow_redirects=True) as client:
        response = await client.post(
            f"http://localhost/api/auth/login",
            data={"username": email, "password": password}
        )
        response.raise_for_status()
        return response.json()["access_token"]

async def create_category(name, token):
    async with httpx.AsyncClient(follow_redirects=True) as client:
        response = await client.post(
            f"{BASE_URL}/categories/",
            json={"name": name, "description": "Category for testing"},
            headers={"Authorization": f"Bearer {token}"}
        )
        response.raise_for_status()
        return response.json()

async def create_question(category_id, token, index):
    async with httpx.AsyncClient(follow_redirects=True) as client:
        response = await client.post(
            f"{BASE_URL}/questions/",
            json={
                "category_id": category_id,
                "type": "multiple_choice",
                "content": {"text": f"Test Question {index}"},
                "options": [
                    {"id": "A", "text": "Option A", "is_correct": True},
                    {"id": "B", "text": "Option B", "is_correct": False},
                    {"id": "C", "text": "Option C", "is_correct": False},
                    {"id": "D", "text": "Option D", "is_correct": False}
                ],
                "correct_answer": "A",
                "metadata": {
                    "difficulty": "medium",
                    "subject": "Math",
                    "tags": ["test"]
                }
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        response.raise_for_status()
        return response.json()

async def create_exam(token, title, duration):
    async with httpx.AsyncClient(follow_redirects=True) as client:
        response = await client.post(
            f"{BASE_URL}/exams/",
            json={
                "title": title,
                "description": "Exam for testing",
                "duration_minutes": duration,
                "passing_score": 5,
                "max_attempts": 1,
                "shuffle_questions": False,
                "shuffle_options": False,
                "show_result_after_submit": True
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        response.raise_for_status()
        return response.json()

async def generate_exam_questions(exam_id, token, num):
    async with httpx.AsyncClient(follow_redirects=True) as client:
        response = await client.post(
            f"{BASE_URL}/exams/{exam_id}/generate",
            json={
                "subject": "Math",
                "difficulty": "medium",
                "num_questions": num,
                "question_types": ["multiple_choice"],
                "point_per_question": 1.0
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        if response.status_code != 200 and response.status_code != 201:
            print(f"generate_exam_questions ERROR: {response.status_code}")
            print(f"Headers: {response.headers}")
            print(f"Body: {response.text}")
        response.raise_for_status()
        return response.json()

async def publish_exam(exam_id, token):
    async with httpx.AsyncClient(follow_redirects=True) as client:
        response = await client.post(
            f"{BASE_URL}/exams/{exam_id}/publish",
            headers={"Authorization": f"Bearer {token}"}
        )
        response.raise_for_status()
        return response.json()

async def get_result(exam_id, user_id, token):
    async with httpx.AsyncClient(follow_redirects=True) as client:
        response = await client.get(
            f"{BASE_URL}/grading/result/{exam_id}/{user_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        response.raise_for_status()
        return response.json()

async def test_full_flow():
    print("🚀 Starting End-to-End Test")
    
    unique_id = str(uuid.uuid4())[:8]
    admin_email = f"admin_{unique_id}@example.com"
    student_email = f"student_{unique_id}@example.com"

    try:
        # 1. Register Admin
        print("1. Registering Admin...")
        admin_username = f"admin_{unique_id}"
        admin = await register(admin_email, admin_username, "Admin", "admin123", "admin")
        token = await login(admin_username, "admin123")
        
        # 2. Create category
        print("2. Creating Category...")
        cat = await create_category(f"Math_{unique_id}", token)
        
        # 3. Create questions
        print("3. Creating 5 Questions...")
        cat_id = cat.get("id") or cat.get("_id")
        for i in range(5):
            await create_question(cat_id, token, i)
        
        # 4. Create exam
        print("4. Creating Exam...")
        exam = await create_exam(token, title=f"Test Exam {unique_id}", duration=30)
        
        # 5. Generate questions for exam
        print("5. Generating Exam Questions...")
        await generate_exam_questions(exam["id"], token, num=5)
        
        # 6. Publish exam
        print("6. Publishing Exam...")
        await publish_exam(exam["id"], token)
        
        # 7. Create student account
        print("7. Registering Student...")
        student_username = f"student_{unique_id}"
        student = await register(student_email, student_username, "Student", "student123", "student")
        
        # Getting student ID via login payload decode
        student_token = await login(student_username, "student123")
        import jwt
        decoded = jwt.decode(student_token, options={"verify_signature": False})
        student_id = decoded["sub"]
        
        # 8. WebSocket: join exam
        print("8. Connecting WebSocket...")
        sio = socketio.AsyncClient()
        
        join_event_future = asyncio.Future()
        question_event_future = asyncio.Future()
        answer_event_future = asyncio.Future()
        submit_event_future = asyncio.Future()
        
        @sio.on("joined")
        async def on_joined(data):
            join_event_future.set_result(data)
            
        @sio.on("question")
        async def on_question(data):
            if not question_event_future.done():
                question_event_future.set_result(data)
            
        @sio.on("answer_saved")
        async def on_answer_saved(data):
            if "confirmed" in data and not answer_event_future.done():
                answer_event_future.set_result(data)
                
        @sio.on("exam_submitted")
        async def on_exam_submitted(data):
            submit_event_future.set_result(data)

        @sio.on("error")
        async def on_error(data):
            print(f"WS Error: {data}")

        await sio.connect(f"{WS_URL}?token={student_token}", socketio_path="/ws/socket.io")
        print("   Joining exam...")
        await sio.emit("join_exam", {"exam_id": exam["id"]})
        join_resp = await asyncio.wait_for(join_event_future, timeout=5.0)
        assert join_resp["exam_id"] == exam["id"]
        
        # 9. Start exam
        print("9. Starting Exam...")
        await sio.emit("start_exam", {})
        question_resp = await asyncio.wait_for(question_event_future, timeout=5.0)
        assert "question" in question_resp
        
        # 10. Submit answers
        print("10. Submitting Answers...")
        for idx in range(5):
            answer_event_future = asyncio.Future()
            ans = "A"  # Correct answer based on question creation
            await sio.emit("submit_answer", {"question_index": idx, "answer": ans})
            ans_resp = await asyncio.wait_for(answer_event_future, timeout=5.0)
            print(f"Submitting answer for {idx}, got {ans_resp}")
            assert ans_resp.get("index") == idx
        
        # 11. Submit exam
        print("11. Submitting Exam...")
        await sio.emit("submit_exam", {})
        submit_resp = await asyncio.wait_for(submit_event_future, timeout=10.0)
        print("   Result:", submit_resp)
        
        await sio.disconnect()
        
        # 12. Check result via API
        print("12. Checking Result via REST API...")
        for _ in range(10):
            try:
                result = await get_result(exam["id"], student_id, student_token)
                assert result["score"] == 5.0, f"Expected 5.0, got {result['score']}"
                print(f"✅ E2E Test Passed! Final Score: {result['score']}/{result['total_possible']}")
                return
            except httpx.HTTPStatusError as e:
                if e.response.status_code == 404:
                    print("   Result not ready yet, retrying in 1s...")
                    await asyncio.sleep(1)
                else:
                    raise e
        print("❌ Test Failed: Result not found after 10 seconds")
        assert result["score"] == 5.0
        
        print("✅ E2E test passed successfully!")

    except Exception as e:
        print(f"❌ Test Failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_full_flow())
