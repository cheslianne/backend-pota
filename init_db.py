import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

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

if __name__ == "__main__":
    print("Creating database tables (if not already present)...")
    Base.metadata.create_all(bind=engine)
    print("Done.")
