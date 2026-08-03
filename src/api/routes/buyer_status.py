from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from src.core.database import get_db
from src.models.buyer_status import BuyerStatus
from src.api.schemas.buyer_status import (
    BuyerStatusCreate,
    BuyerStatusUpdate,
    BuyerStatusResponse,
)

router = APIRouter()


@router.post("/", response_model=BuyerStatusResponse)
def create_buyer_status(
    buyer_status: BuyerStatusCreate,
    db: Session = Depends(get_db)
):
    db_status = BuyerStatus(**buyer_status.model_dump())

    db.add(db_status)
    db.commit()
    db.refresh(db_status)

    return db_status


@router.get("/{buyer_status_id}", response_model=BuyerStatusResponse)
def read_buyer_status(
    buyer_status_id: int,
    db: Session = Depends(get_db)
):
    db_status = (
        db.query(BuyerStatus)
        .filter(BuyerStatus.buyer_status_id == buyer_status_id)
        .first()
    )

    if not db_status:
        raise HTTPException(
            status_code=404,
            detail="Buyer status not found"
        )

    return db_status


@router.put("/{buyer_status_id}", response_model=BuyerStatusResponse)
def update_buyer_status(
    buyer_status_id: int,
    buyer_status: BuyerStatusUpdate,
    db: Session = Depends(get_db)
):
    db_status = (
        db.query(BuyerStatus)
        .filter(BuyerStatus.buyer_status_id == buyer_status_id)
        .first()
    )

    if not db_status:
        raise HTTPException(
            status_code=404,
            detail="Buyer status not found"
        )

    for key, value in buyer_status.model_dump(exclude_unset=True).items():
        setattr(db_status, key, value)

    db.commit()
    db.refresh(db_status)

    return db_status


@router.delete("/{buyer_status_id}")
def delete_buyer_status(
    buyer_status_id: int,
    db: Session = Depends(get_db)
):
    db_status = (
        db.query(BuyerStatus)
        .filter(BuyerStatus.buyer_status_id == buyer_status_id)
        .first()
    )

    if not db_status:
        raise HTTPException(
            status_code=404,
            detail="Buyer status not found"
        )

    db.delete(db_status)
    db.commit()

    return {
        "message": "Buyer status deleted successfully."
    }