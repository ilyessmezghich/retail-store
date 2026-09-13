from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "Retail Store API"
    app_env: str = "development"

    database_url: str
    jwt_secret: str
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 24

    stripe_secret_key: str
    stripe_webhook_secret: str
    stripe_price_currency: str = "usd"

    frontend_url: str
    backend_url: str


@lru_cache
def get_settings() -> Settings:
    return Settings()