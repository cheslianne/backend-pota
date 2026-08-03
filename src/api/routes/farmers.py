# src/api/routes/farmers.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from src.core.database import get_db
from src.models.farmers import Farmer
from src.api.schemas.farmers import FarmerCreate, FarmerUpdate, FarmerResponse

router = APIRouter()

@router.post("/farmers", response_model=FarmerResponse)
def create_farmer(farmer: FarmerCreate, db: Session = Depends(get_db)):
    db_farmer = Farmer(**farmer.dict())
    db.add(db_farmer)
    db.commit()
    db.refresh(db_farmer)
    return db_farmer

@router.get("/farmers/{farmer_id}", response_model=FarmerResponse)
def read_farmer(farmer_id: int, db: Session = Depends(get_db)):
    db_farmer = db.query(Farmer).filter(Farmer.farmer_id == farmer_id).first()
    if not db_farmer:
        raise HTTPException(status_code=404, detail="Farmer not found")
    return db_farmer

@router.put("/farmers/{farmer_id}", response_model=FarmerResponse)
def update_farmer(farmer_id: int, farmer: FarmerUpdate, db: Session = Depends(get_db)):
    db_farmer = db.query(Farmer).filter(Farmer.farmer_id == farmer_id).first()
    if not db_farmer:
        raise HTTPException(status_code=404, detail="Farmer not found")
    for key, value in farmer.dict(exclude_unset=True).items():
        setattr(db_farmer, key, value)
    db.commit()
    db.refresh(db_farmer)
    return db_farmer

@router.delete("/farmers/{farmer_id}")
def delete_farmer(farmer_id: int, db: Session = Depends(get_db)):
    db_farmer = db.query(Farmer).filter(Farmer.farmer_id == farmer_id).first()
    if not db_farmer:
        raise HTTPException(status_code=404, detail="Farmer not found")
    db.delete(db_farmer)
    db.commit()
    return {"detail": "Farmer deleted"}
