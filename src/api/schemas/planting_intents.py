from pydantic import BaseModel, ConfigDict
from datetime import date, datetime
from decimal import Decimal
from typing import Optional


class PlantingIntentBase(BaseModel):
    farmer_id: int
    commodity: str
    planting_date: date
    harvest_date: date
    volume: Decimal
    remarks: Optional[str] = None


class PlantingIntentCreate(PlantingIntentBase):
    pass


class PlantingIntentUpdate(BaseModel):
    farmer_id: Optional[int] = None
    commodity: Optional[str] = None
    planting_date: Optional[date] = None
    harvest_date: Optional[date] = None
    volume: Optional[Decimal] = None
    remarks: Optional[str] = None


class PlantingIntentResponse(PlantingIntentBase):
    planting_intent_id: int
    created_at: datetime

    farmer_name: Optional[str] = None
    location: Optional[str] = None
    status: str = "Pending"

    model_config = ConfigDict(
        from_attributes=True
    )