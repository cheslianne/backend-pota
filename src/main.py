from fastapi import FastAPI
from src.core.database import Base, engine

from src.models.users import User
from src.models.farmers import Farmer
from src.models.buyers import Buyer
from src.models.buyer_registry import BuyerRegistry
from src.models.buyer_status import BuyerStatus
from src.api.routes import buyer_status
from src.models.planting_intents import PlantingIntent
from src.api.routes import planting_intents
from src.models.offtake_requests import OfftakeRequest
from src.api.routes import offtake_requests
from src.models.price_data import PriceData
from src.api.routes import price_data
from src.models.forecasts import Forecast
from src.api.routes import forecasts
from src.models.audit_logs import AuditLog
from src.api.routes import audit_logs
from src.api.routes import raw_plant_reports
from src.api.routes import report_planting_intents

from src.api.routes import users, farmers, buyers, buyer_registry


Base.metadata.create_all(bind=engine)

app = FastAPI()

app.include_router(users.router, prefix="/users", tags=["Users"])
app.include_router(farmers.router, prefix="/farmers", tags=["Farmers"])
app.include_router(buyers.router, prefix="/buyers", tags=["Buyers"])
app.include_router(buyer_registry.router, prefix="/buyer-registry", tags=["Buyer Registry"])
app.include_router(buyer_status.router,prefix="/buyer-status", tags=["Buyer Status"])
app.include_router(planting_intents.router,prefix="/planting-intent",tags=["Planting Intent"])
app.include_router(offtake_requests.router,prefix="/offtake-request",tags=["Offtake Request"])
app.include_router(price_data.router,prefix="/price-data",tags=["Price Data"])
app.include_router(forecasts.router,prefix="/forecasts",tags=["Forecasts"])
app.include_router(audit_logs.router,prefix="/audit-logs",tags=["Audit Logs"])
app.include_router(raw_plant_reports.router,prefix="/raw-plant-reports",tags=["Raw Plant Reports"])
app.include_router(report_planting_intents.router,prefix="/report-planting-intents",tags=["Report Planting Intents"])


@app.get("/")
def root():
    return {"message": "Hello, FastAPI is working!"}