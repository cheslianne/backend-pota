# src/api/routes/report_submission.py
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from src.core.database import get_db
from src.core.auth import get_current_user

from src.models.raw_plant_reports import RawPlantReport
from src.models.report_submission import ReportSubmission
from src.models.report_validation_history import ReportValidationHistory
from src.models.planting_intents import PlantingIntent
from src.models.report_planting_intents import ReportPlantingIntent
from src.models.users import User

router = APIRouter()


# ============================================================
# STATUS VALUES
# ============================================================

DRAFT = "DRAFT"
FOR_MUNICIPAL_VALIDATION = "FOR_MUNICIPAL_VALIDATION"
MUNICIPAL_APPROVED = "MUNICIPAL_APPROVED"
FOR_PROVINCIAL_VALIDATION = "FOR_PROVINCIAL_VALIDATION"
PROVINCIAL_APPROVED = "PROVINCIAL_APPROVED"
FOR_DA_RFO_VALIDATION = "FOR_DA_RFO_VALIDATION"
REVISION_REQUIRED = "REVISION_REQUIRED"
FINAL_APPROVED = "FINAL_APPROVED"


# ============================================================
# SUBMIT REPORT
# ============================================================

@router.post("/{report_id}/submit")
def submit_report(
    report_id: int,
    db: Session = Depends(get_db),
):
    report = (
        db.query(RawPlantReport)
        .filter(RawPlantReport.report_id == report_id)
        .first()
    )

    if not report:
        raise HTTPException(status_code=404, detail="Report not found.")

    submission = (
        db.query(ReportSubmission)
        .filter(ReportSubmission.report_id == report_id)
        .first()
    )

    if not submission:
        raise HTTPException(status_code=404, detail="Report submission not found.")

    if submission.status == DRAFT:
        submission.status = FOR_MUNICIPAL_VALIDATION
        submission.current_validator_id = report.municipal_coordinator_id
        submission.current_validator_role = "municipal_coordinator"
        submission.submitted_at = datetime.utcnow()

    elif submission.status == REVISION_REQUIRED:
        submission.status = FOR_MUNICIPAL_VALIDATION
        submission.current_validator_id = report.municipal_coordinator_id
        submission.current_validator_role = "municipal_coordinator"
        submission.revision_remarks = None
        submission.submitted_at = datetime.utcnow()

    else:
        raise HTTPException(
            status_code=400,
            detail="Report cannot be submitted because it is not in DRAFT or REVISION_REQUIRED status."
        )

    history = ReportValidationHistory(
        submission_id=submission.submission_id,
        action="SUBMITTED",
        performed_by=report.encoded_by,
        role="aew",
        remarks=None,
    )

    db.add(history)
    db.commit()
    db.refresh(submission)

    return {
        "message": "Report submitted successfully.",
        "report_id": report_id,
        "submission_id": submission.submission_id,
        "status": submission.status,
    }


# ============================================================
# APPROVE REPORT
# ============================================================

