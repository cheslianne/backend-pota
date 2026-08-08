# src/api/routes/users.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from src.core.database import get_db
from src.models.users import User
from src.api.schemas.users import UserCreate, UserUpdate, UserResponse
from src.core.security import hash_password


router = APIRouter()


# CREATE USER
@router.post("/users", response_model=UserResponse)
def create_user(
    user: UserCreate,
    db: Session = Depends(get_db)
):
    # Hash password before saving to database
    hashed_password = hash_password(user.password)

    user_data = user.dict()
    user_data["password"] = hashed_password

    db_user = User(**user_data)

    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    return db_user


# GET USER BY ID
@router.get("/users/{user_id}", response_model=UserResponse)
def read_user(
    user_id: int,
    db: Session = Depends(get_db)
):
    db_user = (
        db.query(User)
        .filter(User.user_id == user_id)
        .first()
    )

    if not db_user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    return db_user


# UPDATE USER
@router.put("/users/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    user: UserUpdate,
    db: Session = Depends(get_db)
):
    db_user = (
        db.query(User)
        .filter(User.user_id == user_id)
        .first()
    )

    if not db_user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    update_data = user.dict(exclude_unset=True)

    # Hash password if user changes password
    if "password" in update_data:
        update_data["password"] = hash_password(
            update_data["password"]
        )

    for key, value in update_data.items():
        setattr(db_user, key, value)

    db.commit()
    db.refresh(db_user)

    return db_user


# DELETE USER
@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db)
):
    db_user = (
        db.query(User)
        .filter(User.user_id == user_id)
        .first()
    )

    if not db_user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    db.delete(db_user)
    db.commit()

    return {
        "detail": "User deleted"
    }