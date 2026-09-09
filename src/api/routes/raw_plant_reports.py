from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from src.core.database import get_db

from src.models.raw_plant_reports import RawPlantReport
from src.models.planting_intents import PlantingIntent
from src.models.report_planting_intents import ReportPlantingIntent
from src.models.report_submission import ReportSubmission
from src.models.users import User

from src.api.schemas.raw_plant_reports import (
    RawPlantReportCreate,
    RawPlantReportUpdate,
    RawPlantReportResponse,
)

from src.core.auth import get_current_user


router = APIRouter()

@router.get("/")
def get_raw_plant_reports(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all raw plant reports for the current AEW.
    """
    
    reports = db.query(RawPlantReport).filter(
        RawPlantReport.encoded_by == current_user.user_id
    ).order_by(
        desc(RawPlantReport.created_at)
    ).all()
    
    result = []
    for report in reports:
        links = db.query(ReportPlantingIntent).filter(
            ReportPlantingIntent.report_id == report.report_id
        ).all()
        
        intent_ids = [link.planting_intent_id for link in links]
        intents = db.query(PlantingIntent).filter(
            PlantingIntent.planting_intent_id.in_(intent_ids)
        ).all() if intent_ids else []
        
        farmer_names = []
        for intent in intents:
            farmer = db.query(Farmer).filter(Farmer.farmer_id == intent.farmer_id).first()
            if farmer:
                farmer_names.append(f"{farmer.first_name} {farmer.last_name}")
        
        result.append({
            "report_id": report.report_id,
            "title": f"{report.commodity or 'Crop'} Harvest Report",
            "commodity": report.commodity,
            "planting_date": report.planting_date,
            "estimated_yield": report.estimated_yield,
            "encoded_by": report.encoded_by,
            "status": report.status or "NOT PLANTED",
            "notes": getattr(report, 'notes', ""),
            "created_at": report.created_at,
            "submitted_at": report.created_at,
            "farmer_names": ", ".join(farmer_names),
            "intent_ids": intent_ids,
            "intent_count": len(intents)
        })
    
    return result

@router.post("/from-intents")
def create_report_from_intents(
    data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a report from selected planting intents.
    """
    intent_ids = data.get("planting_intent_ids", [])
    notes = data.get("notes", "")
    status = data.get("status", "NOT PLANTED")
    
    if not intent_ids:
        raise HTTPException(status_code=400, detail="No planting intents selected.")
    
    # Get the intents and verify they belong to the AEW
    intents = db.query(PlantingIntent).filter(
        PlantingIntent.planting_intent_id.in_(intent_ids)
    ).all()
    
    if len(intents) != len(intent_ids):
        raise HTTPException(status_code=404, detail="Some planting intents not found.")
    
    # Check if any intent is already in a report
    for intent in intents:
        existing_link = db.query(ReportPlantingIntent).filter(
            ReportPlantingIntent.planting_intent_id == intent.planting_intent_id
        ).first()
        if existing_link:
            raise HTTPException(
                status_code=400,
                detail=f"Planting intent #{intent.planting_intent_id} is already in a report."
            )
    
    # Create the report
    # Get commodity from first intent for title
    commodity = intents[0].commodity if intents else "Crop"
    
    db_report = RawPlantReport(
        commodity=commodity,
        planting_date=datetime.now().date(),  # or use first intent's planting date
        estimated_yield=sum(i.volume for i in intents),
        encoded_by=current_user.user_id,
        notes=notes,
        status=status
    )
    
    db.add(db_report)
    db.flush()
    
    # Link intents to report
    for intent in intents:
        link = ReportPlantingIntent(
            report_id=db_report.report_id,
            planting_intent_id=intent.planting_intent_id
        )
        db.add(link)
        
        # Update intent status
        intent.status = "IN_REPORT"
    
    db.commit()
    db.refresh(db_report)
    
    return {
        "report_id": db_report.report_id,
        "status": db_report.status,
        "message": "Report created successfully."
    }


# ============================================================
# CREATE REPORT FROM PLANTING INTENT
# ============================================================

@router.post("/from-planting-intent/{planting_intent_id}")
def create_report_from_planting_intent(
    planting_intent_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):

    if not current_user:
        raise HTTPException(
            status_code=401,
            detail="Authentication required."
        )

    # --------------------------------------------------------
    # GET PLANTING INTENT
    # --------------------------------------------------------

    planting_intent = (
        db.query(PlantingIntent)
        .filter(
            PlantingIntent.planting_intent_id == planting_intent_id
        )
        .first()
    )

    if not planting_intent:
        raise HTTPException(
            status_code=404,
            detail="Planting intent not found."
        )

    # --------------------------------------------------------
    # CHECK IF REPORT ALREADY EXISTS
    # --------------------------------------------------------

    existing_link = (
        db.query(ReportPlantingIntent)
        .filter(
            ReportPlantingIntent.planting_intent_id
            == planting_intent_id
        )
        .first()
    )

    if existing_link:
        raise HTTPException(
            status_code=400,
            detail="A report already exists for this planting intent."
        )

    # --------------------------------------------------------
    # CREATE REPORT
    # --------------------------------------------------------

    db_report = RawPlantReport(
        commodity=planting_intent.commodity,
        planting_date=planting_intent.planting_date,
        estimated_yield=planting_intent.volume,
        municipal_coordinator_id=None,
        encoded_by=current_user.user_id,
    )

    db.add(db_report)

    # Generate report_id
    db.flush()

    # --------------------------------------------------------
    # CREATE REPORT SUBMISSION
    # --------------------------------------------------------

    submission = ReportSubmission(
        report_id=db_report.report_id,
        status="DRAFT",
        current_validator_id=None,
        current_validator_role=None,
        revision_remarks=None,
        revision_count=0,
    )

    db.add(submission)

    # --------------------------------------------------------
    # LINK REPORT TO PLANTING INTENT
    # --------------------------------------------------------

    report_link = ReportPlantingIntent(
        report_id=db_report.report_id,
        planting_intent_id=planting_intent.planting_intent_id,
    )

    db.add(report_link)

    # --------------------------------------------------------
    # SAVE
    # --------------------------------------------------------

    db.commit()

    db.refresh(db_report)
    db.refresh(submission)

    # --------------------------------------------------------
    # RESPONSE
    # --------------------------------------------------------

    return {
        "message": "Report created from planting intent successfully.",
        "report_id": db_report.report_id,
        "submission_id": submission.submission_id,
        "status": submission.status,
        "commodity": db_report.commodity,
        "planting_date": db_report.planting_date,

        # IMPORTANT
        "harvest_date": planting_intent.harvest_date,

        "estimated_yield": db_report.estimated_yield,
        "municipal_coordinator_id": (
            db_report.municipal_coordinator_id
        ),
        "encoded_by": db_report.encoded_by,
    }
# ============================================================
# UPDATE RAW PLANT REPORT
# ============================================================

@router.put(
    "/{report_id}",
    response_model=RawPlantReportResponse
)
def update_raw_plant_report(
    report_id: int,
    raw_plant_report: RawPlantReportUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    db_report = (
        db.query(RawPlantReport)
        .filter(
            RawPlantReport.report_id == report_id
        )
        .first()
    )

    if not db_report:
        raise HTTPException(
            status_code=404,
            detail="Raw plant report not found"
        )

    for key, value in raw_plant_report.model_dump(
        exclude_unset=True
    ).items():

        setattr(
            db_report,
            key,
            value
        )

    if current_user.role == "Agricultural Extension Worker":
        db_report.encoded_by = current_user.user_id

    db.commit()

    db.refresh(db_report)

    return db_report


# ============================================================
# DELETE RAW PLANT REPORT
# ============================================================

@router.delete("/{report_id}")
def delete_raw_plant_report(
    report_id: int,
    db: Session = Depends(get_db)
):

    db_report = (
        db.query(RawPlantReport)
        .filter(
            RawPlantReport.report_id == report_id
        )
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
        "message":
            "Raw plant report deleted successfully."
    }