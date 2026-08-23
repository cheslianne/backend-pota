from sqlalchemy import Column, Integer, String, Date, DECIMAL, ForeignKey
from sqlalchemy.orm import relationship

from src.core.database import Base


class RawPlantReport(Base):
    __tablename__ = "raw_plant_reports"

    report_id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    commodity = Column(
        String(100),
        nullable=True
    )

    planting_date = Column(
        Date
    )

    estimated_yield = Column(
        DECIMAL(10, 2)
    )

    municipal_coordinator_id = Column(
        Integer,
        nullable=True
    )

    encoded_by = Column(
        Integer,
        ForeignKey("users.user_id")
    )

    user = relationship(
        "User",
        back_populates="raw_plant_reports"
    )

    submission = relationship(
        "ReportSubmission",
        back_populates="report",
        uselist=False,
        cascade="all, delete-orphan"
    )