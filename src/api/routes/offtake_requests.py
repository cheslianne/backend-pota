from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from src.core.database import get_db
from src.models.offtake_requests import OfftakeRequest
from src.models.buyers import Buyer
from src.models.farmers import Farmer
from src.api.services.email_service import send_offtake_request_email

from src.api.schemas.offtake_requests import (
    OfftakeRequestCreate,
    OfftakeRequestUpdate,
    OfftakeRequestResponse,
)


router = APIRouter()


# ============================================================
# CREATE OFFTAKE REQUEST
# ============================================================

@router.post("/", response_model=OfftakeRequestResponse)
async def create_offtake_request(
    request: OfftakeRequestCreate,
    db: Session = Depends(get_db)
):

    # ========================================================
    # 1. CHECK IF FARMER EXISTS
    # ========================================================

    farmer = (
        db.query(Farmer)
        .filter(Farmer.farmer_id == request.farmer_id)
        .first()
    )

    if not farmer:
        raise HTTPException(
            status_code=404,
            detail="Farmer not found"
        )

    # ========================================================
    # 2. CREATE OFFTAKE REQUEST
    # ========================================================

    db_request = OfftakeRequest(
        **request.model_dump()
    )

    # ========================================================
    # 3. SAVE TO DATABASE
    # ========================================================

    db.add(db_request)
    db.commit()
    db.refresh(db_request)

    # ========================================================
    # 4. GET ALL BUYERS WITH EMAIL
    # ========================================================

    buyers = (
        db.query(Buyer)
        .filter(Buyer.email_address.isnot(None))
        .all()
    )

    # ========================================================
    # DEBUG
    # ========================================================

    print("========================================")
    print("OFFTAKE EMAIL DEBUG")
    print("Number of buyers with email:", len(buyers))

    for buyer in buyers:
        print(
            "Buyer:",
            buyer.buyer_name,
            "| Email:",
            buyer.email_address
        )

    print("========================================")

    # ========================================================
    # 5. SEND EMAIL NOTIFICATION
    # ========================================================

    for buyer in buyers:

        try:

            print(
                f">>> Sending offtake email to: "
                f"{buyer.email_address}"
            )

            message_id = await send_offtake_request_email(
                buyer_email=buyer.email_address,
                buyer_name=buyer.buyer_name,
                commodity=db_request.commodity,
                quantity=db_request.quantity,
                selling_price=db_request.selling_price,
                harvest_date=db_request.harvest_date,
                farmer_location=farmer.address,
            )

            print(
                f">>> OFFTAKE EMAIL SENT SUCCESSFULLY "
                f"to {buyer.email_address}"
            )

            print(
                f">>> Brevo message_id: {message_id}"
            )

        except Exception as e:

            print(
                f">>> OFFTAKE EMAIL FAILED "
                f"to {buyer.email_address}"
            )

            print(
                f">>> ERROR: {type(e).__name__}: {str(e)}"
            )

    # ========================================================
    # 6. RETURN CREATED REQUEST
    # ========================================================

    return db_request


# ============================================================
# GET ALL OFFTAKE REQUESTS
# ============================================================

@router.get(
    "/",
    response_model=list[OfftakeRequestResponse]
)
def get_offtake_requests(
    db: Session = Depends(get_db)
):

    requests = (
        db.query(OfftakeRequest)
        .order_by(
            OfftakeRequest.offtake_request_id.desc()
        )
        .all()
    )

    return requests


# ============================================================
# GET SINGLE OFFTAKE REQUEST
# ============================================================

@router.get(
    "/{offtake_request_id}",
    response_model=OfftakeRequestResponse
)
def read_offtake_request(
    offtake_request_id: int,
    db: Session = Depends(get_db)
):

    db_request = (
        db.query(OfftakeRequest)
        .filter(
            OfftakeRequest.offtake_request_id
            == offtake_request_id
        )
        .first()
    )

    if not db_request:
        raise HTTPException(
            status_code=404,
            detail="Offtake request not found"
        )

    return db_request


# ============================================================
# UPDATE OFFTAKE REQUEST
# ============================================================

@router.put(
    "/{offtake_request_id}",
    response_model=OfftakeRequestResponse
)
def update_offtake_request(
    offtake_request_id: int,
    request: OfftakeRequestUpdate,
    db: Session = Depends(get_db)
):

    db_request = (
        db.query(OfftakeRequest)
        .filter(
            OfftakeRequest.offtake_request_id
            == offtake_request_id
        )
        .first()
    )

    if not db_request:
        raise HTTPException(
            status_code=404,
            detail="Offtake request not found"
        )

    for key, value in request.model_dump(
        exclude_unset=True
    ).items():

        setattr(
            db_request,
            key,
            value
        )

    db.commit()
    db.refresh(db_request)

    return db_request


# ============================================================
# DELETE OFFTAKE REQUEST
# ============================================================

@router.delete("/{offtake_request_id}")
def delete_offtake_request(
    offtake_request_id: int,
    db: Session = Depends(get_db)
):

    db_request = (
        db.query(OfftakeRequest)
        .filter(
            OfftakeRequest.offtake_request_id
            == offtake_request_id
        )
        .first()
    )

    if not db_request:
        raise HTTPException(
            status_code=404,
            detail="Offtake request not found"
        )

    db.delete(db_request)
    db.commit()

    return {
        "message": "Offtake request deleted successfully."
    }