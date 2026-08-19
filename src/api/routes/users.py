from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session

from src.core.database import get_db
from src.models.users import User
from src.models.audit_logs import AuditLog

from src.api.schemas.users import (
    UserCreate,
    UserUpdate,
    UserResponse,
    UserStatusUpdate
)

from src.core.security import hash_password
from src.core.rbac import require_role, Role
from src.core.auth import get_current_user


router = APIRouter()


# ============================================================
# CREATE USER
# ONLY SYSTEM ADMINISTRATOR
# ============================================================

@router.post(
    "",
    response_model=UserResponse,
    dependencies=[Depends(require_role(Role.SYSTEM_ADMIN))]
)
def create_user(
    user: UserCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new user.

    Automatically creates:
    USER_CREATED
    """

    # --------------------------------------------------------
    # CHECK USERNAME
    # --------------------------------------------------------

    existing_username = (
        db.query(User)
        .filter(User.username == user.username)
        .first()
    )

    if existing_username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already exists"
        )

    # --------------------------------------------------------
    # CHECK EMAIL
    # --------------------------------------------------------

    existing_email = (
        db.query(User)
        .filter(
            User.email_address == user.email_address
        )
        .first()
    )

    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email address already exists"
        )

    # --------------------------------------------------------
    # HASH PASSWORD
    # --------------------------------------------------------

    hashed_password = hash_password(
        user.password
    )

    user_data = user.dict()

    user_data["password"] = hashed_password

    # New accounts are active by default
    user_data["is_active"] = True

    # --------------------------------------------------------
    # CREATE USER
    # --------------------------------------------------------

    db_user = User(
        **user_data
    )

    db.add(db_user)

    # Get generated user_id before commit
    db.flush()

    # --------------------------------------------------------
    # AUDIT LOG
    # --------------------------------------------------------

    audit_log = AuditLog(
        user_id=current_user.user_id,
        action="USER_CREATED",
        resource_type="User",
        resource_id=db_user.user_id,

        old_values=None,

        new_values={
            "user_id": db_user.user_id,
            "first_name": db_user.first_name,
            "last_name": db_user.last_name,
            "username": db_user.username,
            "email_address": db_user.email_address,
            "phone_number": db_user.phone_number,
            "role": db_user.role,
            "is_active": db_user.is_active
        },

        ip_address=(
            request.client.host
            if request.client
            else None
        ),

        user_agent=request.headers.get(
            "user-agent"
        )
    )

    db.add(audit_log)

    # --------------------------------------------------------
    # SAVE
    # --------------------------------------------------------

    db.commit()

    db.refresh(db_user)

    return db_user


# ============================================================
# GET ALL USERS
# ONLY SYSTEM ADMINISTRATOR
# ============================================================

@router.get(
    "",
    response_model=list[UserResponse],
    dependencies=[Depends(require_role(Role.SYSTEM_ADMIN))]
)
def read_users(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all users.

    Automatically creates:
    USERS_VIEWED
    """

    users = (
        db.query(User)
        .order_by(
            User.user_id.asc()
        )
        .all()
    )

    # --------------------------------------------------------
    # AUDIT LOG
    # --------------------------------------------------------

    audit_log = AuditLog(
        user_id=current_user.user_id,
        action="USERS_VIEWED",
        resource_type="User",
        resource_id=current_user.user_id,

        old_values=None,

        new_values={
            "count": len(users)
        },

        ip_address=(
            request.client.host
            if request.client
            else None
        ),

        user_agent=request.headers.get(
            "user-agent"
        )
    )

    db.add(audit_log)

    db.commit()

    return users


# ============================================================
# GET USER BY ID
# ============================================================

@router.get(
    "/{user_id}",
    response_model=UserResponse
)
def read_user(
    user_id: int,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get a user by ID.

    Automatically creates:
    USER_VIEWED
    """

    # --------------------------------------------------------
    # FIND USER
    # --------------------------------------------------------

    db_user = (
        db.query(User)
        .filter(
            User.user_id == user_id
        )
        .first()
    )

    if not db_user:

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # --------------------------------------------------------
    # PERMISSION
    # --------------------------------------------------------

    if (
        current_user.user_id != user_id
        and current_user.role != Role.SYSTEM_ADMIN
    ):

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only view your own profile"
        )

    # --------------------------------------------------------
    # AUDIT LOG
    # --------------------------------------------------------

    audit_log = AuditLog(
        user_id=current_user.user_id,
        action="USER_VIEWED",
        resource_type="User",
        resource_id=db_user.user_id,

        old_values=None,

        new_values={
            "username": db_user.username
        },

        ip_address=(
            request.client.host
            if request.client
            else None
        ),

        user_agent=request.headers.get(
            "user-agent"
        )
    )

    db.add(audit_log)

    db.commit()

    return db_user


# ============================================================
# UPDATE USER
# ============================================================

@router.put(
    "/{user_id}",
    response_model=UserResponse
)
def update_user(
    user_id: int,
    user: UserUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update a user.

    Automatically creates:
    USER_UPDATED
    """

    # --------------------------------------------------------
    # FIND USER
    # --------------------------------------------------------

    db_user = (
        db.query(User)
        .filter(
            User.user_id == user_id
        )
        .first()
    )

    if not db_user:

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # --------------------------------------------------------
    # PERMISSION
    # --------------------------------------------------------

    if (
        current_user.user_id != user_id
        and current_user.role != Role.SYSTEM_ADMIN
    ):

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only update your own profile"
        )

    # --------------------------------------------------------
    # OLD VALUES
    # --------------------------------------------------------

    old_values = {
        "first_name": db_user.first_name,
        "last_name": db_user.last_name,
        "username": db_user.username,
        "email_address": db_user.email_address,
        "phone_number": db_user.phone_number,
        "role": db_user.role,
        "is_active": db_user.is_active
    }

    # --------------------------------------------------------
    # UPDATE DATA
    # --------------------------------------------------------

    update_data = user.dict(
        exclude_unset=True
    )

    # --------------------------------------------------------
    # ONLY ADMIN CAN CHANGE ROLE
    # --------------------------------------------------------

    if (
        "role" in update_data
        and current_user.role != Role.SYSTEM_ADMIN
    ):

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only System Administrators can change user roles"
        )

    # --------------------------------------------------------
    # HASH NEW PASSWORD
    # --------------------------------------------------------

    if "password" in update_data:

        update_data["password"] = hash_password(
            update_data["password"]
        )

    # --------------------------------------------------------
    # APPLY UPDATE
    # --------------------------------------------------------

    for key, value in update_data.items():

        setattr(
            db_user,
            key,
            value
        )

    db.flush()

    # --------------------------------------------------------
    # NEW VALUES
    # --------------------------------------------------------

    new_values = {
        "first_name": db_user.first_name,
        "last_name": db_user.last_name,
        "username": db_user.username,
        "email_address": db_user.email_address,
        "phone_number": db_user.phone_number,
        "role": db_user.role,
        "is_active": db_user.is_active
    }

    # --------------------------------------------------------
    # AUDIT LOG
    # --------------------------------------------------------

    audit_log = AuditLog(
        user_id=current_user.user_id,
        action="USER_UPDATED",
        resource_type="User",
        resource_id=db_user.user_id,

        old_values=old_values,

        new_values=new_values,

        ip_address=(
            request.client.host
            if request.client
            else None
        ),

        user_agent=request.headers.get(
            "user-agent"
        )
    )

    db.add(audit_log)

    # --------------------------------------------------------
    # SAVE
    # --------------------------------------------------------

    db.commit()

    db.refresh(db_user)

    return db_user


