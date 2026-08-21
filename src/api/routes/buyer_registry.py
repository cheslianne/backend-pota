from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from src.core.database import get_db

from src.models.buyer_registry import BuyerRegistry
from src.models.buyer_status import BuyerStatus

from src.api.schemas.buyer_registry import (
    BuyerRegistryCreate,
    BuyerRegistryUpdate,
    BuyerRegistryResponse,
    BuyerRegistryWithStatusResponse,
)

router = APIRouter()


# ============================================================
# CREATE BUYER REGISTRY
# ============================================================

@router.post(
    "/buyer-registry",
    response_model=BuyerRegistryResponse
)
def create_buyer_registry(
    buyer: BuyerRegistryCreate,
    db: Session = Depends(get_db)
):

    db_buyer = BuyerRegistry(
        organization=buyer.organization,
        contact_person=buyer.contact_person,
        phone_number=buyer.phone_number,
        email_address=buyer.email_address,
        address=buyer.address,
        message=buyer.message,
        document=buyer.document
    )

    db.add(db_buyer)

    db.flush()

    db_status = BuyerStatus(
        buyer_registry_id=db_buyer.buyer_registry_id,
        status="Pending"
    )

    db.add(db_status)

    db.commit()

    db.refresh(db_buyer)

    return db_buyer


# ============================================================
# GET ALL BUYER REGISTRIES WITH STATUS
# ============================================================

@router.get(
    "/buyer-registry",
    response_model=list[BuyerRegistryWithStatusResponse]
)
def get_all_buyer_registries(
    db: Session = Depends(get_db)
):

    results = (
        db.query(
            BuyerRegistry,
            BuyerStatus.status
        )
        .join(
            BuyerStatus,
            BuyerStatus.buyer_registry_id
            == BuyerRegistry.buyer_registry_id
        )
        .order_by(
            BuyerRegistry.buyer_registry_id.desc()
        )
        .all()
    )

    response = []

    for buyer, status in results:

        response.append(
            BuyerRegistryWithStatusResponse(
                buyer_registry_id=buyer.buyer_registry_id,
                organization=buyer.organization,
                contact_person=buyer.contact_person,
                phone_number=buyer.phone_number,
                email_address=buyer.email_address,
                address=buyer.address,
                message=buyer.message,
                document=buyer.document,
                status=status
            )
        )

    return response


# ============================================================
# GET SINGLE BUYER REGISTRY
# ============================================================

@router.get(
    "/buyer-registry/{buyer_registry_id}",
    response_model=BuyerRegistryResponse
)
def read_buyer_registry(
    buyer_registry_id: int,
    db: Session = Depends(get_db)
):

    db_buyer = (
        db.query(BuyerRegistry)
        .filter(
            BuyerRegistry.buyer_registry_id
            == buyer_registry_id
        )
        .first()
    )

    if not db_buyer:

        raise HTTPException(
            status_code=404,
            detail="Buyer registry not found"
        )

    return db_buyer


# ============================================================
# UPDATE BUYER REGISTRY
# ============================================================

@router.put(
    "/buyer-registry/{buyer_registry_id}",
    response_model=BuyerRegistryResponse
)
def update_buyer_registry(
    buyer_registry_id: int,
    buyer: BuyerRegistryUpdate,
    db: Session = Depends(get_db)
):

    db_buyer = (
        db.query(BuyerRegistry)
        .filter(
            BuyerRegistry.buyer_registry_id
            == buyer_registry_id
        )
        .first()
    )

    if not db_buyer:

        raise HTTPException(
            status_code=404,
            detail="Buyer registry not found"
        )

    update_data = buyer.model_dump(
        exclude_unset=True
    )

    for key, value in update_data.items():

        setattr(
            db_buyer,
            key,
            value
        )

    db.commit()

    db.refresh(db_buyer)

    return db_buyer


# ============================================================
# DELETE BUYER REGISTRY
# ============================================================

@router.delete(
    "/buyer-registry/{buyer_registry_id}"
)
def delete_buyer_registry(
    buyer_registry_id: int,
    db: Session = Depends(get_db)
):

    db_buyer = (
        db.query(BuyerRegistry)
        .filter(
            BuyerRegistry.buyer_registry_id
            == buyer_registry_id
        )
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
        "message":
        "Buyer registry deleted successfully."
    }