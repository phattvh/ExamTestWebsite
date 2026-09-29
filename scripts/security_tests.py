import requests
import json
import uuid

AUTH_URL = "http://localhost:8000"
EXAM_URL = "http://localhost:8002"

def register_user(username, password, role="student"):
    try:
        r = requests.post(f"{AUTH_URL}/register", json={"username": username, "email": f"{username}@test.com", "password": password, "role": role})
        if r.status_code == 201:
            return r.json()
        print(f"Failed to register {username}: {r.status_code} {r.text}")
    except Exception as e:
        print(f"Error registering {username}: {e}")
    return None

def login(username, password):
    r = requests.post(f"{AUTH_URL}/login", data={"username": username, "password": password})
    if r.status_code == 200:
        return r.json()["access_token"]
    print(f"Failed to login {username}: {r.status_code} {r.text}")
    return None

def get_me(token):
    headers = {"Authorization": f"Bearer {token}"}
    r = requests.get(f"{AUTH_URL}/me", headers=headers)
    if r.status_code == 200:
        return r.json()["id"]
    return None

def create_exam(token, title):
    headers = {"Authorization": f"Bearer {token}"}
    r = requests.post(
        f"{EXAM_URL}/api/v1/exams",
        json={"title": title, "duration_minutes": 60, "passing_score": 50, "max_attempts": 1, "is_public": True},
        headers=headers
    )
    if r.status_code == 201:
        return r.json()["id"]
    print(f"Failed to create exam: {r.status_code} {r.text}")
    return None

def add_collaborator(token, exam_id, user_id):
    headers = {"Authorization": f"Bearer {token}"}
    r = requests.post(
        f"{EXAM_URL}/api/v1/exams/{exam_id}/assign",
        json={"user_id": user_id, "type": "collaborator", "role": "CO_TEACHER"},
        headers=headers
    )
    if r.status_code != 200:
        print(f"Failed to add collaborator: {r.status_code} {r.text}")
    return r.status_code

def add_proctor(token, exam_id, user_id):
    headers = {"Authorization": f"Bearer {token}"}
    r = requests.post(
        f"{EXAM_URL}/api/v1/exams/{exam_id}/assign",
        json={"user_id": user_id, "type": "proctor"},
        headers=headers
    )
    if r.status_code != 200:
        print(f"Failed to add collaborator: {r.status_code} {r.text}")
    return r.status_code

def add_roster(token, exam_id, user_id):
    headers = {"Authorization": f"Bearer {token}"}
    r = requests.post(
        f"{EXAM_URL}/api/v1/exams/{exam_id}/assign",
        json={"user_id": user_id, "type": "roster"},
        headers=headers
    )
    if r.status_code != 200:
        print(f"Failed to add collaborator: {r.status_code} {r.text}")
    return r.status_code

def publish_exam(token, exam_id):
    headers = {"Authorization": f"Bearer {token}"}
    r = requests.post(f"{EXAM_URL}/api/v1/exams/{exam_id}/publish", headers=headers)
    if r.status_code != 200:
        print(f"Failed to add collaborator: {r.status_code} {r.text}")
    return r.status_code

def start_attempt(token, exam_id):
    headers = {"Authorization": f"Bearer {token}"}
    r = requests.post(f"{EXAM_URL}/api/v1/exams/{exam_id}/start", headers=headers)
    if r.status_code in [200, 201]:
        return r.json()["id"]
    print(f"Failed to start attempt: {r.status_code} {r.text}")
    return None

def get_result(token, attempt_id):
    headers = {"Authorization": f"Bearer {token}"}
    # grading_service is on 8004? No, results might be in grading service. Let's use grading service port.
    GRADING_URL = "http://localhost:8004"
    r = requests.get(f"{GRADING_URL}/api/v1/results/{attempt_id}", headers=headers)
    if r.status_code != 200:
        print(f"Failed to add collaborator: {r.status_code} {r.text}")
    return r.status_code

def update_exam(token, exam_id):
    headers = {"Authorization": f"Bearer {token}"}
    r = requests.put(f"{EXAM_URL}/api/v1/exams/{exam_id}", json={"title": "Updated Title"}, headers=headers)
    if r.status_code != 200:
        print(f"Failed to add collaborator: {r.status_code} {r.text}")
    return r.status_code

