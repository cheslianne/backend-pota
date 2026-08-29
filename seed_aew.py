import sys
import os
import importlib
import pkgutil

# Add project root to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Auto-import all models to resolve SQLAlchemy relationships
try:
    import src.models as models_pkg
    for _, module_name, _ in pkgutil.iter_modules(models_pkg.__path__):
        importlib.import_module(f"src.models.{module_name}")
except Exception as err:
    print(f"Notice during models import: {err}")

from src.core.database import SessionLocal, engine, Base
from src.models.users import User
from src.core.security import hash_password

Base.metadata.create_all(bind=engine)


def seed_aew_users():
    db = SessionLocal()

    aew_data = [
        {
            "first_name": "Jose",
            "last_name": "Bautista",
            "username": "aew_jose_bautista",
            "email_address": "jose.bautista@da.gov.ph",
            "phone_number": "09171234501",
            "password": hash_password("AEWPassword123!"),
            "role": "Agricultural Extension Worker",
            "is_active": True
        },
        {
            "first_name": "Maria",
            "last_name": "Santos",
            "username": "aew_maria_santos",
            "email_address": "maria.santos@da.gov.ph",
            "phone_number": "09281234502",
            "password": hash_password("AEWPassword123!"),
            "role": "Agricultural Extension Worker",
            "is_active": True
        },
        {
            "first_name": "Juan",
            "last_name": "Mercado",
            "username": "aew_juan_mercado",
            "email_address": "juan.mercado@da.gov.ph",
            "phone_number": "09391234503",
            "password": hash_password("AEWPassword123!"),
            "role": "Agricultural Extension Worker",
            "is_active": True
        },
        {
            "first_name": "Elena",
            "last_name": "Reyes",
            "username": "aew_elena_reyes",
            "email_address": "elena.reyes@da.gov.ph",
            "phone_number": "09121234504",
            "password": hash_password("AEWPassword123!"),
            "role": "Agricultural Extension Worker",
            "is_active": True
        },
        {
            "first_name": "Ramon",
            "last_name": "Cruz",
            "username": "aew_ramon_cruz",
            "email_address": "ramon.cruz@da.gov.ph",
            "phone_number": "09201234505",
            "password": hash_password("AEWPassword123!"),
            "role": "Agricultural Extension Worker",
            "is_active": True
        },
        {
            "first_name": "Alejandro",
            "last_name": "Lopez",
            "username": "aew_alejandro_lopez",
            "email_address": "alejandro.lopez@da.gov.ph",
            "phone_number": "09451234506",
            "password": hash_password("AEWPassword123!"),
            "role": "Agricultural Extension Worker",
            "is_active": True
        },
        {
            "first_name": "Rosa",
            "last_name": "Delos Santos",
            "username": "aew_rosa_delos_santos",
            "email_address": "rosa.santos@da.gov.ph",
            "phone_number": "09561234507",
            "password": hash_password("AEWPassword123!"),
            "role": "Agricultural Extension Worker",
            "is_active": True
        },
        {
            "first_name": "Gabriel",
            "last_name": "Torres",
            "username": "aew_gabriel_torres",
            "email_address": "gabriel.torres@da.gov.ph",
            "phone_number": "09651234508",
            "password": hash_password("AEWPassword123!"),
            "role": "Agricultural Extension Worker",
            "is_active": True
        },
        {
            "first_name": "Carmela",
            "last_name": "Fernandez",
            "username": "aew_carmela_fernandez",
            "email_address": "carmela.fernandez@da.gov.ph",
            "phone_number": "09751234509",
            "password": hash_password("AEWPassword123!"),
            "role": "Agricultural Extension Worker",
            "is_active": True
        },
        {
            "first_name": "Victor",
            "last_name": "Aquino",
            "username": "aew_victor_aquino",
            "email_address": "victor.aquino@da.gov.ph",
            "phone_number": "09851234510",
            "password": hash_password("AEWPassword123!"),
            "role": "Agricultural Extension Worker",
            "is_active": True
        }
    ]

    try:
        count_added = 0
        for data in aew_data:
            existing = db.query(User).filter(
                User.username == data["username"]
            ).first()

            if not existing:
                user = User(**data)
                db.add(user)
                count_added += 1
                print(f"Added AEW: {data['first_name']} {data['last_name']} ({data['username']})")
            else:
                print(f"AEW already exists: {data['username']}")

        db.commit()
        print("\n" + "=" * 60)
        print(f"AEW SEED SUCCESSFUL! Added {count_added} new AEW user(s).")
        print("=" * 60)

    except Exception as e:
        print("\n" + "=" * 60)
        print("ERROR WHILE SEEDING AEW USERS")
        print("=" * 60)
        print(e)
        db.rollback()

    finally:
        db.close()


if __name__ == "__main__":
    seed_aew_users()
