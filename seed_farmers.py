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
from sqlalchemy.inspection import inspect


try:
    from src.models.farmers import Farmer
except ModuleNotFoundError:
    from src.models.farmers import Farmer


Base.metadata.create_all(bind=engine)




def seed_farmers():
    db = SessionLocal()


    # Kunin ang listahan ng valid columns ng Farmer model
    mapper = inspect(Farmer)
    valid_columns = {col.key for col in mapper.attrs}


    raw_samples = [
        {
            "rsbsa_id": "RSBSA-03-2026-001",
            "first_name": "Pancho",
            "middle_name": "Reyes",
            "last_name": "De Jesus",
            "name": "Pancho De Jesus",
            "full_name": "Pancho De Jesus",
            "suffix": "Jr.",
            "address": "Brgy. Sta. Barbara, San Jose City",
            "municipality": "San Jose City",
            "barangay": "Sta. Barbara",
            "region": "Region III",
            "sex": "Male",
            "gender": "Male",
            "birthdate": "1978-05-12",
            "phone_number": "09996543991",
            "phone": "09996543991",
            "contact_number": "09996543991",
            "email_address": "pancho.dj@gmail.com",
            "email": "pancho.dj@gmail.com",
            "status": "Active",
            "is_active": True
        },
        {
            "rsbsa_id": "RSBSA-03-2026-002",
            "first_name": "Maria",
            "middle_name": "Santos",
            "last_name": "Cruz",
            "name": "Maria Cruz",
            "full_name": "Maria Cruz",
            "suffix": "",
            "address": "Brgy. Malasin, San Jose City",
            "municipality": "San Jose City",
            "barangay": "Malasin",
            "region": "Region III",
            "sex": "Female",
            "gender": "Female",
            "birthdate": "1984-11-23",
            "phone_number": "09187654321",
            "phone": "09187654321",
            "contact_number": "09187654321",
            "email_address": "maria.cruz@gmail.com",
            "email": "maria.cruz@gmail.com",
            "status": "Active",
            "is_active": True
        },
        {
            "rsbsa_id": "RSBSA-03-2026-003",
            "first_name": "Juan",
            "middle_name": "Alvarez",
            "last_name": "Mercado",
            "name": "Juan Mercado",
            "full_name": "Juan Mercado",
            "suffix": "Sr.",
            "address": "Brgy. Abar 1st, San Jose City",
            "municipality": "San Jose City",
            "barangay": "Abar 1st",
            "region": "Region III",
            "sex": "Male",
            "gender": "Male",
            "birthdate": "1969-02-18",
            "phone_number": "09201122334",
            "phone": "09201122334",
            "contact_number": "09201122334",
            "email_address": "juan.mercado@gmail.com",
            "email": "juan.mercado@gmail.com",
            "status": "Active",
            "is_active": True
        },
        {
            "rsbsa_id": "RSBSA-03-2026-004",
            "first_name": "Elena",
            "middle_name": "Dela Rosa",
            "last_name": "Bautista",
            "name": "Elena Bautista",
            "full_name": "Elena Bautista",
            "suffix": "",
            "address": "Brgy. Caanawan, San Jose City",
            "municipality": "San Jose City",
            "barangay": "Caanawan",
            "region": "Region III",
            "sex": "Female",
            "gender": "Female",
            "birthdate": "1990-08-30",
            "phone_number": "09459871234",
            "phone": "09459871234",
            "contact_number": "09459871234",
            "email_address": "elena.bautista@gmail.com",
            "email": "elena.bautista@gmail.com",
            "status": "Active",
            "is_active": True
        },
        {
            "rsbsa_id": "RSBSA-03-2026-005",
            "first_name": "Rodrigo",
            "middle_name": "Gomez",
            "last_name": "Aquino",
            "name": "Rodrigo Aquino",
            "full_name": "Rodrigo Aquino",
            "suffix": "",
            "address": "Brgy. Sibut, San Jose City",
            "municipality": "San Jose City",
            "barangay": "Sibut",
            "region": "Region III",
            "sex": "Male",
            "gender": "Male",
            "birthdate": "1975-10-05",
            "phone_number": "09173334455",
            "phone": "09173334455",
            "contact_number": "09173334455",
            "email_address": "rodrigo.aquino@gmail.com",
            "email": "rodrigo.aquino@gmail.com",
            "status": "Active",
            "is_active": True
        }
    ]


    try:
        # Linisin ang dating dummy test string
        if "rsbsa_id" in valid_columns:
            db.query(Farmer).filter(Farmer.rsbsa_id == "string").delete()
        if "first_name" in valid_columns:
            db.query(Farmer).filter(Farmer.first_name == "string").delete()


        count_added = 0
        for sample in raw_samples:
            # I-filter lang ang mga attributes na tunay na column sa Farmer model
            filtered_data = {k: v for k, v in sample.items() if k in valid_columns}


            # Check duplication base sa rsbsa_id kung meron
            existing = None
            if "rsbsa_id" in filtered_data:
                existing = db.query(Farmer).filter(Farmer.rsbsa_id == filtered_data["rsbsa_id"]).first()


            if not existing:
                farmer = Farmer(**filtered_data)
                db.add(farmer)
                count_added += 1
                display_name = sample.get("first_name", "") + " " + sample.get("last_name", "")
                print(f"Added Farmer: {display_name} ({sample.get('rsbsa_id', '')})")
            else:
                print(f"Farmer already exists: {sample.get('rsbsa_id', '')}")


        db.commit()
        print("\n" + "=" * 60)
        print(f"FARMERS SEED SUCCESSFUL! Added {count_added} new farmer(s).")
        print("=" * 60)


    except Exception as e:
        print("\n" + "=" * 60)
        print("ERROR WHILE SEEDING FARMERS")
        print("=" * 60)
        print(e)
        db.rollback()


    finally:
        db.close()




if __name__ == "__main__":
    seed_farmers()

