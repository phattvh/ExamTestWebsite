import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from config import settings

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

from fastapi import Header
def require_internal_token(x_internal_token: str = Header(None)):
    if not x_internal_token or x_internal_token != settings.JWT_SECRET:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid internal service token"
        )
    return True

ROLE_PERMISSIONS = {
    "student": ["exam:read", "attempt:create", "attempt:answer", "attempt:submit", "result:read_own"],
    "teacher": [
        "exam:read", "exam:create", "exam:update", "exam:delete", "exam:publish", "exam:assign",
        "question:read", "question:create", "question:update", "question:delete",
        "attempt:create", "attempt:answer", "attempt:submit", "result:read_own", "result:read_managed",
        "user:read", "user:create", "user:update", "user:delete",
        "proctoring:read", "proctoring:flag", "proctoring:terminate"
    ],
    "admin": [
        "exam:read", "exam:create", "exam:update", "exam:delete", "exam:publish", "exam:assign",
        "question:read", "question:create", "question:update", "question:delete",
        "attempt:create", "attempt:answer", "attempt:submit", "result:read_own", "result:read_managed",
        "user:read", "user:create", "user:update", "user:delete",
        "proctoring:read", "proctoring:flag", "proctoring:terminate"
    ]
}

async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None or user_id == "system":
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    # Fetch role from auth_service
    # auth_service is available at http://auth_service:8000
    try:
        async with httpx.AsyncClient() as client:
            # We call /me endpoint
            # Wait, /me is defined in main.py of auth_service: @app.get("/me")
            response = await client.get(
                "http://auth_service:8000/me", 
                headers={"Authorization": f"Bearer {token}"}
            )
            if response.status_code != 200:
                raise credentials_exception
            
            user_data = response.json()
            if not user_data.get("is_active"):
                raise credentials_exception
            role = user_data.get("role", "student")
            
            return {"id": user_id, "role": role, "token": token}
    except Exception:
        raise credentials_exception

def require_permission(permission: str):
    def permission_checker(current_user: dict = Depends(get_current_user)):
        role = current_user.get("role", "student")
        allowed_permissions = ROLE_PERMISSIONS.get(role, [])
        if permission not in allowed_permissions:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Missing required permission: {permission}"
            )
        return current_user
    return permission_checker


def require_internal_or_permission(permission: str):
    """
    Chấp nhận HOẶC (a) header X-Internal-Token hợp lệ — dùng khi 1 service khác
    (VD: exam_service) gọi nội bộ để lấy dữ liệu câu hỏi đầy đủ (kể cả correct_answer)
    phục vụ hiển thị lúc thi, HOẶC (b) user thật đã đăng nhập có đủ quyền `permission`
    — dùng khi admin/teacher tự duyệt ngân hàng câu hỏi qua giao diện quản trị.

    Cần tách riêng 2 đường này vì GET /questions/{id} phải phục vụ được cả 2 trường hợp:
    exam_service gọi thay mặt HỌC SINH lúc thi (học sinh không có quyền question:read
    để tự browse ngân hàng câu hỏi, nhưng exam_service cần lấy đủ dữ liệu rồi tự ẩn
    đáp án đúng trước khi trả về frontend), và admin/teacher gọi trực tiếp từ UI quản lý.
    """
    async def checker(
        x_internal_token: str = Header(None),
        authorization: str = Header(None),
    ):
        if x_internal_token and x_internal_token == settings.JWT_SECRET:
            return {"id": "system", "role": "system"}
        # Không có internal token hợp lệ -> bắt buộc phải là user thật có quyền.
        if not authorization or not authorization.lower().startswith("bearer "):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
        token = authorization.split(" ", 1)[1]
        current_user = await get_current_user(token)
        role = current_user.get("role", "student")
        if permission not in ROLE_PERMISSIONS.get(role, []):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=f"Missing required permission: {permission}")
        return current_user
    return checker
