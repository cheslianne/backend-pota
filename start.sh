#!/bin/sh
set -e

python init_db.py
python seed_admin.py

exec uvicorn src.main:app --host 0.0.0.0 --port "${PORT:-8000}"