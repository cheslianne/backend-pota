# src/main.py

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.api.routes import (
    users,
    auth,
    farmers,
    planting_intents,
    offtake_requests,
    buyer_registry,
    buyer_status,
    buyers,
    forecasts,
    price_data,
    raw_plant_reports,
    report_planting_intents,
    audit_logs,
    email,
)


app = FastAPI(
    title="eSaka API",
    description="Intelligent Supply-Demand Analytics and Geospatial Market Intelligence Platform",
    version="1.0.0"
)


# =========================================================
# CORS
# =========================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================================
# ROUTES
# =========================================================

app.include_router(
    auth.router,
    prefix="/api/auth",
    tags=["Authentication"]
)

app.include_router(
    users.router,
    prefix="/api/users",
    tags=["Users"]
)

app.include_router(
    farmers.router,
    prefix="/api/farmers",
    tags=["Farmers"]
)

app.include_router(
    planting_intents.router,
    prefix="/api/planting-intents",
    tags=["Planting Intents"]
)

app.include_router(
    offtake_requests.router,
    prefix="/api/offtake-requests",
    tags=["Offtake Requests"]
)

app.include_router(
    buyer_registry.router,
    prefix="/api/buyer-registry",
    tags=["Buyer Registry"]
)

app.include_router(
    buyer_status.router,
    prefix="/api/buyer-status",
    tags=["Buyer Status"]
)

app.include_router(
    buyers.router,
    prefix="/api/buyers",
    tags=["Buyers"]
)

app.include_router(
    forecasts.router,
    prefix="/api/forecasts",
    tags=["Forecasts"]
)

app.include_router(
    price_data.router,
    prefix="/api/price-data",
    tags=["Price Data"]
)

app.include_router(
    raw_plant_reports.router,
    prefix="/api/raw-plant-reports",
    tags=["Raw Plant Reports"]
)

app.include_router(
    report_planting_intents.router,
    prefix="/api/report-planting-intents",
    tags=["Report Planting Intents"]
)

app.include_router(
    audit_logs.router,
    prefix="/api/audit-logs",
    tags=["Audit Logs"]
)

app.include_router(
    email.router,
    prefix="/api/email",
    tags=["Email"]
)


# =========================================================
# DEBUG FARMER ROUTES
# =========================================================

print("\n===== ALL APP FARMER ROUTES =====")

for route in app.routes:
    if "farmer" in route.path.lower():
        print(
            route.path,
            getattr(route, "methods", None),
            getattr(route, "name", None)
        )

print("=================================\n")


# =========================================================
# ROOT
# =========================================================

@app.get("/")
def root():
    return {
        "message": "Welcome to eSaka API",
        "docs": "/docs",
        "redoc": "/redoc"
    }


# =========================================================
# HEALTH
# =========================================================

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "version": "1.0.0"
    }