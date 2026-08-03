from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from src.core.database import get_db
from src.models.raw_plant_reports import RawPlantReport
from src.api.schemas.raw_plant_reports import (
    RawPlantReportCreate,
    RawPlantReportUpdate,
    RawPlantReportResponse,
)

router = APIRouter()


@router.post("/", response_model=RawPlantReportResponse)
def create_raw_plant_report(
    raw_plant_report: RawPlantReportCreate,
    db: Session = Depends(get_db)
):
    db_report = RawPlantReport(**raw_plant_report.model_dump())

    db.add(db_report)
    db.commit()
    db.refresh(db_report)

    return db_report


@router.get("/{report_id}", response_model=RawPlantReportResponse)
def read_raw_plant_report(
    report_id: int,
    db: Session = Depends(get_db)
):
    db_report = (
        db.query(RawPlantReport)
        .filter(RawPlantReport.report_id == report_id)
        .first()
    )

    if not db_report:
        raise HTTPException(
            status_code=404,
            detail="Raw plant report not found"
        )

    return db_report


@router.put("/{report_id}", response_model=RawPlantReportResponse)
def update_raw_plant_report(
    report_id: int,
    raw_plant_report: RawPlantReportUpdate,
    db: Session = Depends(get_db)
):
    db_report = (
        db.query(RawPlantReport)
        .filter(RawPlantReport.report_id == report_id)
        .first()
    )

    if not db_report:
        raise HTTPException(
            status_code=404,
            detail="Raw plant report not found"
        )

    for key, value in raw_plant_report.model_dump(exclude_unset=True).items():
        setattr(db_report, key, value)

    db.commit()
    db.refresh(db_report)

    return db_report


@router.delete("/{report_id}")
def delete_raw_plant_report(
    report_id: int,
    db: Session = Depends(get_db)
):
    db_report = (
        db.query(RawPlantReport)
        .filter(RawPlantReport.report_id == report_id)
        .first()
    )

    if not db_report:
        raise HTTPException(
            status_code=404,
            detail="Raw plant report not found"
        )

    db.delete(db_report)
    db.commit()

    return {
        "message": "Raw plant report deleted successfully."
    }