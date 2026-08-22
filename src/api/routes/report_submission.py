from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from src.core.database import get_db

from src.models.raw_plant_reports import RawPlantReport
from src.models.report_submission import ReportSubmission
from src.models.report_validation_history import ReportValidationHistory


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
# AEW
# DRAFT → MUNICIPAL
# REVISION_REQUIRED → MUNICIPAL
# ============================================================

@router.post("/{report_id}/submit")
def submit_report(
    report_id: int,
    db: Session = Depends(get_db),
):
    # --------------------------------------------------------
    # GET RAW PLANT REPORT
    # --------------------------------------------------------

    report = (
        db.query(RawPlantReport)
        .filter(
            RawPlantReport.report_id == report_id
        )
        .first()
    )

    if not report:
        raise HTTPException(
            status_code=404,
            detail="Report not found."
        )

    # --------------------------------------------------------
    # GET SUBMISSION
    # --------------------------------------------------------

    submission = (
        db.query(ReportSubmission)
        .filter(
            ReportSubmission.report_id == report_id
        )
        .first()
    )

    if not submission:
        raise HTTPException(
            status_code=404,
            detail="Report submission not found."
        )

    # --------------------------------------------------------
    # INITIAL SUBMISSION
    # DRAFT → FOR MUNICIPAL VALIDATION
    # --------------------------------------------------------

    if submission.status == DRAFT:

        submission.status = FOR_MUNICIPAL_VALIDATION

        submission.current_validator_id = (
            report.municipal_coordinator_id
        )

        submission.current_validator_role = (
            "municipal_coordinator"
        )

        submission.submitted_at = datetime.utcnow()

    # --------------------------------------------------------
    # RESUBMISSION AFTER REVISION
    # REVISION_REQUIRED → FOR MUNICIPAL VALIDATION
    # --------------------------------------------------------

    elif submission.status == REVISION_REQUIRED:

        submission.status = FOR_MUNICIPAL_VALIDATION

        submission.current_validator_id = (
            report.municipal_coordinator_id
        )

        submission.current_validator_role = (
            "municipal_coordinator"
        )

        submission.revision_remarks = None

        submission.submitted_at = datetime.utcnow()

    else:

        raise HTTPException(
            status_code=400,
            detail=(
                "Report cannot be submitted because "
                "it is not in DRAFT or REVISION_REQUIRED status."
            )
        )

    # --------------------------------------------------------
    # ADD VALIDATION HISTORY
    # --------------------------------------------------------

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
        "current_validator_id": (
            submission.current_validator_id
        ),
        "current_validator_role": (
            submission.current_validator_role
        ),
    }


# ============================================================
# APPROVE REPORT
# MUNICIPAL → PROVINCIAL → DA-RFO → FINAL
# ============================================================

@router.post("/{report_id}/approve")
def approve_report(
    report_id: int,
    validator_id: int,
    validator_role: str,
    remarks: str | None = None,
    db: Session = Depends(get_db),
):
    submission = (
        db.query(ReportSubmission)
        .filter(
            ReportSubmission.report_id == report_id
        )
        .first()
    )

    if not submission:
        raise HTTPException(
            status_code=404,
            detail="Report submission not found."
        )

    # --------------------------------------------------------
    # MUNICIPAL APPROVAL
    # --------------------------------------------------------

    if validator_role == "municipal_coordinator":

        if submission.status != FOR_MUNICIPAL_VALIDATION:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Report is not awaiting "
                    "municipal validation."
                )
            )

        submission.status = FOR_PROVINCIAL_VALIDATION

        submission.current_validator_id = None

        submission.current_validator_role = (
            "provincial_coordinator"
        )

    # --------------------------------------------------------
    # PROVINCIAL APPROVAL
    # --------------------------------------------------------

    elif validator_role == "provincial_coordinator":

        if submission.status != FOR_PROVINCIAL_VALIDATION:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Report is not awaiting "
                    "provincial validation."
                )
            )

        submission.status = FOR_DA_RFO_VALIDATION

        submission.current_validator_id = None

        submission.current_validator_role = "darfo"

    # --------------------------------------------------------
    # DA-RFO FINAL APPROVAL
    # --------------------------------------------------------

    elif validator_role == "darfo":

        if submission.status != FOR_DA_RFO_VALIDATION:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Report is not awaiting "
                    "DA-RFO validation."
                )
            )

        submission.status = FINAL_APPROVED

        submission.current_validator_id = None

        submission.current_validator_role = None

        submission.approved_at = datetime.utcnow()

    else:

        raise HTTPException(
            status_code=400,
            detail="Invalid validator role."
        )

    # --------------------------------------------------------
    # ADD VALIDATION HISTORY
    # --------------------------------------------------------

    history = ReportValidationHistory(
        submission_id=submission.submission_id,
        action="APPROVED",
        performed_by=validator_id,
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
        "current_validator_id": (
            submission.current_validator_id
        ),
        "current_validator_role": (
            submission.current_validator_role
        ),
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
    db: Session = Depends(get_db),
):
    # --------------------------------------------------------
    # CHECK REMARKS
    # --------------------------------------------------------

    if not remarks.strip():
        raise HTTPException(
            status_code=400,
            detail="Revision remarks are required."
        )

    # --------------------------------------------------------
    # GET SUBMISSION
    # --------------------------------------------------------

    submission = (
        db.query(ReportSubmission)
        .filter(
            ReportSubmission.report_id == report_id
        )
        .first()
    )

    if not submission:
        raise HTTPException(
            status_code=404,
            detail="Report submission not found."
        )

    # --------------------------------------------------------
    # VALIDATE CURRENT STAGE
    # --------------------------------------------------------

    valid_stage = False

    if (
        validator_role == "municipal_coordinator"
        and submission.status == FOR_MUNICIPAL_VALIDATION
    ):
        valid_stage = True

    elif (
        validator_role == "provincial_coordinator"
        and submission.status == FOR_PROVINCIAL_VALIDATION
    ):
        valid_stage = True

    elif (
        validator_role == "darfo"
        and submission.status == FOR_DA_RFO_VALIDATION
    ):
        valid_stage = True

    if not valid_stage:
        raise HTTPException(
            status_code=400,
            detail=(
                "Validator is not authorized "
                "for the current report stage."
            )
        )

    # --------------------------------------------------------
    # MARK REPORT FOR REVISION
    # --------------------------------------------------------

    submission.status = REVISION_REQUIRED

    submission.current_validator_id = None

    submission.current_validator_role = None

    submission.revision_remarks = remarks

    submission.revision_count += 1

    # --------------------------------------------------------
    # ADD VALIDATION HISTORY
    # --------------------------------------------------------

    history = ReportValidationHistory(
        submission_id=submission.submission_id,
        action="REVISION_REQUIRED",
        performed_by=validator_id,
        role=validator_role,
        remarks=remarks,
    )

    db.add(history)

    db.commit()
    db.refresh(submission)

    return {
        "message": "Report marked for revision.",
        "report_id": report_id,
        "status": submission.status,
        "revision_remarks": (
            submission.revision_remarks
        ),
        "revision_count": (
            submission.revision_count
        ),
    }

