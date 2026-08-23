from sqlalchemy.orm import Session

from src.core.database import SessionLocal
from src.models.price_data import PriceData


def load_price_data(records):
    db: Session = SessionLocal()

    try:
        inserted_count = 0

        for record in records:
            price_data = PriceData(
                commodity=record["commodity"],
                price_per_kg=record["price_per_kg"],
                record_date=record["record_date"],
            )

            db.add(price_data)
            inserted_count += 1

        db.commit()

        return inserted_count

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()