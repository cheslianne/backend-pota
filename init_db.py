from sqlalchemy import text

from src.core.database import Base, engine
from src.models.audit_logs import AuditLog
from src.models.buyer_registry import BuyerRegistry
from src.models.buyer_status import BuyerStatus
from src.models.buyers import Buyer
from src.models.farmers import Farmer
from src.models.forecasts import Forecast
from src.models.offtake_requests import OfftakeRequest
from src.models.planting_intents import PlantingIntent
from src.models.price_data import PriceData
from src.models.raw_plant_reports import RawPlantReport
from src.models.report_planting_intents import ReportPlantingIntent
from src.models.report_submission import ReportSubmission
from src.models.report_validation_history import ReportValidationHistory
from src.models.users import User


def ensure_planting_intent_columns():
    with engine.begin() as connection:
        connection.execute(text("""
            ALTER TABLE planting_intents
            ADD COLUMN IF NOT EXISTS notes TEXT;
        """))

        connection.execute(text("""
            ALTER TABLE planting_intents
            ADD COLUMN IF NOT EXISTS attachment_path VARCHAR(500);
        """))

        connection.execute(text("""
            ALTER TABLE farmers
            ADD COLUMN IF NOT EXISTS added_by_user_id INTEGER
            REFERENCES users(user_id);
        """))

        connection.execute(text("""
            CREATE INDEX IF NOT EXISTS ix_farmers_added_by_user_id
            ON farmers (added_by_user_id);
        """))


if __name__ == "__main__":
    Base.metadata.create_all(bind=engine)
    ensure_planting_intent_columns()
    print("Database tables are ready.")