# ============================================================
# GET MY REPORTS
# ============================================================

@router.get("/my-reports")
def get_my_reports(
    db: Session = Depends(get_db),
):
    reports = (
        db.query(
            ReportSubmission,
            RawPlantReport
        )
        .join(
            RawPlantReport,
            RawPlantReport.report_id
            == ReportSubmission.report_id
        )
        .all()
    )

    return [
        {
            "submission_id": submission.submission_id,
            "report_id": submission.report_id,

            "title": (
                getattr(report, "title", None)
                or getattr(report, "report_title", None)
                or f"{getattr(report, 'commodity', 'Crop')} Harvest Report"
            ),

            "commodity": getattr(
                report,
                "commodity",
                None
            ),

            "planting_date": getattr(
                report,
                "planting_date",
                None
            ),

            "created_at": getattr(
                report,
                "created_at",
                None
            ),

            "status": submission.status,

            "current_validator_id": (
                submission.current_validator_id
            ),

            "current_validator_role": (
                submission.current_validator_role
            ),

            "revision_remarks": (
                submission.revision_remarks
            ),

            "revision_count": (
                submission.revision_count
            ),

            "submitted_at": (
                submission.submitted_at
            ),

            "approved_at": (
                submission.approved_at
            ),
        }
        for submission, report in reports
    ]
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
            RawPlantReport
        )
        .join(
            RawPlantReport,
            RawPlantReport.report_id
            == ReportSubmission.report_id
        )
        .filter(
            ReportSubmission.status != DRAFT
        )
        .order_by(
            ReportSubmission.submitted_at.desc()
        )
        .all()
    )

    return [
        {
            "submission_id": submission.submission_id,

            "report_id": submission.report_id,

            "title": (
                getattr(report, "title", None)
                or getattr(report, "report_title", None)
                or f"{getattr(report, 'commodity', 'Crop')} Harvest Report"
            ),

            "commodity": getattr(
                report,
                "commodity",
                None
            ),

            "planting_date": getattr(
                report,
                "planting_date",
                None
            ),

            "estimated_yield": getattr(
                report,
                "estimated_yield",
                None
            ),

            "encoded_by": getattr(
                report,
                "encoded_by",
                None
            ),

            "municipal_coordinator_id": getattr(
                report,
                "municipal_coordinator_id",
                None
            ),

            "status": submission.status,

            "current_validator_id": (
                submission.current_validator_id
            ),

            "current_validator_role": (
                submission.current_validator_role
            ),

            "revision_remarks": (
                submission.revision_remarks
            ),

            "revision_count": (
                submission.revision_count
            ),

            "submitted_at": (
                submission.submitted_at
            ),

            "approved_at": (
                submission.approved_at
            ),
        }
        for submission, report in reports
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
        .filter(
            ReportSubmission.report_id == report_id
        )
        .first()
    )

    if not submission:
        raise HTTPException(
            status_code=404,
            detail="Report submission not found."
        )

    return {
        "submission_id": submission.submission_id,
        "report_id": submission.report_id,
        "status": submission.status,
        "current_validator_id": (
            submission.current_validator_id
        ),
        "current_validator_role": (
            submission.current_validator_role
        ),
        "revision_remarks": (
            submission.revision_remarks
        ),
        "revision_count": (
            submission.revision_count
        ),
        "submitted_at": (
            submission.submitted_at
        ),
        "approved_at": (
            submission.approved_at
        ),
    }

# ============================================================
# GET VALIDATION HISTORY
# ============================================================

@router.get("/{report_id}/history")
def get_validation_history(
    report_id: int,
    db: Session = Depends(get_db),
):
    submission = (
        db.query(ReportSubmission)
        .filter(
            ReportSubmission.report_id == report_id
        )
        .first()
    )

    if not submission:
        raise HTTPException(
            status_code=404,
            detail="Report submission not found."
        )

    history = (
        db.query(ReportValidationHistory)
        .filter(
            ReportValidationHistory.submission_id
            == submission.submission_id
        )
        .order_by(
            ReportValidationHistory.created_at.asc()
        )
        .all()
    )

    return [
        {
            "history_id": item.history_id,
            "action": item.action,
            "performed_by": item.performed_by,
            "role": item.role,
            "remarks": item.remarks,
            "created_at": item.created_at,
        }
        for item in history
    ]