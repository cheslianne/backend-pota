from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Form
from sqlalchemy.orm import Session
import os
import uuid
from datetime import datetime

from src.core.database import get_db

from src.models.planting_intents import PlantingIntent
from src.models.farmers import Farmer
from src.models.report_submission import ReportSubmission
from src.models.report_planting_intents import ReportPlantingIntent
from src.models.raw_plant_reports import RawPlantReport

from src.api.schemas.planting_intents import (
    PlantingIntentCreate,
    PlantingIntentUpdate,
    PlantingIntentResponse,
)

router = APIRouter()

# ============================================================
# UPLOAD DIRECTORY CONFIGURATION
# ============================================================

UPLOAD_DIR = "uploads/planting_intent_attachments"

os.makedirs(
    UPLOAD_DIR,
    exist_ok=True
)

# ============================================================
# HELPER
# BUILD FRONTEND-FRIENDLY RESPONSE
# ============================================================

def build_planting_intent_response(
    planting_intent: PlantingIntent,
    farmer: Farmer,
    status: str,
):
    return {
        "planting_intent_id":
            planting_intent.planting_intent_id,

        "farmer_id":
            planting_intent.farmer_id,

        "farmer_name":
            f"{farmer.first_name} {farmer.last_name}",

        "location":
            farmer.address,

        "commodity":
            planting_intent.commodity,

        "planting_date":
            planting_intent.planting_date,

        "harvest_date":
            planting_intent.harvest_date,

        "volume":
            planting_intent.volume,

        "remarks":
            planting_intent.remarks,

        "status":
            status,

        "created_at":
            planting_intent.created_at,
            
        "attachment_url":  # Add this field
            f"/api/planting-intents/{planting_intent.planting_intent_id}/attachment"
            if planting_intent.attachment_path
            else None,
            
        "notes":  # Add this field
            planting_intent.notes,
    }

# ============================================================
# CREATE PLANTING INTENT WITH ATTACHMENT (NEW ROUTE)
# ============================================================

@router.post(
    "/with-attachment",
    response_model=PlantingIntentResponse
)
async def create_planting_intent_with_attachment(
    farmer_id: int = Form(...),
    commodity: str = Form(...),
    volume: float = Form(...),
    planting_date: str = Form(...),
    harvest_date: str = Form(...),
    notes: str | None = Form(None),
    attachment: UploadFile | None = File(None),
    db: Session = Depends(get_db)
):
    """
    Create a planting intent with optional file attachment.
    """
    
    # --------------------------------------------------------
    # CHECK IF FARMER EXISTS
    # --------------------------------------------------------
    
    farmer = (
        db.query(Farmer)
        .filter(
            Farmer.farmer_id == farmer_id
        )
        .first()
    )

    if not farmer:
        raise HTTPException(
            status_code=404,
            detail="Farmer not found"
        )

    # --------------------------------------------------------
    # HANDLE ATTACHMENT
    # --------------------------------------------------------
    
    attachment_path = None
    
    if attachment:
        # Validate file extension
        filename = attachment.filename or ""
        extension = os.path.splitext(filename)[1].lower()
        
        allowed_extensions = {
            ".pdf", ".jpg", ".jpeg", ".png", 
            ".gif", ".doc", ".docx", ".xls", ".xlsx"
        }
        
        if extension not in allowed_extensions:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file type. Allowed: {', '.join(allowed_extensions)}"
            )
        
        # Validate file size (max 5MB)
        file_content = await attachment.read()
        if len(file_content) > 5 * 1024 * 1024:
            raise HTTPException(
                status_code=400,
                detail="File size exceeds 5MB limit"
            )
        
        # Save file with unique name
        unique_filename = f"{uuid.uuid4()}{extension}"
        attachment_path = os.path.join(UPLOAD_DIR, unique_filename)
        
        with open(attachment_path, "wb") as file:
            file.write(file_content)
    
    # --------------------------------------------------------
    # CREATE PLANTING INTENT
    # --------------------------------------------------------
    
    # Parse dates
    try:
        planting_date_obj = datetime.strptime(planting_date, "%Y-%m-%d").date()
        harvest_date_obj = datetime.strptime(harvest_date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="Invalid date format. Use YYYY-MM-DD"
        )
    
    db_planting = PlantingIntent(
        farmer_id=farmer_id,
        commodity=commodity,
        volume=volume,
        planting_date=planting_date_obj,
        harvest_date=harvest_date_obj,
        notes=notes,
        attachment_path=attachment_path,
        status="Pending"  # Default status
    )

    db.add(db_planting)
    db.commit()
    db.refresh(db_planting)

    # --------------------------------------------------------
    # RETURN WITH FARMER DETAILS
    # --------------------------------------------------------
    
    return build_planting_intent_response(
        db_planting,
        farmer,
        "Pending"
    )

