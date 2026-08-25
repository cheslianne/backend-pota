#!/bin/sh
set -eu

api_base_url="${API_BASE_URL:-http://127.0.0.1:8000}"

find /app -type f \( -name '*.html' -o -name '*.js' \) \
  -exec sed -i "s|http://127.0.0.1:8000|${api_base_url}|g" {} +

exec python -m http.server "${PORT:-8080}" --bind 0.0.0.0