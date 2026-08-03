from pydantic import BaseModel, EmailStr
from datetime import datetime


class UserBase(BaseModel):
    first_name: str
    last_name: str
    username: str
    email_address: EmailStr
    phone_number: str
    role: str


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


class UserResponse(UserBase):
    user_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True