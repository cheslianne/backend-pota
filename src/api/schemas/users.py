from pydantic import BaseModel, EmailStr
from datetime import datetime


class UserBase(BaseModel):
    first_name: str
    last_name: str
    username: str
    email_address: EmailStr
    phone_number: str
    role: str
    region: str | None = None
    province: str | None = None
    municipality: str | None = None


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    username: str | None = None
    email_address: EmailStr | None = None
    phone_number: str | None = None
    password: str | None = None
    role: str | None = None
    region: str | None = None
    province: str | None = None
    municipality: str | None = None


class UserStatusUpdate(BaseModel):
    is_active: bool


# ============================================================
# ARCHIVE
# ============================================================

class UserArchiveUpdate(BaseModel):
    is_archived: bool
    remarks: str | None = None      # ✅ BAGO


class UserResponse(UserBase):
    user_id: int
    is_active: bool
    is_archived: bool          # ← idagdag
    archived_at: datetime | None = None   # ← idagdag
    archive_remarks: str | None = None      # ✅ BAGO
    archived_by: int | None = None
    archived_by_name: str | None = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True



class ForgotPasswordRequest(BaseModel):
    email_address: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str