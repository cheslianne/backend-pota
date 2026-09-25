import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import text

from src.core.database import Base, engine

# Import all models so SQLAlchemy registers them on Base before create_all
from src.models import (
    alert_threshold_configs,
    audit_logs,
    buyer_registry,
    buyer_status,
    buyers,
    etl_run_log,
    farmers,
    forecasts,
    offtake_requests,
    planting_intents,
    price_data,
    raw_plant_reports,
    report_planting_intents,
    report_status,
    report_submission,
    report_validation_history,
    users,
)

# Columns added to models after tables already existed in production;
# create_all() won't add them to pre-existing tables, so patch them here.
MISSING_COLUMNS = [
    ("users", "region", "VARCHAR(100)"),
    ("users", "province", "VARCHAR(100)"),
    ("users", "municipality", "VARCHAR(100)"),
    ("users", "is_archived", "BOOLEAN NOT NULL DEFAULT false"),
    ("users", "archived_at", "TIMESTAMP"),
    ("users", "archive_remarks", "VARCHAR"),
    ("users", "archived_by", "INTEGER"),
]


def add_missing_columns():
    with engine.begin() as conn:
        for table, column, col_type in MISSING_COLUMNS:
            conn.execute(
                text(
                    f'ALTER TABLE "{table}" '
                    f'ADD COLUMN IF NOT EXISTS "{column}" {col_type}'
                )
            )


if __name__ == "__main__":
    print("Creating database tables (if not already present)...")
    Base.metadata.create_all(bind=engine)
    print("Patching missing columns on existing tables (if any)...")
    add_missing_columns()
    print("Done.")