# ============================================================
# CREATE PLANTING INTENT (Original - without attachment)
# ============================================================

@router.post(
    "/",
    response_model=PlantingIntentResponse
)
def create_planting_intent(
    planting_intent: PlantingIntentCreate,
    db: Session = Depends(get_db)
):

    # --------------------------------------------------------
    # CHECK IF FARMER EXISTS
    # --------------------------------------------------------

    farmer = (
        db.query(Farmer)
        .filter(
            Farmer.farmer_id
            == planting_intent.farmer_id
        )
        .first()
    )

    if not farmer:
        raise HTTPException(
            status_code=404,
            detail="Farmer not found"
        )

    # --------------------------------------------------------
    # CREATE PLANTING INTENT
    # --------------------------------------------------------

    db_planting = PlantingIntent(
        **planting_intent.model_dump()
    )

    db.add(db_planting)
    db.commit()
    db.refresh(db_planting)

    # --------------------------------------------------------
    # RETURN WITH FARMER DETAILS
    # --------------------------------------------------------

    return build_planting_intent_response(
        db_planting,
        farmer,
        "Pending"
    )

# ============================================================
# GET ATTACHMENT
# ============================================================

from fastapi.responses import FileResponse

@router.get("/{planting_intent_id}/attachment")
def get_planting_intent_attachment(
    planting_intent_id: int,
    db: Session = Depends(get_db)
):
    """
    Download the attachment for a planting intent.
    """
    
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
            detail="Planting intent not found"
        )
    
    if not planting_intent.attachment_path:
        raise HTTPException(
            status_code=404,
            detail="No attachment found for this planting intent"
        )
    
    file_path = os.path.abspath(planting_intent.attachment_path)
    
    if not os.path.exists(file_path):
        raise HTTPException(
            status_code=404,
            detail="Attachment file does not exist on the server"
        )
    
    # Determine media type
    extension = os.path.splitext(file_path)[1].lower()
    media_type = "application/octet-stream"
    
    if extension == ".pdf":
        media_type = "application/pdf"
    elif extension in [".jpg", ".jpeg"]:
        media_type = "image/jpeg"
    elif extension == ".png":
        media_type = "image/png"
    elif extension == ".gif":
        media_type = "image/gif"
    elif extension in [".doc", ".docx"]:
        media_type = "application/msword"
    elif extension == ".docx":
        media_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    
    return FileResponse(
        path=file_path,
        media_type=media_type,
        filename=os.path.basename(file_path),
        content_disposition_type="inline"  # or "attachment" to force download
    )

# ============================================================
# GET ALL PLANTING INTENTS
# IMPORTANT:
# Keep this BEFORE /{planting_intent_id}
# ============================================================

@router.get(
    "/",
    response_model=list[PlantingIntentResponse]
)
def read_planting_intents(
    db: Session = Depends(get_db)
):
    results = (
        db.query(
            PlantingIntent,
            Farmer,
            ReportSubmission.status
        )
        .join(
            Farmer,
            PlantingIntent.farmer_id
            == Farmer.farmer_id
        )
        .outerjoin(
            ReportPlantingIntent,
            PlantingIntent.planting_intent_id
            == ReportPlantingIntent.planting_intent_id
        )
        .outerjoin(
            RawPlantReport,
            ReportPlantingIntent.report_id
            == RawPlantReport.report_id
        )
        .outerjoin(
            ReportSubmission,
            RawPlantReport.report_id
            == ReportSubmission.report_id
        )
        .order_by(
            PlantingIntent.planting_intent_id.desc()
        )
        .all()
    )

    return [
        build_planting_intent_response(
            planting_intent,
            farmer,
            status or "Pending"
        )
        for planting_intent, farmer, status in results
    ]