# ============================================================
# ACTIVATE / DEACTIVATE USER
# ONLY SYSTEM ADMINISTRATOR
# ============================================================

@router.patch(
    "/{user_id}/status",
    response_model=UserResponse,
    dependencies=[Depends(require_role(Role.SYSTEM_ADMIN))]
)
def update_user_status(
    user_id: int,
    status_update: UserStatusUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Activate or deactivate a user.

    Automatically creates:

    USER_ACTIVATED
    USER_DEACTIVATED
    """

    # --------------------------------------------------------
    # FIND USER
    # --------------------------------------------------------

    db_user = (
        db.query(User)
        .filter(
            User.user_id == user_id
        )
        .first()
    )

    if not db_user:

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # --------------------------------------------------------
    # PREVENT DEACTIVATING LAST ADMIN
    # --------------------------------------------------------

    if (
        db_user.role == Role.SYSTEM_ADMIN
        and status_update.is_active is False
    ):

        active_admin_count = (
            db.query(User)
            .filter(
                User.role == Role.SYSTEM_ADMIN,
                User.is_active.is_(True)
            )
            .count()
        )

        if active_admin_count <= 1:

            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot deactivate the last active System Administrator"
            )

    # --------------------------------------------------------
    # OLD / NEW STATUS
    # --------------------------------------------------------

    old_status = db_user.is_active

    new_status = status_update.is_active

    # --------------------------------------------------------
    # SAME STATUS
    # --------------------------------------------------------

    if old_status == new_status:

        status_text = (
            "active"
            if new_status
            else "inactive"
        )

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"User is already {status_text}"
        )

    # --------------------------------------------------------
    # CHANGE STATUS
    # --------------------------------------------------------

    db_user.is_active = new_status

    # --------------------------------------------------------
    # DETERMINE ACTION
    # --------------------------------------------------------

    if new_status:

        action = "USER_ACTIVATED"

    else:

        action = "USER_DEACTIVATED"

    # --------------------------------------------------------
    # AUDIT LOG
    # --------------------------------------------------------

    audit_log = AuditLog(
        user_id=current_user.user_id,

        action=action,

        resource_type="User",

        resource_id=db_user.user_id,

        old_values={
            "is_active": old_status
        },

        new_values={
            "is_active": new_status
        },

        ip_address=(
            request.client.host
            if request.client
            else None
        ),

        user_agent=request.headers.get(
            "user-agent"
        )
    )

    db.add(audit_log)

    # --------------------------------------------------------
    # SAVE
    # --------------------------------------------------------

    db.commit()

    db.refresh(db_user)

    return db_user


# ============================================================
# DELETE USER
# ONLY SYSTEM ADMINISTRATOR
# ============================================================

@router.delete(
    "/{user_id}",
    dependencies=[Depends(require_role(Role.SYSTEM_ADMIN))]
)
def delete_user(
    user_id: int,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete a user.

    Automatically creates:
    USER_DELETED
    """

    # --------------------------------------------------------
    # FIND USER
    # --------------------------------------------------------

    db_user = (
        db.query(User)
        .filter(
            User.user_id == user_id
        )
        .first()
    )

    if not db_user:

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # --------------------------------------------------------
    # PREVENT DELETING LAST ADMIN
    # --------------------------------------------------------

    if db_user.role == Role.SYSTEM_ADMIN:

        admin_count = (
            db.query(User)
            .filter(
                User.role == Role.SYSTEM_ADMIN
            )
            .count()
        )

        if admin_count <= 1:

            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete the last System Administrator"
            )

    # --------------------------------------------------------
    # SAVE OLD VALUES
    # --------------------------------------------------------

    old_values = {
        "user_id": db_user.user_id,
        "first_name": db_user.first_name,
        "last_name": db_user.last_name,
        "username": db_user.username,
        "email_address": db_user.email_address,
        "phone_number": db_user.phone_number,
        "role": db_user.role,
        "is_active": db_user.is_active
    }

    deleted_user_id = db_user.user_id

    # --------------------------------------------------------
    # AUDIT LOG
    # --------------------------------------------------------

    audit_log = AuditLog(
        user_id=current_user.user_id,

        action="USER_DELETED",

        resource_type="User",

        resource_id=deleted_user_id,

        old_values=old_values,

        new_values=None,

        ip_address=(
            request.client.host
            if request.client
            else None
        ),

        user_agent=request.headers.get(
            "user-agent"
        )
    )

    db.add(audit_log)

    # --------------------------------------------------------
    # DELETE USER
    # --------------------------------------------------------

    db.delete(db_user)

    # --------------------------------------------------------
    # SAVE
    # --------------------------------------------------------

    db.commit()

    return {
        "detail": "User deleted successfully"
    }