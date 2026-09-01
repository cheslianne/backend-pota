import sys
import importlib
import pkgutil

# ============================================================
# LOAD ALL SQLALCHEMY MODELS
# ============================================================

import src.models as models_pkg

for _, module_name, _ in pkgutil.iter_modules(models_pkg.__path__):
    importlib.import_module(
        f"src.models.{module_name}"
    )


# ============================================================
# ETL IMPORTS
# ============================================================

from apscheduler.schedulers.blocking import BlockingScheduler

from src.etl_pipeline.psa_testfile import main as run_psa
from src.etl_pipeline.forecast import main as run_forecast
from src.etl_pipeline.forecast_kalabasa import main as run_kalabasa_forecast
from src.etl_pipeline.red_onion import main as run_red_onion
from src.etl_pipeline.white_onion import main as run_white_onion


# ============================================================
# RUN ETL PIPELINE
# ============================================================

def run_pipeline():

    print()
    print("=" * 60)
    print("STARTING QUARTERLY PSA ETL PIPELINE")
    print("=" * 60)

    try:

        # ----------------------------------------------------
        # STEP 1: PSA OPENSTAT
        # ----------------------------------------------------

        print()
        print("STEP 1: FETCHING PSA OPENSTAT DATA")

        run_psa()


        # ----------------------------------------------------
        # STEP 2: RED ONION ETL
        # ----------------------------------------------------

        print()
        print("STEP 2: FETCHING RED ONION PSA DATA")

        run_red_onion()


        # ----------------------------------------------------
        # STEP 3: WHITE ONION ETL
        # ----------------------------------------------------

        print()
        print("STEP 3: FETCHING WHITE ONION PSA DATA")

        run_white_onion()


        # ----------------------------------------------------
        # STEP 4: TOMATO FORECAST
        # ----------------------------------------------------

        print()
        print("STEP 4: GENERATING TOMATO FORECAST")

        run_forecast("Tomato")


        # ----------------------------------------------------
        # STEP 5: KALABASA FORECAST
        # ----------------------------------------------------

        print()
        print("STEP 5: GENERATING KALABASA FORECAST")

        run_kalabasa_forecast()


        # ----------------------------------------------------
        # STEP 6: RED ONION FORECAST
        # ----------------------------------------------------

        print()
        print("STEP 6: GENERATING RED ONION FORECAST")

        run_forecast("Red Onion")


        # ----------------------------------------------------
        # STEP 7: WHITE ONION FORECAST
        # ----------------------------------------------------

        print()
        print("STEP 7: GENERATING WHITE ONION FORECAST")

        run_forecast("White Onion")


        print()
        print("=" * 60)
        print("QUARTERLY ETL PIPELINE COMPLETED")
        print("=" * 60)

    except Exception as error:

        print()
        print("=" * 60)
        print("QUARTERLY ETL PIPELINE FAILED")
        print("=" * 60)

        print(error)


# ============================================================
# MANUAL RUN
# ============================================================

if "--run-now" in sys.argv:

    print()
    print("=" * 60)
    print("MANUAL ETL RUN")
    print("=" * 60)

    run_pipeline()

    sys.exit(0)


# ============================================================
# QUARTERLY SCHEDULER
# ============================================================

scheduler = BlockingScheduler(
    timezone="Asia/Manila"
)


scheduler.add_job(
    run_pipeline,
    trigger="cron",

    # January, April, July, October
    month="1,4,7,10",

    # First day of the month
    day=1,

    # 8:00 AM Philippine time
    hour=8,
    minute=0,

    id="quarterly_psa_etl",
    replace_existing=True,
)


# ============================================================
# START SCHEDULER
# ============================================================

print()
print("=" * 60)
print("eSAKA QUARTERLY ETL SCHEDULER")
print("=" * 60)

print("Schedule: January, April, July, October")
print("Time: 8:00 AM Asia/Manila")
print("Source: PSA OpenSTAT")

print()
print("Scheduler is running...")

scheduler.start()