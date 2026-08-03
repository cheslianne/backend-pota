from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from src.core.database import get_db
from src.models.offtake_requests import OfftakeRequest
from src.api.schemas.offtake_requests import (
    OfftakeRequestCreate,
    OfftakeRequestUpdate,
    OfftakeRequestResponse,
)

router = APIRouter()


@router.post("/", response_model=OfftakeRequestResponse)
def create_offtake_request(
    request: OfftakeRequestCreate,
    db: Session = Depends(get_db)
):
    db_request = OfftakeRequest(**request.model_dump())

    db.add(db_request)
    db.commit()
    db.refresh(db_request)

    return db_request


@router.get("/{offtake_request_id}", response_model=OfftakeRequestResponse)
def read_offtake_request(
    offtake_request_id: int,
    db: Session = Depends(get_db)
):
    db_request = (
        db.query(OfftakeRequest)
        .filter(
            OfftakeRequest.offtake_request_id == offtake_request_id
        )
        .first()
    )

    if not db_request:
        raise HTTPException(
            status_code=404,
            detail="Offtake request not found"
        )

    return db_request


@router.put("/{offtake_request_id}", response_model=OfftakeRequestResponse)
def update_offtake_request(
    offtake_request_id: int,
    request: OfftakeRequestUpdate,
    db: Session = Depends(get_db)
):
    db_request = (
        db.query(OfftakeRequest)
        .filter(
            OfftakeRequest.offtake_request_id == offtake_request_id
        )
        .first()
    )

    if not db_request:
        raise HTTPException(
            status_code=404,
            detail="Offtake request not found"
        )

    for key, value in request.model_dump(exclude_unset=True).items():
        setattr(db_request, key, value)

    db.commit()
    db.refresh(db_request)

    return db_request


@router.delete("/{offtake_request_id}")
def delete_offtake_request(
    offtake_request_id: int,
    db: Session = Depends(get_db)
):
    db_request = (
        db.query(OfftakeRequest)
        .filter(
            OfftakeRequest.offtake_request_id == offtake_request_id
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