# src/api/routes/auth.py

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from passlib.context import CryptContext

from src.core.database import get_db
from src.core.auth import create_access_token

from src.models.users import User

from src.api.schemas.auth import (
    LoginRequest,
    LoginResponse,
)


router = APIRouter()


# =========================================================
# PASSWORD HASHING
# =========================================================

pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto"
)


# =========================================================
# LOGIN
# =========================================================

@router.post("/login", response_model=LoginResponse)
def login(
    login_data: LoginRequest,
    db: Session = Depends(get_db)
):

    # =====================================================
    # FIND USER
    # =====================================================

    user = (
        db.query(User)
        .filter(User.username == login_data.username)
        .first()
    )

    # =====================================================
    # USER NOT FOUND
    # =====================================================

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )

    # =====================================================
    # VERIFY PASSWORD
    # =====================================================

    if not pwd_context.verify(
        login_data.password,
        user.password
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )

    # =====================================================
    # CREATE JWT TOKEN
    # =====================================================

    access_token = create_access_token({
        "sub": str(user.user_id),
        "username": user.username,
        "role": user.role,
        "user_id": user.user_id,
    })

    # =====================================================
    # RETURN LOGIN RESPONSE
    # =====================================================

    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        user_id=user.user_id,
        username=user.username,
        role=user.role,
    )