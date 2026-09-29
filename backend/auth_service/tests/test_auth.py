import pytest

USER = {
    "username": "testuser",
    "email": "test@example.com",
    "password": "password123",
    "full_name": "Test User",
}


async def register(async_client, **overrides):
    data = {**USER, **overrides}
    return await async_client.post("/register", json=data)


async def test_health_check(async_client):
    response = await async_client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


async def test_register_user(async_client):
    response = await register(async_client)
    assert response.status_code == 201
    data = response.json()
    assert data["username"] == "testuser"
    assert data["email"] == "test@example.com"
    assert data["role"] == "student"
    assert "hashed_password" not in data


async def test_register_duplicate(async_client):
    assert (await register(async_client)).status_code == 201
    dup = await register(async_client, email="other@example.com")
    assert dup.status_code == 400


async def test_register_weak_password(async_client):
    response = await register(async_client, password="short")
    assert response.status_code == 422


async def test_login_user(async_client):
    await register(async_client, username="testlogin", email="testlogin@example.com")
    response = await async_client.post(
        "/login", data={"username": "testlogin", "password": "password123"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"


async def test_login_wrong_password(async_client):
    await register(async_client, username="badpw", email="badpw@example.com")
    response = await async_client.post(
        "/login", data={"username": "badpw", "password": "wrongpass1"}
    )
    assert response.status_code == 401


async def test_me_requires_auth(async_client):
    assert (await async_client.get("/me")).status_code == 401
    response = await async_client.get("/me", headers={"Authorization": "Bearer nonsense"})
    assert response.status_code == 401


async def test_me_success(async_client):
    await register(async_client)
    login = await async_client.post(
        "/login", data={"username": "testuser", "password": "password123"}
    )
    token = login.json()["access_token"]
    response = await async_client.get("/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert response.json()["username"] == "testuser"


async def test_refresh_token_flow(async_client):
    await register(async_client)
    login = await async_client.post(
        "/login", data={"username": "testuser", "password": "password123"}
    )
    refresh = login.json()["refresh_token"]
    response = await async_client.post("/refresh", json={"refresh_token": refresh})
    assert response.status_code == 200
    new_access = response.json()["access_token"]
    me = await async_client.get("/me", headers={"Authorization": f"Bearer {new_access}"})
    assert me.status_code == 200


async def test_refresh_rejects_access_token(async_client):
    await register(async_client)
    login = await async_client.post(
        "/login", data={"username": "testuser", "password": "password123"}
    )
    access = login.json()["access_token"]
    response = await async_client.post("/refresh", json={"refresh_token": access})
    assert response.status_code == 401


async def test_update_me(async_client):
    await register(async_client)
    login = await async_client.post(
        "/login", data={"username": "testuser", "password": "password123"}
    )
    headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
    response = await async_client.put("/me", json={"full_name": "New Name"}, headers=headers)
    assert response.status_code == 200
    assert response.json()["full_name"] == "New Name"


async def test_admin_endpoints_forbid_students(async_client):
    await register(async_client)
    login = await async_client.post(
        "/login", data={"username": "testuser", "password": "password123"}
    )
    headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
    assert (await async_client.get("/users", headers=headers)).status_code == 403


async def test_admin_can_list_users_and_set_role(async_client):
    # Bootstrap an admin directly through the test DB session.
    import models, auth as auth_mod
    from conftest import get_test_session_maker

    async with get_test_session_maker()() as session:
        admin = models.User(
            username="adminuser",
            email="admin@example.com",
            full_name="Admin",
            hashed_password=auth_mod.get_password_hash("adminpass1"),
            role="admin",
        )
        session.add(admin)
        await session.commit()

    login = await async_client.post(
        "/login", data={"username": "adminuser", "password": "adminpass1"}
    )
    headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

    await register(async_client, username="student1", email="student1@example.com")

    users = await async_client.get("/users", headers=headers)
    assert users.status_code == 200
    assert len(users.json()) == 2

    student = [u for u in users.json() if u["username"] == "student1"][0]
    promoted = await async_client.patch(
        f"/users/{student['id']}/role", json={"role": "teacher"}, headers=headers
    )
    assert promoted.status_code == 200
    assert promoted.json()["role"] == "teacher"

    deactivated = await async_client.delete(f"/users/{student['id']}", headers=headers)
    assert deactivated.status_code == 200

    # Deactivated user can no longer log in.
    login2 = await async_client.post(
        "/login", data={"username": "student1", "password": "password123"}
    )
    assert login2.status_code == 403
