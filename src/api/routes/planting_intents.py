from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from src.core.database import get_db
from src.models.planting_intents import PlantingIntent
from src.api.schemas.planting_intents import (
    PlantingIntentCreate,
    PlantingIntentUpdate,
    PlantingIntentResponse,
)

router = APIRouter()


@router.post("/", response_model=PlantingIntentResponse)
def create_planting_intent(
    planting_intent: PlantingIntentCreate,
    db: Session = Depends(get_db)
):
    db_planting = PlantingIntent(**planting_intent.model_dump())

    db.add(db_planting)
    db.commit()
    db.refresh(db_planting)

    return db_planting


@router.get("/{planting_intent_id}", response_model=PlantingIntentResponse)
def read_planting_intent(
    planting_intent_id: int,
    db: Session = Depends(get_db)
):
    db_planting = (
        db.query(PlantingIntent)
        .filter(
            PlantingIntent.planting_intent_id == planting_intent_id
        )
        .first()
    )

    if not db_planting:
        raise HTTPException(
            status_code=404,
            detail="Planting intent not found"
        )

    return db_planting


@router.put("/{planting_intent_id}", response_model=PlantingIntentResponse)
def update_planting_intent(
    planting_intent_id: int,
    planting_intent: PlantingIntentUpdate,
    db: Session = Depends(get_db)
):
    db_planting = (
        db.query(PlantingIntent)
        .filter(
            PlantingIntent.planting_intent_id == planting_intent_id
        )
        .first()
    )

    if not db_planting:
        raise HTTPException(
            status_code=404,
            detail="Planting intent not found"
        )

    for key, value in planting_intent.model_dump(exclude_unset=True).items():
        setattr(db_planting, key, value)

    db.commit()
    db.refresh(db_planting)

    return db_planting


@router.delete("/{planting_intent_id}")
def delete_planting_intent(
    planting_intent_id: int,
    db: Session = Depends(get_db)
):
    db_planting = (
        db.query(PlantingIntent)
        .filter(
            PlantingIntent.planting_intent_id == planting_intent_id
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
        "message": "Planting intent deleted successfully."
    }