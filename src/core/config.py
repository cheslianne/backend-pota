from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Database
    db_host: str
    db_port: int
    db_name: str
    db_user: str
    db_password: str
    database_url: str

    # Authentication
    secret_key: str
    algorithm: str
    access_token_expire_minutes: int

    # ETL / Data Sources
    psa_api_url: str
    bantay_presyo_url: str

    # CORS
    allowed_origins: str

    # Brevo Email
    BREVO_API_KEY: str
    BREVO_SENDER_EMAIL: str
    BREVO_SENDER_NAME: str = "eSaka"

    # Frontend URL used to build links inside emails (e.g. password reset)
    frontend_url: str = "http://127.0.0.1:5500/frontend"

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore"
    )


settings = Settings()