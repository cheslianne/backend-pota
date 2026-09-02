# Railway deployment

Deploy this repository as two Railway services, plus the Railway PostgreSQL plugin:

## Backend service

Set the service root directory to the repository root. Railway will detect the root `Dockerfile`.

Required variables:

```text
DATABASE_URL=${{Postgres.DATABASE_URL}}
DB_HOST=postgres.railway.internal
DB_PORT=5432
DB_NAME=railway
DB_USER=postgres
DB_PASSWORD=<Railway PostgreSQL password>
SECRET_KEY=<long random application secret>
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=480
PSA_API_URL=https://openstat.psa.gov.ph/PXWeb/api/v1
BANTAY_PRESYO_URL=http://www.bantaypresyo.da.gov.ph
ALLOWED_ORIGINS=https://<frontend-service-domain>
FRONTEND_URL=https://<frontend-service-domain>
RUN_ETL_ON_STARTUP=true
BREVO_API_KEY=<Brevo API key>
BREVO_SENDER_EMAIL=<verified sender email>
BREVO_SENDER_NAME=esaka-region 3
```

The backend startup script creates missing tables, runs `seed_admin.py`, and then starts Uvicorn on Railway's `PORT`.
When `RUN_ETL_ON_STARTUP=true`, it also runs the existing PSA and forecast pipeline in the background so the forecasts endpoint is populated after deployment. Set it to `false` when running ETL as a separate service.

## Frontend service

Set the service root directory to `frontend`. Railway will detect `frontend/Dockerfile`.

Required variable:

```text
API_BASE_URL=https://<backend-service-domain>
```

The frontend container replaces the local development API URL with `API_BASE_URL` before serving the static files on Railway's `PORT`.

Use the Railway-generated public domain for each service, then replace the placeholders above. Keep database and API secrets only in Railway variables; do not commit them.