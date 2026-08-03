from sqlalchemy import Column, Integer, ForeignKey
from sqlalchemy.orm import relationship
from src.core.database import Base


class ReportPlantingIntent(Base):
    __tablename__ = "report_planting_intents"

    report_id = Column(Integer, primary_key=True, index=True)

    planting_intent_id = Column(
        Integer,
        ForeignKey("planting_intents.planting_intent_id"),
        nullable=False,
    )

    planting_intent = relationship(
        "PlantingIntent",
        back_populates="reports",
    )