from fastapi import Depends, HTTPException, status, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from config import settings
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from database import get_db

oauth2_scheme = HTTPBearer()

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

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid authentication token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(credentials.credentials, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None or user_id == "system":
            raise credentials_exception
            
    except JWTError:
        raise credentials_exception
        
    result = await db.execute(text("SELECT role, is_active FROM users WHERE id = CAST(:id AS UUID)"), {"id": user_id})
    user_row = result.fetchone()
    if not user_row or not user_row[1]:
        raise credentials_exception
        
    return {"id": user_id, "role": user_row[0], "token": credentials.credentials}

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
