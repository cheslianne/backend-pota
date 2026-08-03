from pydantic import BaseModel
from datetime import date, datetime
from decimal import Decimal
from typing import Optional


class ForecastBase(BaseModel):
    commodity: str
    variety: Optional[str] = None
    data_source: str
    etl_cadence: str
    price_movement_wow: Optional[Decimal] = None
    forecast_date: date
    forecast_price_low: Decimal
    forecast_price_high: Decimal


class ForecastCreate(ForecastBase):
    pass


class ForecastUpdate(BaseModel):
    commodity: Optional[str] = None
    variety: Optional[str] = None
    data_source: Optional[str] = None
    etl_cadence: Optional[str] = None
    price_movement_wow: Optional[Decimal] = None
    forecast_date: Optional[date] = None
    forecast_price_low: Optional[Decimal] = None
    forecast_price_high: Optional[Decimal] = None


class ForecastResponse(ForecastBase):
    forecast_id: int
    generated_at: datetime

    class Config:
        from_attributes = True