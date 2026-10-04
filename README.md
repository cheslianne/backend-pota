# eSaka
backend, database

## Database deployment

Set `DATABASE_URL` to the connection string provided by the hosted PostgreSQL
service. The application uses this variable first, so on Railway it should be
set as a reference to the PostgreSQL service's `DATABASE_URL` variable. The
older `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, and `DB_PASSWORD` variables
remain supported for local development, but stale values for them cannot
override `DATABASE_URL`.
