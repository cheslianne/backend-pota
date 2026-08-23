from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

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
# HELPER
# BUILD FRONTEND-FRIENDLY RESPONSE
# ============================================================

def build_planting_intent_response(
    planting_intent: PlantingIntent,
    farmer: Farmer,
    status: str,  # Fixed: removed quotes around "status"
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
            status,  # Fixed: using the status parameter instead of "Pending"

        "created_at":
            planting_intent.created_at,
    }

# ============================================================
# CREATE PLANTING INTENT
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
        farmer
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
        farmer
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
        farmer
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


    db.delete(db_planting)

    db.commit()


    return {
        "message":
            "Planting intent deleted successfully."
    }