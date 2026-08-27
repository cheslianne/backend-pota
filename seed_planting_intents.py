import sys
import os
import importlib
import pkgutil
from datetime import date, timedelta


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
try:
    from src.models.farmers import Farmer
except ModuleNotFoundError:
    from src.models.farmers import Farmer


from src.models.planting_intents import PlantingIntent


Base.metadata.create_all(bind=engine)




def seed_planting_intents():
    db = SessionLocal()


    try:
        # Kunin ang existing farmers para sa valid foreign keys
        farmers = db.query(Farmer).all()


        if not farmers:
            print("No farmers found! Please run 'python seed_farmers.py' first.")
            return


        sample_intents = [
            {
                "farmer_index": 0,
                "commodity": "Red Onion",
                "planting_date": date(2026, 9, 1),
                "harvest_date": date(2026, 12, 15),
                "volume": 12500.00,
                "remarks": "High yield expected using hybrid seeds."
            },
            {
                "farmer_index": 1 if len(farmers) > 1 else 0,
                "commodity": "Tomato",
                "planting_date": date(2026, 9, 10),
                "harvest_date": date(2026, 11, 25),
                "volume": 8500.00,
                "remarks": "Direct market distribution planned."
            },
            {
                "farmer_index": 2 if len(farmers) > 2 else 0,
                "commodity": "Yellow Corn",
                "planting_date": date(2026, 9, 15),
                "harvest_date": date(2027, 1, 20),
                "volume": 20000.00,
                "remarks": "Contracted with local livestock feed mill."
            },
            {
                "farmer_index": 3 if len(farmers) > 3 else 0,
                "commodity": "Eggplant",
                "planting_date": date(2026, 10, 1),
                "harvest_date": date(2026, 12, 30),
                "volume": 6000.00,
                "remarks": "Targeting central trading post."
            }
        ]


        count_added = 0
        for item in sample_intents:
            target_farmer = farmers[item["farmer_index"]]


            # Check if intent already exists for this farmer & commodity
            existing = db.query(PlantingIntent).filter(
                PlantingIntent.farmer_id == target_farmer.farmer_id,
                PlantingIntent.commodity == item["commodity"]
            ).first()


            if not existing:
                intent = PlantingIntent(
                    farmer_id=target_farmer.farmer_id,
                    commodity=item["commodity"],
                    planting_date=item["planting_date"],
                    harvest_date=item["harvest_date"],
                    volume=item["volume"],
                    remarks=item["remarks"]
                )
                db.add(intent)
                count_added += 1
                fname = getattr(target_farmer, "first_name", "")
                lname = getattr(target_farmer, "last_name", "")
                print(f"Added Planting Intent: {item['commodity']} for {fname} {lname}")
            else:
                print(f"Intent already exists for {item['commodity']}")


        db.commit()
        print("\n" + "=" * 60)
        print(f"PLANTING INTENTS SEEDED SUCCESSFULLY! Added {count_added} records.")
        print("=" * 60)


    except Exception as e:
        print("\n" + "=" * 60)
        print("ERROR WHILE SEEDING PLANTING INTENTS")
        print("=" * 60)
        print(e)
        db.rollback()


    finally:
        db.close()




if __name__ == "__main__":
    seed_planting_intents()

