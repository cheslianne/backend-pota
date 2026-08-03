from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from src.core.database import get_db
from src.models.audit_logs import AuditLog
from src.api.schemas.audit_logs import (
    AuditLogCreate,
    AuditLogUpdate,
    AuditLogResponse,
)

router = APIRouter()


@router.post("/", response_model=AuditLogResponse)
def create_audit_log(
    audit_log: AuditLogCreate,
    db: Session = Depends(get_db)
):
    db_log = AuditLog(**audit_log.model_dump())

    db.add(db_log)
    db.commit()
    db.refresh(db_log)

    return db_log


@router.get("/{log_id}", response_model=AuditLogResponse)
def read_audit_log(
    log_id: int,
    db: Session = Depends(get_db)
):
    db_log = (
        db.query(AuditLog)
        .filter(AuditLog.log_id == log_id)
        .first()
    )

    if not db_log:
        raise HTTPException(
            status_code=404,
            detail="Audit log not found"
        )

    return db_log


@router.put("/{log_id}", response_model=AuditLogResponse)
def update_audit_log(
    log_id: int,
    audit_log: AuditLogUpdate,
    db: Session = Depends(get_db)
):
    db_log = (
        db.query(AuditLog)
        .filter(AuditLog.log_id == log_id)
        .first()
    )

    if not db_log:
        raise HTTPException(
            status_code=404,
            detail="Audit log not found"
        )

    for key, value in audit_log.model_dump(exclude_unset=True).items():
        setattr(db_log, key, value)

    db.commit()
    db.refresh(db_log)

    return db_log


@router.delete("/{log_id}")
def delete_audit_log(
    log_id: int,
    db: Session = Depends(get_db)
):
    db_log = (
        db.query(AuditLog)
        .filter(AuditLog.log_id == log_id)
        .first()
    )

    if not db_log:
        raise HTTPException(
            status_code=404,
            detail="Audit log not found"
        )

    db.delete(db_log)
    db.commit()

    return {
        "message": "Audit log deleted successfully."
    }