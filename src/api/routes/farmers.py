from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from src.core.database import get_db
from src.models.farmers import Farmer
from src.api.schemas.farmers import (
    FarmerCreate,
    FarmerUpdate,
    FarmerResponse,
)

router = APIRouter(
    prefix="/farmers",
    tags=["Farmers"]
)


# ============================================================
# CREATE FARMER
# ============================================================

@router.post(
    "/",
    response_model=FarmerResponse,
    status_code=status.HTTP_201_CREATED
)
def create_farmer(
    farmer: FarmerCreate,
    db: Session = Depends(get_db)
):
    # Check duplicate RSBSA ID
    existing_farmer = (
        db.query(Farmer)
        .filter(Farmer.rsbsa_id == farmer.rsbsa_id)
        .first()
    )

    if existing_farmer:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="RSBSA ID already exists."
        )

    new_farmer = Farmer(
        rsbsa_id=farmer.rsbsa_id,
        first_name=farmer.first_name,
        last_name=farmer.last_name,
        address=farmer.address,
        sex=farmer.sex,
        birthdate=farmer.birthdate,
        email_address=farmer.email_address,
        phone_number=farmer.phone_number,
    )

    try:
        db.add(new_farmer)
        db.commit()
        db.refresh(new_farmer)

    except Exception as e:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create farmer: {str(e)}"
        )

    return new_farmer


# ============================================================
# GET ALL FARMERS
# ============================================================

@router.get(
    "/",
    response_model=list[FarmerResponse]
)
def get_farmers(
    db: Session = Depends(get_db)
):
    return (
        db.query(Farmer)
        .order_by(Farmer.farmer_id.desc())
        .all()
    )


# ============================================================
# GET SINGLE FARMER
# ============================================================

@router.get(
    "/{farmer_id}",
    response_model=FarmerResponse
)
def get_farmer(
    farmer_id: int,
    db: Session = Depends(get_db)
):
    farmer = (
        db.query(Farmer)
        .filter(Farmer.farmer_id == farmer_id)
        .first()
    )

    if not farmer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Farmer not found."
        )

    return farmer


# ============================================================
# UPDATE FARMER
# ============================================================

@router.put(
    "/{farmer_id}",
    response_model=FarmerResponse
)
def update_farmer(
    farmer_id: int,
    farmer_data: FarmerUpdate,
    db: Session = Depends(get_db)
):
    farmer = (
        db.query(Farmer)
        .filter(Farmer.farmer_id == farmer_id)
        .first()
    )

    if not farmer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Farmer not found."
        )

    if farmer_data.rsbsa_id is not None:
        existing_farmer = (
            db.query(Farmer)
            .filter(
                Farmer.rsbsa_id == farmer_data.rsbsa_id,
                Farmer.farmer_id != farmer_id
            )
            .first()
        )

        if existing_farmer:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="RSBSA ID already exists."
            )

    update_data = farmer_data.model_dump(
        exclude_unset=True
    )

    for field, value in update_data.items():
        setattr(farmer, field, value)

    try:
        db.commit()
        db.refresh(farmer)

    except Exception as e:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update farmer: {str(e)}"
        )

    return farmer


# ============================================================
# DELETE FARMER
# ============================================================

@router.delete(
    "/{farmer_id}",
    status_code=status.HTTP_204_NO_CONTENT
)
def delete_farmer(
    farmer_id: int,
    db: Session = Depends(get_db)
):
    farmer = (
        db.query(Farmer)
        .filter(Farmer.farmer_id == farmer_id)
        .first()
    )

    if not farmer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Farmer not found."
        )

    db.delete(farmer)
    db.commit()

    return None