"""
Tests for application configuration.

Verifies that Pydantic Settings loads correctly, validates constraints,
caches the singleton, and respects environment variable overrides.
"""

import pytest
from pydantic import ValidationError

from app.core.config import Settings, get_settings


class TestSettingsDefaults:
    """Test that Settings loads with all expected defaults."""

    def test_default_app_name(self):
        """Default APP_NAME should be 'OpenMind AI Platform'."""
        settings = Settings()
        assert settings.APP_NAME == "OpenMind AI Platform"

    def test_default_version(self):
        """Default APP_VERSION should be '0.2.0'."""
        settings = Settings()
        assert settings.APP_VERSION == "0.2.0"

    def test_default_environment(self):
        """Default ENVIRONMENT should be 'development'."""
        settings = Settings()
        assert settings.ENVIRONMENT == "development"

    def test_default_debug(self):
        """Default DEBUG should be False."""
        # We explicitly pass DEBUG=False to avoid loading from .env
        assert Settings.model_fields["DEBUG"].default is False

    def test_default_host(self):
        """Default HOST should be '0.0.0.0'."""
        settings = Settings()
        assert settings.HOST == "0.0.0.0"  # noqa: S104

    def test_default_port(self):
        """Default PORT should be 8000."""
        settings = Settings()
        assert settings.PORT == 8000

    def test_default_workers(self):
        """Default WORKERS should be 1."""
        settings = Settings()
        assert settings.WORKERS == 1

    def test_default_log_level(self):
        """Default LOG_LEVEL should be 'INFO'."""
        assert Settings.model_fields["LOG_LEVEL"].default == "INFO"

    def test_default_log_format(self):
        """Default LOG_FORMAT should be 'text'."""
        settings = Settings()
        assert settings.LOG_FORMAT == "text"

    def test_default_cors_origins(self):
        """Default CORS_ORIGINS should allow all origins."""
        settings = Settings()
        assert settings.CORS_ORIGINS == ["*"]

    def test_default_api_prefix(self):
        """Default API_V1_PREFIX should be '/api/v1'."""
        settings = Settings()
        assert settings.API_V1_PREFIX == "/api/v1"


class TestSettingsValidation:
    """Test that Settings validates field constraints."""

    def test_invalid_environment_rejected(self):
        """ENVIRONMENT must be one of 'development', 'staging', 'production'."""
        with pytest.raises(ValidationError):
            Settings(ENVIRONMENT="invalid")  # type: ignore[arg-type]

    def test_valid_environment_staging(self):
        """'staging' should be accepted as a valid ENVIRONMENT."""
        settings = Settings(ENVIRONMENT="staging")
        assert settings.ENVIRONMENT == "staging"

    def test_valid_environment_production(self):
        """'production' should be accepted as a valid ENVIRONMENT."""
        settings = Settings(ENVIRONMENT="production")
        assert settings.ENVIRONMENT == "production"

    def test_invalid_log_level_rejected(self):
        """LOG_LEVEL must be a valid Python logging level."""
        with pytest.raises(ValidationError):
            Settings(LOG_LEVEL="VERBOSE")  # type: ignore[arg-type]

    def test_invalid_log_format_rejected(self):
        """LOG_FORMAT must be 'json' or 'text'."""
        with pytest.raises(ValidationError):
            Settings(LOG_FORMAT="xml")  # type: ignore[arg-type]


class TestSettingsOverride:
    """Test that Settings respects constructor overrides."""

    def test_override_app_name(self):
        """APP_NAME should be overridable."""
        settings = Settings(APP_NAME="Custom Name")
        assert settings.APP_NAME == "Custom Name"

    def test_override_port(self):
        """PORT should be overridable."""
        settings = Settings(PORT=9000)
        assert settings.PORT == 9000

    def test_override_debug(self):
        """DEBUG should be overridable."""
        settings = Settings(DEBUG=True)
        assert settings.DEBUG is True


class TestGetSettings:
    """Test the get_settings() cached singleton."""

    def test_returns_settings_instance(self):
        """get_settings() should return a Settings instance."""
        settings = get_settings()
        assert isinstance(settings, Settings)

    def test_returns_cached_instance(self):
        """get_settings() should return the same instance on repeated calls."""
        first = get_settings()
        second = get_settings()
        assert first is second

    def test_has_expected_attributes(self):
        """The returned settings should have all expected attributes."""
        settings = get_settings()
        required_attrs = [
            "APP_NAME",
            "APP_VERSION",
            "APP_DESCRIPTION",
            "ENVIRONMENT",
            "DEBUG",
            "HOST",
            "PORT",
            "WORKERS",
            "API_V1_PREFIX",
            "LOG_LEVEL",
            "LOG_FORMAT",
            "CORS_ORIGINS",
        ]
        for attr in required_attrs:
            assert hasattr(settings, attr), f"Missing attribute: {attr}"
