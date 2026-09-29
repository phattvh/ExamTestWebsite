import json
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from database import async_session_maker
from models import AuditLog

class AuditLogMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if request.method not in ["GET", "OPTIONS"] and "Authorization" in request.headers:
            auth_header = request.headers.get("Authorization")
            user_id = None
            if auth_header and auth_header.startswith("Bearer "):
                token = auth_header.split(" ")[1]
                from auth import SECRET_KEY, ALGORITHM
                from jose import jwt, JWTError
                try:
                    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
                    user_id = payload.get("sub")
                    if user_id:
                        pass # user_id is a string UUID, keep it as string
                except JWTError:
                    pass

            action = f"{request.method} {request.url.path}"
            ip_address = request.client.host if request.client else None
            user_agent = request.headers.get("User-Agent")
            
            async with async_session_maker() as session:
                audit_log = AuditLog(
                    user_id=user_id,
                    action=action,
                    ip_address=ip_address,
                    user_agent=user_agent
                )
                session.add(audit_log)
                await session.commit()
                
        response = await call_next(request)
        return response
