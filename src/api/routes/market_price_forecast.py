from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.core.database import get_db
from src.models.market_price_forecast import (
    MarketPriceForecast
)
from src.api.schemas.market_price_forecast import (
    MarketPriceForecastCreate,
    MarketPriceForecastResponse
)


router = APIRouter(
    prefix="/api/market-price-forecasts",
    tags=["Market Price Forecasts"]
)


@router.get(
    "/",
    response_model=list[MarketPriceForecastResponse]
)
def get_market_price_forecasts(
    db: Session = Depends(get_db)
):

    return (
        db.query(MarketPriceForecast)
        .order_by(
            MarketPriceForecast.forecast_date.asc()
        )
        .all()
    )


@router.post(
    "/",
    response_model=MarketPriceForecastResponse
)
def create_market_price_forecast(
    data: MarketPriceForecastCreate,
    db: Session = Depends(get_db)
):

    forecast = MarketPriceForecast(
        commodity=data.commodity,
        price_type=data.price_type,
        data_source=data.data_source,
        etl_cadence=data.etl_cadence,
        forecast_date=data.forecast_date,
        forecast_price_low=data.forecast_price_low,
        forecast_price_high=data.forecast_price_high
    )

    db.add(forecast)
    db.commit()
    db.refresh(forecast)

    return forecast