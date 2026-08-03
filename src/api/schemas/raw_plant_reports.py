from pydantic import BaseModel
from datetime import date
from decimal import Decimal

class RawPlantReportBase(BaseModel):
    planting_date: date
    estimated_yield: Decimal
    municipal_coordinator_id: int
    encoded_by: int


class RawPlantReportCreate(RawPlantReportBase):
    pass


class RawPlantReportUpdate(BaseModel):
    planting_date: date | None = None
    estimated_yield: Decimal | None = None
    municipal_coordinator_id: int | None = None
    encoded_by: int | None = None


class RawPlantReportResponse(RawPlantReportBase):
    report_id: int

    class Config:
        from_attributes = True