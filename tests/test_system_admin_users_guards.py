"""Tests for the System Admin edit / delete guards in users.py."""
import os
import sys
from datetime import date

for key, value in dict(
    DB_HOST="x", DB_PORT="5432", DB_NAME="x", DB_USER="x", DB_PASSWORD="x", DATABASE_URL="x",
    SECRET_KEY="x", ALGORITHM="HS256", ACCESS_TOKEN_EXPIRE_MINUTES="30", PSA_API_URL="x",
    BANTAY_PRESYO_URL="x", ALLOWED_ORIGINS="http://x", BREVO_API_KEY="x", BREVO_SENDER_EMAIL="a@b.c",
).items():
    os.environ.setdefault(key, value)
sys.path.insert(0, ".")

from sqlalchemy.ext.compiler import compiles
from sqlalchemy.dialects.postgresql import JSONB


@compiles(JSONB, "sqlite")
def _jsonb_sqlite(type_, compiler, **kw):
    return "JSON"


from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from src.core.database import Base, get_db
from src.core.auth import get_current_user
import importlib
import pkgutil
import src.models

for _, module_name, _ in pkgutil.iter_modules(src.models.__path__):
    importlib.import_module(f"src.models.{module_name}")

from src.models.users import User
from src.models.audit_logs import AuditLog
from src.models.farmers import Farmer
from src.api.routes import users as users_routes

engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
Base.metadata.create_all(engine)
session_factory = sessionmaker(bind=engine)

app = FastAPI()
app.include_router(users_routes.router, prefix="/api/users")


def override_db():
    session = session_factory()
    try:
        yield session
    finally:
        session.close()


app.dependency_overrides[get_db] = override_db
acting = {"id": None}


def current_user():
    session = session_factory()
    try:
        user = session.query(User).filter(User.user_id == acting["id"]).first()
        session.expunge(user)
        return user
    finally:
        session.close()


app.dependency_overrides[get_current_user] = current_user
client = TestClient(app)


def make_user(username, role, **extra):
    session = session_factory()
    user = User(
        first_name="T", last_name=username, username=username, email_address=f"{username}@gmail.com",
        phone_number="09171234567", password="x", role=role, is_active=True, is_archived=False, **extra,
    )
    session.add(user)
    session.commit()
    user_id = user.user_id
    session.close()
    return user_id


admin_one = make_user("admin1", "System Administrator")
admin_two = make_user("admin2", "System Administrator")
legacy_aew = make_user("aew1", "AEW")
plain_user = make_user("plain", "Municipal Coordinator")
other_user = make_user("other", "Municipal Coordinator")
acting["id"] = admin_one


def put(user_id, **body):
    return client.put(f"/api/users/{user_id}", json=body)


def test_edit_guards():
    response = put(legacy_aew, role="AEW")
    assert response.status_code == 200 and response.json()["role"] == "Agricultural Extension Worker", response.text
    response = put(legacy_aew, role="DA-RFO")
    assert response.json()["role"] == "DA-RFO Officer"
    response = put(legacy_aew, role="Wizard")
    assert response.status_code == 400 and response.json()["detail"] == "Invalid role"
    response = put(plain_user, username="other")
    assert response.status_code == 400 and "Username" in response.json()["detail"], response.text
    response = put(plain_user, email_address="other@gmail.com")
    assert response.status_code == 400 and "Email" in response.json()["detail"], response.text
    response = put(plain_user, username="plain", first_name="Renamed")
    assert response.status_code == 200 and response.json()["first_name"] == "Renamed"
    response = put(admin_one, role="AEW")
    assert response.status_code == 400 and "own role" in response.json()["detail"]
    response = put(admin_one, role="System Administrator")
    assert response.status_code == 200

    acting["id"] = admin_two
    session = session_factory()
    session.query(User).filter(User.user_id == admin_two).update({"is_active": False})
    session.commit()
    session.close()
    acting["id"] = plain_user
    response = put(plain_user, role="AEW")
    assert response.status_code == 403
    acting["id"] = admin_one
    session = session_factory()
    session.query(User).filter(User.user_id == admin_two).update({"is_active": True})
    session.commit()
    session.close()
    response = put(admin_two, role="AEW")
    assert response.status_code == 200
    response = put(admin_two, role="System Administrator")
    assert response.status_code == 200


def test_create_normalizes_role():
    response = client.post("/api/users", json={
        "first_name": "N", "last_name": "U", "username": "newaew",
        "email_address": "newaew@gmail.com", "phone_number": "09171234567",
        "role": "AEW", "password": "Passw0rd!",
    })
    assert response.status_code in (200, 201), response.text
    assert response.json()["role"] == "Agricultural Extension Worker", response.json()


def test_delete_guards():
    response = client.delete(f"/api/users/{admin_one}")
    assert response.status_code == 400 and "own account" in response.json()["detail"]

    session = session_factory()
    session.add(Farmer(
        rsbsa_id="R1", first_name="F", last_name="L", aew_id=legacy_aew,
        municipality="Baliuag", barangay="x", address="x", sex="F",
        birthdate=date(1990, 1, 1), phone_number="0",
    ))
    session.commit()
    session.close()
    response = client.delete(f"/api/users/{legacy_aew}")
    assert response.status_code == 409 and "farmers" in response.json()["detail"], response.text
    session = session_factory()
    assert session.query(User).filter(User.user_id == legacy_aew).first() is not None
    session.close()

    session = session_factory()
    session.add(AuditLog(user_id=other_user, action="X", resource_type="User", resource_id=1))
    session.commit()
    session.close()
    response = client.delete(f"/api/users/{other_user}")
    assert response.status_code == 409 and "audit log" in response.json()["detail"], response.text
    response = client.delete(f"/api/users/{plain_user}")
    assert response.status_code == 200, response.text
    session = session_factory()
    assert session.query(User).filter(User.user_id == plain_user).first() is None
    session.close()
    response = client.delete("/api/users/99999")
    assert response.status_code == 404
