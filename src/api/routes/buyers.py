# src/api/routes/buyers.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from src.core.database import get_db
from src.models.buyers import Buyer
from src.api.schemas.buyers import BuyerCreate, BuyerUpdate, BuyerResponse

router = APIRouter()

@router.post("/buyers", response_model=BuyerResponse)
def create_buyer(buyer: BuyerCreate, db: Session = Depends(get_db)):
    db_buyer = Buyer(**buyer.dict())
    db.add(db_buyer)
    db.commit()
    db.refresh(db_buyer)
    return db_buyer

@router.get("/buyers/{buyer_id}", response_model=BuyerResponse)
def read_buyer(buyer_id: int, db: Session = Depends(get_db)):
    db_buyer = db.query(Buyer).filter(Buyer.buyer_id == buyer_id).first()
    if not db_buyer:
        raise HTTPException(status_code=404, detail="Buyer not found")
    return db_buyer

@router.put("/buyers/{buyer_id}", response_model=BuyerResponse)
def update_buyer(buyer_id: int, buyer: BuyerUpdate, db: Session = Depends(get_db)):
    db_buyer = db.query(Buyer).filter(Buyer.buyer_id == buyer_id).first()
    if not db_buyer:
        raise HTTPException(status_code=404, detail="Buyer not found")
    for key, value in buyer.dict(exclude_unset=True).items():
        setattr(db_buyer, key, value)
    db.commit()
    db.refresh(db_buyer)
    return db_buyer

@router.delete("/buyers/{buyer_id}")
def delete_buyer(buyer_id: int, db: Session = Depends(get_db)):
    db_buyer = db.query(Buyer).filter(Buyer.buyer_id == buyer_id).first()
    if not db_buyer:
        raise HTTPException(status_code=404, detail="Buyer not found")
    db.delete(db_buyer)
    db.commit()
    return {"detail": "Buyer deleted"}
