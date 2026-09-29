from pydantic import BaseModel, EmailStr, ConfigDict, Field
from typing import Optional
from datetime import datetime
from uuid import UUID

class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    full_name: Optional[str] = None

class UserCreate(UserBase):
    password: str = Field(..., min_length=8, max_length=128)
    role: Optional[str] = "student"

class AdminUserCreate(UserBase):
    password: Optional[str] = Field(default=None, min_length=8)
    role: Optional[str] = "student"

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    is_active: Optional[bool] = None
    role: Optional[str] = None

class PasswordChangeRequest(BaseModel):
    old_password: str
    new_password: str = Field(min_length=8)

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(min_length=8)

class UserResponse(UserBase):
    id: UUID
    role: str
    is_active: bool
    requires_password_change: bool = False
    created_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)

class AdminUserCreateResponse(UserResponse):
    temp_password: Optional[str] = None

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

class RefreshRequest(BaseModel):
    refresh_token: str

class MessageResponse(BaseModel):
    message: str

class UserRoleUpdate(BaseModel):
    role: str
