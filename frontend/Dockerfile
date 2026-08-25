FROM python:3.11-slim

WORKDIR /app
COPY . .

EXPOSE 8080

CMD ["sh", "-c", "API_BASE_URL=\"${API_BASE_URL:-http://127.0.0.1:8000}\"; find /app -type f \( -name '*.html' -o -name '*.js' \) -exec sed -i \"s|http://127.0.0.1:8000|$API_BASE_URL|g\" {} +; exec python -m http.server \"${PORT:-8080}\" --bind 0.0.0.0"]