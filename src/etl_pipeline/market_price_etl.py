from datetime import date, timedelta
from decimal import Decimal
from pathlib import Path

import pandas as pd

from .market_price_load import load_market_prices


# ============================================================
# CONFIGURATION
# ============================================================

DATA_SOURCE = "SEED_DATA"


# ============================================================
# PROJECT PATHS
# ============================================================

PROJECT_ROOT = Path(__file__).resolve().parents[2]
SEED_EXCEL_PATH = PROJECT_ROOT / "data" / "seed_market_prices.xlsx"


# ============================================================
# GET LAST COMPLETED WEEK
# ============================================================

def get_last_completed_week():
    """
    Returns the Monday of the last completed week.
    """

    today = date.today()

    days_since_monday = today.weekday()
    this_monday = today - timedelta(days=days_since_monday)

    return this_monday - timedelta(days=7)


# ============================================================
# EXTRACT FROM SEED EXCEL FILE
# ============================================================

def extract_seed_data():

    records = []

    cutoff_date = get_last_completed_week()

    print(
        f"Historical data cutoff: "
        f"{cutoff_date.strftime('%B %d, %Y')} (Monday)"
    )

    if not SEED_EXCEL_PATH.exists():
        raise FileNotFoundError(
            f"Seed Excel not found: {SEED_EXCEL_PATH}"
        )

    # --------------------------------------------------------
    # Read Excel
    # --------------------------------------------------------

    df = pd.read_excel(
        SEED_EXCEL_PATH,
        sheet_name="market_prices"
    )

    # --------------------------------------------------------
    # Normalize columns
    # --------------------------------------------------------

    df.columns = (
        df.columns
        .str.strip()
        .str.lower()
        .str.replace(" ", "_")
    )

    # --------------------------------------------------------
    # Convert date column
    # --------------------------------------------------------

    df["record_date"] = pd.to_datetime(
        df["record_date"]
    ).dt.date

    # --------------------------------------------------------
    # Build records
    # --------------------------------------------------------

    for _, row in df.iterrows():

        record_date = row["record_date"]

        if record_date > cutoff_date:
            continue

        records.append({
            "commodity": row["commodity"],
            "wholesale_price_per_kg": row["wholesale_price_per_kg"],
            "retail_price_per_kg": row["retail_price_per_kg"],
            "record_date": record_date,
            "data_source": DATA_SOURCE,
        })

    return records


# ============================================================
# TRANSFORM AND VALIDATE
# ============================================================

def transform_market_prices(records):

    transformed_records = []

    for record in records:

        wholesale = Decimal(str(record["wholesale_price_per_kg"]))
        retail = Decimal(str(record["retail_price_per_kg"]))

        if wholesale <= 0:
            continue

        if retail <= 0:
            continue

        if retail < wholesale:
            continue

        transformed_records.append({
            "commodity": record["commodity"],
            "wholesale_price_per_kg": wholesale,
            "retail_price_per_kg": retail,
            "record_date": record["record_date"],
            "data_source": record["data_source"],
        })

    return transformed_records


# ============================================================
# ETL PIPELINE
# ============================================================

def run_market_price_etl():

    print()
    print("=" * 60)
    print("MARKET PRICE ETL PIPELINE (WEEKLY)")
    print("=" * 60)

    # --------------------------------------------------------
    # EXTRACT
    # --------------------------------------------------------

    print()
    print("STEP 1: EXTRACT")
    print("Extracting weekly data from Excel file...")

    cutoff_date = get_last_completed_week()

    print(
        "Latest allowed historical week: "
        f"{cutoff_date.strftime('%B %d, %Y')}"
    )

    extracted_records = extract_seed_data()

    print(f"Records extracted: {len(extracted_records)}")

    # --------------------------------------------------------
    # TRANSFORM + VALIDATE
    # --------------------------------------------------------

    print()
    print("STEP 2: TRANSFORM + VALIDATE")

    transformed_records = transform_market_prices(extracted_records)

    print(f"Valid records: {len(transformed_records)}")

    print(
        f"Invalid records removed: "
        f"{len(extracted_records) - len(transformed_records)}"
    )

    # --------------------------------------------------------
    # LOAD
    # --------------------------------------------------------

    print()
    print("STEP 3: LOAD")
    print("Loading records into market_prices...")

    loaded_records = load_market_prices(transformed_records)

    print()
    print("=" * 60)
    print("MARKET PRICE ETL COMPLETED")
    print("=" * 60)

    print(f"Records loaded: {loaded_records}")
    print(
        f"Historical data through: "
        f"{cutoff_date.strftime('%B %d, %Y')}"
    )


# ============================================================
# RUN
# ============================================================

if __name__ == "__main__":
    run_market_price_etl()