#!/bin/sh
set -e

python init_db.py
python seed_admin.py
python seed_aew.py
python seed_provincial.py
python seed_municipal.py
python seed_darfo.py
python seed_farmers.py
python seed_buyers.py
python seed_planting_intents.py

exec uvicorn src.main:app --host 0.0.0.0 --port "${PORT:-8000}"
