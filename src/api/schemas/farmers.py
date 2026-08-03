from pydantic import BaseModel, EmailStr
from datetime import date


class FarmerBase(BaseModel):
    rsbsa_id: str
    first_name: str
    last_name: str
    address: str
    sex: str
    birthdate: date
    email_address: EmailStr | None = None
    phone_number: str


class FarmerCreate(FarmerBase):
    pass


class FarmerUpdate(BaseModel):
    rsbsa_id: str | None = None
    first_name: str | None = None
    last_name: str | None = None
    address: str | None = None
    sex: str | None = None
    birthdate: date | None = None
    email_address: EmailStr | None = None
    phone_number: str | None = None


class FarmerResponse(FarmerBase):
    farmer_id: int

    class Config:
        from_attributes = True