@router.post("/{report_id}/approve")
def approve_report(
    report_id: int,
    validator_id: int,
    validator_role: str,
    remarks: str | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required.")

    submission = (
        db.query(ReportSubmission)
        .filter(ReportSubmission.report_id == report_id)
        .first()
    )

    if not submission:
        raise HTTPException(status_code=404, detail="Report submission not found.")

    if current_user.user_id != validator_id:
        raise HTTPException(status_code=403, detail="You are not authorized to approve this report.")

    if validator_role == "municipal_coordinator":
        if submission.status != FOR_MUNICIPAL_VALIDATION:
            raise HTTPException(status_code=400, detail="Report is not awaiting municipal validation.")
        submission.status = FOR_PROVINCIAL_VALIDATION
        submission.current_validator_id = None
        submission.current_validator_role = "provincial_coordinator"

    elif validator_role == "provincial_coordinator":
        if submission.status != FOR_PROVINCIAL_VALIDATION:
            raise HTTPException(status_code=400, detail="Report is not awaiting provincial validation.")
        submission.status = FOR_DA_RFO_VALIDATION
        submission.current_validator_id = None
        submission.current_validator_role = "darfo"

    elif validator_role == "darfo":
        if submission.status != FOR_DA_RFO_VALIDATION:
            raise HTTPException(status_code=400, detail="Report is not awaiting DA-RFO validation.")
        submission.status = FINAL_APPROVED
        submission.current_validator_id = None
        submission.current_validator_role = None
        submission.approved_at = datetime.utcnow()

    else:
        raise HTTPException(status_code=400, detail="Invalid validator role.")

    history = ReportValidationHistory(
        submission_id=submission.submission_id,
        action="APPROVED",
        performed_by=current_user.user_id,
        role=validator_role,
        remarks=remarks,
    )

    db.add(history)
    db.commit()
    db.refresh(submission)

    return {
        "message": "Report approved successfully.",
        "report_id": report_id,
        "status": submission.status,
    }


# ============================================================
# REQUEST REVISION
# ============================================================

@router.post("/{report_id}/revision")
def request_revision(
    report_id: int,
    validator_id: int,
    validator_role: str,
    remarks: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required.")

    if current_user.user_id != validator_id:
        raise HTTPException(status_code=403, detail="You are not authorized to request revision.")

    if not remarks or not remarks.strip():
        raise HTTPException(status_code=400, detail="Revision remarks are required.")

    submission = (
        db.query(ReportSubmission)
        .filter(ReportSubmission.report_id == report_id)
        .first()
    )

    if not submission:
        raise HTTPException(status_code=404, detail="Report submission not found.")

    if validator_role == "municipal_coordinator":
        if submission.status != FOR_MUNICIPAL_VALIDATION:
            raise HTTPException(status_code=400, detail="Report is not awaiting municipal validation.")

    elif validator_role == "provincial_coordinator":
        if submission.status != FOR_PROVINCIAL_VALIDATION:
            raise HTTPException(status_code=400, detail="Report is not awaiting provincial validation.")

    elif validator_role == "darfo":
        if submission.status != FOR_DA_RFO_VALIDATION:
            raise HTTPException(status_code=400, detail="Report is not awaiting DA-RFO validation.")

    else:
        raise HTTPException(status_code=400, detail="Invalid validator role.")

    submission.status = REVISION_REQUIRED
    submission.current_validator_id = None
    submission.current_validator_role = "aew"
    submission.revision_remarks = remarks.strip()
    submission.revision_count = (submission.revision_count or 0) + 1

    history = ReportValidationHistory(
        submission_id=submission.submission_id,
        action="REVISION_REQUIRED",
        performed_by=current_user.user_id,
        role=validator_role,
        remarks=remarks,
    )

    db.add(history)
    db.commit()
    db.refresh(submission)

    return {
        "message": "Report flagged for revision.",
        "report_id": report_id,
        "status": submission.status,
        "revision_count": submission.revision_count,
    }


# ============================================================
# PULL SUBMISSION
# ============================================================

@router.post("/{report_id}/pull")
def pull_submission(
    report_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required.")

    if current_user.role != "Agricultural Extension Worker":
        raise HTTPException(status_code=403, detail="Only AEWs can pull submissions.")

    # --------------------------------------------------------
    # GET RAW PLANT REPORT
    # --------------------------------------------------------

    report = (
        db.query(RawPlantReport)
        .filter(RawPlantReport.report_id == report_id)
        .first()
    )

    if not report:
        raise HTTPException(status_code=404, detail="Report not found.")

    if report.encoded_by != current_user.user_id:
        raise HTTPException(status_code=403, detail="You can only pull submissions you encoded.")

    # --------------------------------------------------------
    # GET OR CREATE SUBMISSION
    # --------------------------------------------------------

    submission = (
        db.query(ReportSubmission)
        .filter(ReportSubmission.report_id == report_id)
        .first()
    )

    # ✅ CREATE SUBMISSION IF NOT EXISTS
    if not submission:
        submission = ReportSubmission(
            report_id=report_id,
            status=DRAFT,
            current_validator_id=None,
            current_validator_role=None,
            revision_count=0,
        )
        db.add(submission)
        db.commit()
        db.refresh(submission)

    # --------------------------------------------------------
    # CHECK IF PULLABLE
    # --------------------------------------------------------

    pullable_statuses = [
        FOR_MUNICIPAL_VALIDATION,
        "SUBMITTED",
        "PENDING",
        FOR_PROVINCIAL_VALIDATION,
    ]

    if submission.status not in pullable_statuses and submission.status != DRAFT:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot pull submission with status: {submission.status}"
        )

    # --------------------------------------------------------
    # UPDATE STATUS TO DRAFT
    # --------------------------------------------------------

    old_status = submission.status
    submission.status = DRAFT
    submission.current_validator_id = None
    submission.current_validator_role = None
    submission.revision_count = (submission.revision_count or 0) + 1

    history = ReportValidationHistory(
        submission_id=submission.submission_id,
        action="PULLED",
        performed_by=current_user.user_id,
        role="aew",
        remarks=f"Pulled from {old_status} for revision.",
    )

    db.add(history)
    db.commit()
    db.refresh(submission)

    return {
        "message": "Submission pulled back to draft successfully.",
        "report_id": report_id,
        "submission_id": submission.submission_id,
        "status": submission.status,
        "revision_count": submission.revision_count,
        "old_status": old_status,
    }


# ============================================================
# GET ALL SUBMITTED REPORTS
# ============================================================

@router.get("/all-reports")
def get_all_submitted_reports(
    db: Session = Depends(get_db),
):
    reports = (
        db.query(
            ReportSubmission,
            RawPlantReport,
            PlantingIntent,
            User
        )
        .join(RawPlantReport, RawPlantReport.report_id == ReportSubmission.report_id)
        .join(ReportPlantingIntent, ReportPlantingIntent.report_id == RawPlantReport.report_id)
        .join(PlantingIntent, PlantingIntent.planting_intent_id == ReportPlantingIntent.planting_intent_id)
        .outerjoin(User, User.user_id == RawPlantReport.encoded_by)
        .order_by(ReportSubmission.submitted_at.desc())
        .all()
    )

    return [
        {
            "submission_id": submission.submission_id,
            "report_id": submission.report_id,
            "title": f"{report.commodity or 'Crop'} Harvest Report",
            "commodity": report.commodity,
            "planting_date": report.planting_date,
            "harvest_date": planting_intent.harvest_date,
            "estimated_yield": report.estimated_yield,
            "encoded_by": report.encoded_by,
            "encoded_by_name": f"{user.first_name} {user.last_name}" if user else None,
            "status": submission.status,
            "submitted_at": submission.submitted_at,
            "revision_remarks": submission.revision_remarks,
            "revision_count": submission.revision_count,
        }
        for submission, report, planting_intent, user in reports
    ]


# ============================================================
# GET REPORTS FOR MUNICIPAL VALIDATION
# ============================================================

@router.get("/for-municipal-validation")
def get_reports_for_municipal_validation(
    db: Session = Depends(get_db),
):
    reports = (
        db.query(
            ReportSubmission,
            RawPlantReport,
            PlantingIntent,
            User,
        )
        .join(RawPlantReport, RawPlantReport.report_id == ReportSubmission.report_id)
        .join(ReportPlantingIntent, ReportPlantingIntent.report_id == RawPlantReport.report_id)
        .join(PlantingIntent, PlantingIntent.planting_intent_id == ReportPlantingIntent.planting_intent_id)
        .outerjoin(User, User.user_id == RawPlantReport.encoded_by)
        .filter(ReportSubmission.status == FOR_MUNICIPAL_VALIDATION)
        .order_by(ReportSubmission.submitted_at.desc())
        .all()
    )

    return [
        {
            "submission_id": submission.submission_id,
            "report_id": submission.report_id,
            "title": f"{report.commodity or 'Crop'} Harvest Report",
            "commodity": report.commodity,
            "planting_date": report.planting_date,
            "harvest_date": planting_intent.harvest_date,
            "estimated_yield": report.estimated_yield,
            "encoded_by": report.encoded_by,
            "encoded_by_name": f"{user.first_name} {user.last_name}" if user else None,
            "status": submission.status,
            "submitted_at": submission.submitted_at,
            "revision_remarks": submission.revision_remarks,
            "revision_count": submission.revision_count,
        }
        for submission, report, planting_intent, user in reports
    ]


# ============================================================
# GET REPORTS FOR PROVINCIAL VALIDATION
# ============================================================

@router.get("/for-provincial-validation")
def get_reports_for_provincial_validation(
    db: Session = Depends(get_db),
):
    reports = (
        db.query(
            ReportSubmission,
            RawPlantReport,
            PlantingIntent,
            User,
        )
        .join(RawPlantReport, RawPlantReport.report_id == ReportSubmission.report_id)
        .join(ReportPlantingIntent, ReportPlantingIntent.report_id == RawPlantReport.report_id)
        .join(PlantingIntent, PlantingIntent.planting_intent_id == ReportPlantingIntent.planting_intent_id)
        .outerjoin(User, User.user_id == RawPlantReport.encoded_by)
        .filter(ReportSubmission.status == FOR_PROVINCIAL_VALIDATION)
        .order_by(ReportSubmission.submitted_at.desc())
        .all()
    )

    return [
        {
            "submission_id": submission.submission_id,
            "report_id": submission.report_id,
            "title": f"{report.commodity or 'Crop'} Harvest Report",
            "commodity": report.commodity,
            "planting_date": report.planting_date,
            "harvest_date": planting_intent.harvest_date,
            "estimated_yield": report.estimated_yield,
            "encoded_by": report.encoded_by,
            "encoded_by_name": f"{user.first_name} {user.last_name}" if user else None,
            "status": submission.status,
            "submitted_at": submission.submitted_at,
            "revision_remarks": submission.revision_remarks,
            "revision_count": submission.revision_count,
        }
        for submission, report, planting_intent, user in reports
    ]


# ============================================================
# GET REPORTS FOR DA-RFO VALIDATION
# ============================================================

@router.get("/for-da-rfo-validation")
def get_reports_for_da_rfo_validation(
    db: Session = Depends(get_db),
):
    reports = (
        db.query(
            ReportSubmission,
            RawPlantReport,
            PlantingIntent,
            User,
        )
        .join(RawPlantReport, RawPlantReport.report_id == ReportSubmission.report_id)
        .join(ReportPlantingIntent, ReportPlantingIntent.report_id == RawPlantReport.report_id)
        .join(PlantingIntent, PlantingIntent.planting_intent_id == ReportPlantingIntent.planting_intent_id)
        .outerjoin(User, User.user_id == RawPlantReport.encoded_by)
        .filter(ReportSubmission.status == FOR_DA_RFO_VALIDATION)
        .order_by(ReportSubmission.submitted_at.desc())
        .all()
    )

    return [
        {
            "submission_id": submission.submission_id,
            "report_id": submission.report_id,
            "title": f"{report.commodity or 'Crop'} Harvest Report",
            "commodity": report.commodity,
            "planting_date": report.planting_date,
            "harvest_date": planting_intent.harvest_date,
            "estimated_yield": report.estimated_yield,
            "encoded_by": report.encoded_by,
            "encoded_by_name": f"{user.first_name} {user.last_name}" if user else None,
            "status": submission.status,
            "submitted_at": submission.submitted_at,
            "revision_remarks": submission.revision_remarks,
            "revision_count": submission.revision_count,
        }
        for submission, report, planting_intent, user in reports
    ]


# ============================================================
# GET REPORT SUBMISSION
# ============================================================

@router.get("/{report_id}")
def get_report_submission(
    report_id: int,
    db: Session = Depends(get_db),
):
    submission = (
        db.query(ReportSubmission)
        .filter(ReportSubmission.report_id == report_id)
        .first()
    )

    if not submission:
        raise HTTPException(status_code=404, detail="Report submission not found.")

    return {
        "submission_id": submission.submission_id,
        "report_id": submission.report_id,
        "status": submission.status,
        "current_validator_id": submission.current_validator_id,
        "current_validator_role": submission.current_validator_role,
        "revision_remarks": submission.revision_remarks,
        "revision_count": submission.revision_count,
        "submitted_at": submission.submitted_at,
        "approved_at": submission.approved_at,
    }