"""Application configuration using pydantic-settings."""

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    app_name: str = "FinSight"
    app_version: str = "1.0.0"
    debug: bool = False

    # Database
    database_url: str = "postgresql+asyncpg://financehub:financehub_dev_password@localhost:5432/financehub"

    # Redis
    redis_url: str = "redis://localhost:6379/0"
    cache_ttl_seconds: int = 3600

    # AI / OpenAI
    openai_api_key: str = ""
    openai_model: str = "gpt-4o"

    # Rules
    rules_config_path: str = "rules_config"

    # CORS
    cors_origins: list[str] = ["http://localhost:3000", "https://finsight-bay.vercel.app"]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    """Cached settings instance."""
    return Settings()
