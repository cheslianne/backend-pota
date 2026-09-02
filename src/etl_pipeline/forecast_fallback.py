from datetime import date
from decimal import Decimal

import pandas as pd


def generate_fallback_forecast(
    model_data,
    commodity,
    forecast_months,
    data_source,
    etl_cadence,
):
    """Generate a simple trend forecast when Prophet cannot load its backend."""
    values = [float(value) for value in model_data["y"]]
    last_date = pd.Timestamp(model_data["ds"].max())
    mean_x = (len(values) - 1) / 2
    mean_y = sum(values) / len(values)
    denominator = sum((index - mean_x) ** 2 for index in range(len(values)))
    slope = (
        sum((index - mean_x) * (value - mean_y) for index, value in enumerate(values))
        / denominator
        if denominator
        else 0
    )
    residuals = [
        value - (mean_y + slope * (index - mean_x))
        for index, value in enumerate(values)
    ]
    spread = max(0.01, 1.28 * (sum(error ** 2 for error in residuals) / len(residuals)) ** 0.5)

    results = []
    future_dates = pd.date_range(
        last_date + pd.offsets.MonthBegin(1),
        periods=forecast_months,
        freq="MS",
    )
    for step, forecast_date in enumerate(future_dates, start=1):
        predicted = max(0.01, mean_y + slope * (len(values) - 1 + step - mean_x))
        results.append({
            "commodity": commodity,
            "variety": None,
            "data_source": data_source,
            "etl_cadence": etl_cadence,
            "price_movement_wow": None,
            "forecast_date": date.fromisoformat(forecast_date.date().isoformat()),
            "forecast_price_low": Decimal(f"{max(0.01, predicted - spread):.2f}"),
            "forecast_price_high": Decimal(f"{max(predicted, predicted + spread):.2f}"),
        })

    return results
