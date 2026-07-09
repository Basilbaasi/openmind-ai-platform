"""
Application configuration module.

Centralizes all configuration using Pydantic Settings for type-safe,
environment-variable-driven configuration. This ensures configuration
is validated at startup and fails fast on misconfiguration.
"""

from functools import lru_cache
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables and .env file.

    Pydantic Settings automatically reads environment variables matching
    field names (case-insensitive). The .env file is used as a fallback
    for local development.
    """

    # ── Application ──────────────────────────────────────────────────
    APP_NAME: str = "OpenMind AI Platform"
    APP_VERSION: str = "0.1.0"
    APP_DESCRIPTION: str = "A production-grade AI platform providing intelligent services."
    ENVIRONMENT: Literal["development", "staging", "production"] = "development"
    DEBUG: bool = False

    # ── Server ───────────────────────────────────────────────────────
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    WORKERS: int = 1

    # ── API ──────────────────────────────────────────────────────────
    API_V1_PREFIX: str = "/api/v1"

    # ── Logging ──────────────────────────────────────────────────────
    LOG_LEVEL: Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"] = "INFO"
    LOG_FORMAT: Literal["json", "text"] = "text"

    # ── CORS ─────────────────────────────────────────────────────────
    CORS_ORIGINS: list[str] = Field(default=["*"])

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": True,
        "extra": "ignore",
    }


@lru_cache
def get_settings() -> Settings:
    """
    Returns a cached singleton of the application settings.

    Using lru_cache ensures the .env file is read only once and the same
    Settings instance is reused across the application lifetime.
    """
    return Settings()
