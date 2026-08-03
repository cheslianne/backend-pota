from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from src.core.database import get_db
from src.models.buyer_registry import BuyerRegistry
from src.api.schemas.buyer_registry import (
    BuyerRegistryCreate,
    BuyerRegistryUpdate,
    BuyerRegistryResponse,
)

router = APIRouter()


@router.post("/buyer-registry", response_model=BuyerRegistryResponse)
def create_buyer_registry(
    buyer: BuyerRegistryCreate,
    db: Session = Depends(get_db)
):
    db_buyer = BuyerRegistry(**buyer.model_dump())

    db.add(db_buyer)
    db.commit()
    db.refresh(db_buyer)

    return db_buyer


@router.get("/buyer-registry/{buyer_registry_id}", response_model=BuyerRegistryResponse)
def read_buyer_registry(
    buyer_registry_id: int,
    db: Session = Depends(get_db)
):
    db_buyer = (
        db.query(BuyerRegistry)
        .filter(BuyerRegistry.buyer_registry_id == buyer_registry_id)
        .first()
    )

    if not db_buyer:
        raise HTTPException(
            status_code=404,
            detail="Buyer registry not found"
        )

    return db_buyer


@router.put("/buyer-registry/{buyer_registry_id}", response_model=BuyerRegistryResponse)
def update_buyer_registry(
    buyer_registry_id: int,
    buyer: BuyerRegistryUpdate,
    db: Session = Depends(get_db)
):
    db_buyer = (
        db.query(BuyerRegistry)
        .filter(BuyerRegistry.buyer_registry_id == buyer_registry_id)
        .first()
    )

    if not db_buyer:
        raise HTTPException(
            status_code=404,
            detail="Buyer registry not found"
        )

    for key, value in buyer.model_dump(exclude_unset=True).items():
        setattr(db_buyer, key, value)

    db.commit()
    db.refresh(db_buyer)

    return db_buyer


@router.delete("/buyer-registry/{buyer_registry_id}")
def delete_buyer_registry(
    buyer_registry_id: int,
    db: Session = Depends(get_db)
):
    db_buyer = (
        db.query(BuyerRegistry)
        .filter(BuyerRegistry.buyer_registry_id == buyer_registry_id)
        .first()
    )

    if not db_buyer:
        raise HTTPException(
            status_code=404,
            detail="Buyer registry not found"
        )

    db.delete(db_buyer)
    db.commit()

    return {
        "message": "Buyer registry deleted successfully."
    }