def main():
    print("Setting up users...")
    # u_admin = register_user("admin_sec", "password", "admin")
    # u_teacher1 = register_user("teacher_1", "password", "teacher")
    # u_teacher2 = register_user("teacher_2", "password", "teacher")
    # u_student1 = register_user("student_1", "password", "student")
    # u_student2 = register_user("student_2", "password", "student")

    tok_admin = login("admin_sec", "password")
    tok_t1 = login("teacher_1", "password")
    tok_t2 = login("teacher_2", "password")
    tok_s1 = login("student_1", "password")
    tok_s2 = login("student_2", "password")
    u_admin_id = get_me(tok_admin)
    u_teacher1_id = get_me(tok_t1)
    u_teacher2_id = get_me(tok_t2)
    u_student1_id = get_me(tok_s1)
    u_student2_id = get_me(tok_s2)

    print("\n--- Running Security Tests ---")
    
    # 1. Teacher Isolation
    exam_id = create_exam(tok_t1, "Teacher 1 Exam")
    if not exam_id:
        print("Setup failed, cannot create exam.")
        return
        
    print("Test: Teacher Isolation")
    status = update_exam(tok_t2, exam_id)
    if status in [403, 401]:
        print("✅ PASS: Teacher 2 cannot modify Teacher 1's exam")
    else:
        print(f"❌ FAIL: Teacher 2 got status {status} when trying to modify Teacher 1's exam")

    # 2. Collaboration Access
    add_collaborator(tok_t1, exam_id, u_teacher2_id)
    print("Test: Collaboration Access")
    status = update_exam(tok_t2, exam_id)
    if status == 200:
        print("✅ PASS: Teacher 2 (collaborator) can modify Teacher 1's exam")
    else:
        print(f"❌ FAIL: Teacher 2 got status {status} when trying to modify exam")

    # 3. Proctor Boundary
    # proctor_user = register_user("proctor_1", "password", "student")
    tok_proc = login("proctor_1", "password")
    proctor_user_id = get_me(tok_proc)
    add_proctor(tok_t1, exam_id, proctor_user_id)
    print("Test: Proctor Boundary (modify exam)")
    status = update_exam(tok_proc, exam_id)
    if status in [403, 401]:
        print("✅ PASS: Proctor cannot modify exam")
    else:
        print(f"❌ FAIL: Proctor got status {status} when trying to modify exam")

    # Setup for student tests
    add_roster(tok_t1, exam_id, u_student1_id)
    add_roster(tok_t1, exam_id, u_student2_id)
    publish_exam(tok_t1, exam_id)
    
    attempt_id1 = start_attempt(tok_s1, exam_id)
    attempt_id2 = start_attempt(tok_s2, exam_id)
    
    # Submit attempt 1 to generate a result
    submit_resp = requests.post(f"{EXAM_URL}/api/v1/exams/attempts/{attempt_id1}/submit", headers={"Authorization": f"Bearer {tok_s1}"})
    print(f"Submit attempt 1: {submit_resp.status_code}")
    
    # Wait for grading to complete (poll with retries)
    import time
    GRADING_URL = "http://localhost:8004"
    result_ready = False
    for i in range(10):
        time.sleep(1)
        r = requests.get(f"{GRADING_URL}/api/v1/grading/result/{attempt_id1}", headers={"Authorization": f"Bearer {tok_s1}"})
        if r.status_code == 200:
            result_ready = True
            break
    
    if not result_ready:
        print(f"⚠️  WARNING: Result not ready after 10 seconds, test may be inconclusive")

    # 4. Student Isolation
    print("Test: Student Isolation (view result)")
    # Test via results endpoint
    status = get_result(tok_s2, attempt_id1)
    if status in [403, 401]:
        print("✅ PASS: Student 2 cannot read Student 1's result")
    else:
        print(f"❌ FAIL: Student 2 got status {status} when reading Student 1's result")
        
    # 5. Revocation (Admin changes role)
    # For now we'll simulate token invalidation if possible, or just skip if auth service doesn't have the endpoint implemented here.
    
    print("\nSecurity Tests Completed!")

if __name__ == "__main__":
    main()
