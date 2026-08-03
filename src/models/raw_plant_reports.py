from sqlalchemy import Column, Integer, Date, DECIMAL, ForeignKey
from sqlalchemy.orm import relationship
from src.core.database import Base

class RawPlantReport(Base):
    __tablename__ = "raw_plant_reports"

    report_id = Column(Integer, primary_key=True, index=True)
    planting_date = Column(Date, nullable=True)
    estimated_yield = Column(DECIMAL(10,2), nullable=True)
    municipal_coordinator_id = Column(Integer, nullable=True)
    encoded_by = Column(Integer, ForeignKey("users.user_id"))
    
