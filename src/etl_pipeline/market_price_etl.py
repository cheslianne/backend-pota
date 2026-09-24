from datetime import date
from decimal import Decimal

from .market_price_load import load_market_prices


# ============================================================
# CONFIGURATION
# ============================================================

COMMODITIES = [
    "Tomato",
    "Red Onion",
    "White Onion",
    "Squash",
]

START_YEAR = 2024
START_MONTH = 1

DATA_SOURCE = "SEED_DATA"


# ============================================================
# SEED DATA
# ============================================================
# Format:
# commodity: {
#     year: {
#         month: (wholesale_price, retail_price)
#     }
# }

SEED_PRICES = {

    "Tomato": {
        2024: {
            1: (40, 55),
            2: (42, 58),
            3: (45, 62),
            4: (48, 65),
            5: (50, 68),
            6: (47, 64),
            7: (45, 61),
            8: (43, 59),
            9: (46, 63),
            10: (48, 66),
            11: (52, 70),
            12: (55, 74),
        },
        2025: {
            1: (48, 65),
            2: (50, 68),
            3: (53, 71),
            4: (55, 74),
            5: (57, 77),
            6: (54, 73),
            7: (52, 70),
            8: (50, 68),
            9: (53, 72),
            10: (55, 75),
            11: (59, 80),
            12: (62, 84),
        },
        2026: {
            1: (55, 74),
            2: (57, 77),
            3: (60, 81),
            4: (62, 84),
            5: (65, 88),
            6: (61, 83),
            7: (59, 80),
            8: (57, 77),
            9: (60, 81),
            10: (62, 84),
            11: (66, 89),
            12: (70, 94),
        },
    },

    "Red Onion": {
        2024: {
            1: (85, 110),
            2: (88, 115),
            3: (90, 118),
            4: (92, 120),
            5: (95, 124),
            6: (93, 121),
            7: (90, 118),
            8: (88, 115),
            9: (91, 119),
            10: (94, 123),
            11: (98, 128),
            12: (102, 133),
        },
        2025: {
            1: (92, 120),
            2: (95, 124),
            3: (98, 128),
            4: (100, 131),
            5: (103, 135),
            6: (101, 132),
            7: (98, 128),
            8: (96, 125),
            9: (99, 129),
            10: (102, 133),
            11: (106, 138),
            12: (110, 143),
        },
        2026: {
            1: (100, 130),
            2: (103, 134),
            3: (106, 138),
            4: (109, 142),
            5: (112, 146),
            6: (110, 143),
            7: (107, 139),
            8: (105, 136),
            9: (108, 140),
            10: (111, 144),
            11: (115, 149),
            12: (120, 156),
        },
    },

    "White Onion": {
        2024: {
            1: (90, 118),
            2: (92, 120),
            3: (95, 124),
            4: (98, 128),
            5: (100, 131),
            6: (98, 128),
            7: (95, 124),
            8: (93, 121),
            9: (96, 125),
            10: (99, 129),
            11: (103, 134),
            12: (107, 139),
        },
        2025: {
            1: (97, 127),
            2: (100, 131),
            3: (103, 134),
            4: (106, 138),
            5: (109, 142),
            6: (107, 139),
            7: (104, 135),
            8: (102, 133),
            9: (105, 137),
            10: (108, 141),
            11: (112, 146),
            12: (116, 151),
        },
        2026: {
            1: (105, 137),
            2: (108, 141),
            3: (111, 145),
            4: (114, 149),
            5: (118, 154),
            6: (115, 150),
            7: (112, 146),
            8: (110, 143),
            9: (113, 147),
            10: (116, 151),
            11: (120, 156),
            12: (125, 163),
        },
    },

    "Squash": {
        2024: {
            1: (25, 35),
            2: (26, 36),
            3: (28, 39),
            4: (30, 41),
            5: (32, 44),
            6: (30, 41),
            7: (28, 39),
            8: (27, 37),
            9: (29, 40),
            10: (31, 42),
            11: (33, 45),
            12: (35, 48),
        },
        2025: {
            1: (29, 40),
            2: (30, 41),
            3: (32, 44),
            4: (34, 46),
            5: (36, 49),
            6: (34, 46),
            7: (32, 44),
            8: (31, 42),
            9: (33, 45),
            10: (35, 48),
            11: (37, 51),
            12: (39, 54),
        },
        2026: {
            1: (33, 45),
            2: (34, 47),
            3: (36, 49),
            4: (38, 52),
            5: (40, 55),
            6: (38, 52),
            7: (36, 49),
            8: (35, 48),
            9: (37, 51),
            10: (39, 54),
            11: (41, 57),
            12: (44, 60),
        },
    },
}


# ============================================================
# GET LAST COMPLETED MONTH
# ============================================================

def get_last_completed_month():
    """
    Returns the first day of the last completed month.

    Example:
        October 2026 -> September 1, 2026
        November 2026 -> October 1, 2026
        January 2027 -> December 1, 2026
    """

    today = date.today()

    if today.month == 1:
        return date(today.year - 1, 12, 1)

    return date(today.year, today.month - 1, 1)


# ============================================================
# EXTRACT
# ============================================================

def extract_seed_data():
    records = []

    cutoff_date = get_last_completed_month()

    print(
        f"Historical data cutoff: "
        f"{cutoff_date.strftime('%B %Y')}"
    )

    for commodity in COMMODITIES:
        for year in sorted(SEED_PRICES[commodity].keys()):
            for month in sorted(SEED_PRICES[commodity][year].keys()):
                record_date = date(year, month, 1)

                # Do not include future months
                if record_date > cutoff_date:
                    continue

                wholesale, retail = SEED_PRICES[commodity][year][month]

                records.append({
                    "commodity": commodity,
                    "wholesale_price_per_kg": wholesale,
                    "retail_price_per_kg": retail,
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

        # Validate wholesale price
        if wholesale <= 0:
            continue

        # Validate retail price
        if retail <= 0:
            continue

        # Retail should not be lower than wholesale
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
    print("MARKET PRICE ETL PIPELINE")
    print("=" * 60)

    # --------------------------------------------------------
    # EXTRACT
    # --------------------------------------------------------

    print()
    print("STEP 1: EXTRACT")
    print("Extracting available seed market price data...")

    cutoff_date = get_last_completed_month()

    print(
        "Latest allowed historical month: "
        f"{cutoff_date.strftime('%B %Y')}"
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
        f"{cutoff_date.strftime('%B %Y')}"
    )


# ============================================================
# RUN
# ============================================================

if __name__ == "__main__":
    run_market_price_etl()