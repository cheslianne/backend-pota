from datetime import date
from decimal import Decimal

import pandas as pd
from prophet import Prophet
from sqlalchemy import delete, insert, select

from src.core.database import SessionLocal
from src.models.market_price import MarketPrice
from src.models.market_price_forecast import MarketPriceForecast


# ============================================================
# FORECAST SETTINGS
# ============================================================

FORECAST_MONTHS = 6

DATA_SOURCE = "SEED_DATA"
ETL_CADENCE = "Quarterly"

COMMODITIES = [
    "Tomato",
    "Red Onion",
    "White Onion",
    "Squash"
]

PRICE_TYPES = [
    "WHOLESALE",
    "RETAIL"
]


# ============================================================
# GET LAST COMPLETED MONTH
# ============================================================

def get_last_completed_month():
    """
    Returns the first day of the latest completed month.

    Example:
        If today is October 2026:
            returns 2026-09-01

        If today is September 2026:
            returns 2026-08-01
    """

    today = date.today()

    if today.month == 1:
        return date(
            today.year - 1,
            12,
            1
        )

    return date(
        today.year,
        today.month - 1,
        1
    )


# ============================================================
# GET HISTORICAL MARKET PRICE DATA
# ============================================================

def get_historical_data(
    commodity,
    price_type
):

    db = SessionLocal()

    try:

        # ----------------------------------------------------
        # Select the correct price column
        # ----------------------------------------------------

        if price_type == "WHOLESALE":

            price_column = (
                MarketPrice.wholesale_price_per_kg
            )

        elif price_type == "RETAIL":

            price_column = (
                MarketPrice.retail_price_per_kg
            )

        else:

            raise ValueError(
                "price_type must be WHOLESALE or RETAIL"
            )

        # ----------------------------------------------------
        # Determine the latest completed month
        # ----------------------------------------------------

        cutoff_date = get_last_completed_month()

        print(
            f"Historical cutoff date: "
            f"{cutoff_date}"
        )

        # ----------------------------------------------------
        # Get only historical records
        #
        # IMPORTANT:
        # Future months are excluded here.
        # ----------------------------------------------------

        result = db.execute(
            select(
                MarketPrice.record_date,
                price_column
            )
            .where(
                MarketPrice.commodity == commodity,
                MarketPrice.record_date <= cutoff_date
            )
            .order_by(
                MarketPrice.record_date.asc()
            )
        )

        rows = result.all()

        data = []

        for row in rows:

            record_date = row[0]
            price = row[1]

            # Skip missing prices
            if price is None:
                continue

            price = Decimal(str(price))

            # Skip invalid prices
            if price <= 0:
                continue

            data.append({
                "ds": record_date,
                "y": float(price)
            })

        return data

    finally:

        db.close()


# ============================================================
# GENERATE FORECAST
# ============================================================

