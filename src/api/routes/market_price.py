from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.core.database import get_db
from src.models.market_price import MarketPrice
from src.api.schemas.market_price import (
    MarketPriceCreate,
    MarketPriceResponse
)


router = APIRouter(
    prefix="/api/market-prices",
    tags=["Market Prices"]
)


@router.get(
    "/",
    response_model=list[MarketPriceResponse]
)
def get_market_prices(
    db: Session = Depends(get_db)
):
    return (
        db.query(MarketPrice)
        .order_by(MarketPrice.record_date.asc())
        .all()
    )


@router.post(
    "/",
    response_model=MarketPriceResponse
)
def create_market_price(
    data: MarketPriceCreate,
    db: Session = Depends(get_db)
):

    market_price = MarketPrice(
        commodity=data.commodity,
        wholesale_price_per_kg=data.wholesale_price_per_kg,
        retail_price_per_kg=data.retail_price_per_kg,
        record_date=data.record_date,
        data_source=data.data_source
    )

    db.add(market_price)
    db.commit()
    db.refresh(market_price)

    return market_price