# ============================================================
# GET SINGLE PLANTING INTENT
# ============================================================

@router.get(
    "/{planting_intent_id}",
    response_model=PlantingIntentResponse
)
def read_planting_intent(
    planting_intent_id: int,
    db: Session = Depends(get_db)
):

    result = (
        db.query(
            PlantingIntent,
            Farmer
        )
        .join(
            Farmer,
            PlantingIntent.farmer_id
            == Farmer.farmer_id
        )
        .filter(
            PlantingIntent.planting_intent_id
            == planting_intent_id
        )
        .first()
    )

    if not result:
        raise HTTPException(
            status_code=404,
            detail="Planting intent not found"
        )

    planting_intent, farmer = result

    return build_planting_intent_response(
        planting_intent,
        farmer,
        get_planting_intent_status(
            planting_intent.planting_intent_id,
            db,
        )
    )

# ============================================================
# UPDATE PLANTING INTENT
# ============================================================

@router.put(
    "/{planting_intent_id}",
    response_model=PlantingIntentResponse
)
def update_planting_intent(
    planting_intent_id: int,
    planting_intent: PlantingIntentUpdate,
    db: Session = Depends(get_db)
):

    db_planting = (
        db.query(PlantingIntent)
        .filter(
            PlantingIntent.planting_intent_id
            == planting_intent_id
        )
        .first()
    )

    if not db_planting:
        raise HTTPException(
            status_code=404,
            detail="Planting intent not found"
        )

    # --------------------------------------------------------
    # GET UPDATE DATA
    # --------------------------------------------------------

    update_data = planting_intent.model_dump(
        exclude_unset=True
    )

    # --------------------------------------------------------
    # IF FARMER ID IS BEING UPDATED,
    # CHECK THAT FARMER EXISTS
    # --------------------------------------------------------

    if "farmer_id" in update_data:

        farmer = (
            db.query(Farmer)
            .filter(
                Farmer.farmer_id
                == update_data["farmer_id"]
            )
            .first()
        )

        if not farmer:
            raise HTTPException(
                status_code=404,
                detail="Farmer not found"
            )

    # --------------------------------------------------------
    # APPLY UPDATES
    # --------------------------------------------------------

    for key, value in update_data.items():

        setattr(
            db_planting,
            key,
            value
        )

    db.commit()
    db.refresh(db_planting)

    # --------------------------------------------------------
    # GET UPDATED FARMER
    # --------------------------------------------------------

    farmer = (
        db.query(Farmer)
        .filter(
            Farmer.farmer_id
            == db_planting.farmer_id
        )
        .first()
    )

    if not farmer:
        raise HTTPException(
            status_code=404,
            detail="Farmer not found"
        )

    return build_planting_intent_response(
        db_planting,
        farmer,
        get_planting_intent_status(
            db_planting.planting_intent_id,
            db,
        )
    )

# ============================================================
# DELETE PLANTING INTENT
# ============================================================

@router.delete(
    "/{planting_intent_id}"
)
def delete_planting_intent(
    planting_intent_id: int,
    db: Session = Depends(get_db)
):

    db_planting = (
        db.query(PlantingIntent)
        .filter(
            PlantingIntent.planting_intent_id
            == planting_intent_id
        )
        .first()
    )

    if not db_planting:
        raise HTTPException(
            status_code=404,
            detail="Planting intent not found"
        )
    
    # Delete the attachment file if it exists
    if db_planting.attachment_path:
        file_path = os.path.abspath(db_planting.attachment_path)
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except Exception as e:
                print(f"Warning: Could not delete attachment file: {e}")

    db.delete(db_planting)
    db.commit()

    return {
        "message":
            "Planting intent deleted successfully."
    }


def get_planting_intent_status(
    planting_intent_id: int,
    db: Session,
):
    result = (
        db.query(ReportSubmission.status)
        .join(
            RawPlantReport,
            RawPlantReport.report_id == ReportSubmission.report_id,
        )
        .join(
            ReportPlantingIntent,
            ReportPlantingIntent.report_id == RawPlantReport.report_id,
        )
        .filter(
            ReportPlantingIntent.planting_intent_id == planting_intent_id,
        )
        .order_by(ReportSubmission.report_id.desc())
        .first()
    )
    return result[0] if result and result[0] else "Pending"