def generate_forecast(
    commodity,
    price_type
):

    historical_data = get_historical_data(
        commodity,
        price_type
    )

    print()
    print("=" * 60)
    print("MARKET PRICE FORECAST")
    print("=" * 60)

    print(
        f"Commodity: {commodity}"
    )

    print(
        f"Price Type: {price_type}"
    )

    print(
        f"Historical records: "
        f"{len(historical_data)}"
    )

    # --------------------------------------------------------
    # Check if enough historical data exists
    # --------------------------------------------------------

    if len(historical_data) < 3:

        print(
            "Not enough historical data "
            "for forecasting."
        )

        return []

    # ========================================================
    # PREPARE PROPHET DATA
    # ========================================================

    model_data = pd.DataFrame(
        historical_data
    )

    model_data["ds"] = pd.to_datetime(
        model_data["ds"]
    )

    model_data["y"] = pd.to_numeric(
        model_data["y"]
    )

    # --------------------------------------------------------
    # Sort historical data
    # --------------------------------------------------------

    model_data = (
        model_data
        .sort_values("ds")
        .reset_index(drop=True)
    )

    # ========================================================
    # GET LAST HISTORICAL DATE
    # ========================================================

    last_date = model_data["ds"].max()

    print(
        f"Latest historical date: "
        f"{last_date.date()}"
    )

    # ========================================================
    # CREATE PROPHET MODEL
    # ========================================================

    model = Prophet(
        yearly_seasonality=False,
        weekly_seasonality=False,
        daily_seasonality=False,
        interval_width=0.80
    )

    model.fit(model_data)

    # ========================================================
    # CREATE FUTURE DATES
    # ========================================================

    future = model.make_future_dataframe(
        periods=FORECAST_MONTHS,
        freq="MS"
    )

    forecast = model.predict(
        future
    )

        # ========================================================
    # ONLY FUTURE DATES
    # ========================================================

    future_forecast = forecast[
        forecast["ds"] > last_date
    ].copy()

    # --------------------------------------------------------
    # Make sure only the requested number of months
    # is included.
    # --------------------------------------------------------

    future_forecast = (
        future_forecast
        .sort_values("ds")
        .head(FORECAST_MONTHS)
    )

    
   

    # ========================================================
    # PREPARE RESULTS
    # ========================================================

    results = []

    for _, row in future_forecast.iterrows():

        forecast_date = row["ds"].date()

        predicted_low = max(
            0.01,
            float(row["yhat_lower"])
        )

        predicted_high = max(
            predicted_low,
            float(row["yhat_upper"])
        )

        result = {

            "commodity": commodity,

            "price_type": price_type,

            "data_source": DATA_SOURCE,

            "etl_cadence": ETL_CADENCE,

            "forecast_date": forecast_date,

            "forecast_price_low": Decimal(
                f"{predicted_low:.2f}"
            ),

            "forecast_price_high": Decimal(
                f"{predicted_high:.2f}"
            )
        }

        results.append(result)

    return results


# ============================================================
# SAVE FORECAST
# ============================================================

def save_forecasts(
    results,
    commodity,
    price_type
):

    if not results:

        print(
            "No forecast results to save."
        )

        return 0

    db = SessionLocal()

    try:

        table = MarketPriceForecast.__table__

        # ----------------------------------------------------
        # Remove previous forecasts for this
        # commodity and price type only.
        # ----------------------------------------------------

        db.execute(
            delete(table).where(
                table.c.commodity == commodity,
                table.c.price_type == price_type
            )
        )

        # ----------------------------------------------------
        # Insert the newly generated forecasts.
        #
        # This only affects:
        # market_price_forecasts
        #
        # It does NOT affect:
        # forecasts
        # ----------------------------------------------------

        db.execute(
            insert(table),
            results
        )

        db.commit()

        return len(results)

    except Exception:

        db.rollback()

        raise

    finally:

        db.close()


# ============================================================
# RUN ALL MARKET PRICE FORECASTS
# ============================================================

def main():

    print()
    print("=" * 60)
    print("MARKET PRICE FORECASTING PIPELINE")
    print("=" * 60)

    cutoff_date = get_last_completed_month()

    print(
        f"Historical data cutoff: "
        f"{cutoff_date}"
    )

    print(
        f"Forecast period: "
        f"{FORECAST_MONTHS} months"
    )

    total_loaded = 0

    # ========================================================
    # FORECAST EACH COMMODITY
    # ========================================================

    for commodity in COMMODITIES:

        for price_type in PRICE_TYPES:

            results = generate_forecast(
                commodity,
                price_type
            )

            print()
            print(
                f"{commodity} - "
                f"{price_type} FORECAST"
            )

            if not results:

                print(
                    "No forecast generated."
                )

                continue

            # ------------------------------------------------
            # Display forecast results
            # ------------------------------------------------

            for result in results:

                print(
                    f"{result['forecast_date']} | "
                    f"{result['commodity']} | "
                    f"{result['price_type']} | "
                    f"PHP "
                    f"{result['forecast_price_low']:.2f}"
                    f" - "
                    f"{result['forecast_price_high']:.2f}/kg"
                )

            # ------------------------------------------------
            # Save forecast results
            # ------------------------------------------------

            inserted = save_forecasts(
                results,
                commodity,
                price_type
            )

            total_loaded += inserted

            print(
                f"Forecast records loaded: "
                f"{inserted}"
            )

    # ========================================================
    # COMPLETION
    # ========================================================

    print()
    print("=" * 60)
    print("MARKET PRICE FORECASTING COMPLETED")
    print("=" * 60)

    print(
        f"Total forecast records loaded: "
        f"{total_loaded}"
    )


# ============================================================
# RUN
# ============================================================

if __name__ == "__main__":
    main()