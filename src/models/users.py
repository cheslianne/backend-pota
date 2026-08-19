# src/models/users.py

from sqlalchemy import Column, Integer, String, DateTime, func
from src.core.database import Base
from sqlalchemy.orm import relationship
from src.models.audit_logs import AuditLog
from src.models.raw_plant_reports import RawPlantReport


class User(Base):
    __tablename__ = "users"

    user_id = Column(Integer, primary_key=True, index=True)

    first_name = Column(String(50), nullable=False)

    last_name = Column(String(50), nullable=False)

    username = Column(String(50), unique=True, nullable=False)

    email_address = Column(String(100), unique=True, nullable=False)

    phone_number = Column(String(15), nullable=False)

    password = Column(String(255), nullable=False)

    role = Column(String(30), nullable=False)

    created_at = Column(
        DateTime,
        server_default=func.now(),
        nullable=False
    )

    updated_at = Column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )

    audit_logs = relationship(
    "AuditLog",
    back_populates="user"
)
    raw_plant_reports = relationship(
    "RawPlantReport",
    back_populates="user"
)