from pydantic import BaseModel
from datetime import date, datetime
from decimal import Decimal
from typing import Optional


class OfftakeRequestBase(BaseModel):
    farmer_id: int
    commodity: str
    quantity: Decimal
    selling_price: Decimal
    harvest_date: date
    commodity_photo: Optional[str] = None


class OfftakeRequestCreate(OfftakeRequestBase):
    pass


class OfftakeRequestUpdate(BaseModel):
    farmer_id: Optional[int] = None
    commodity: Optional[str] = None
    quantity: Optional[Decimal] = None
    selling_price: Optional[Decimal] = None
    harvest_date: Optional[date] = None
    commodity_photo: Optional[str] = None


class OfftakeRequestResponse(OfftakeRequestBase):
    offtake_request_id: int
    created_at: datetime

    class Config:
        from_attributes = True