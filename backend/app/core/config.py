"""
CafeOS application configuration.

Loaded from environment variables (injected by Docker Compose).
Uses pydantic-settings for validation and type coercion.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # ── Database ──────────────────────────────────────────────
    DATABASE_URL: str = (
        "postgresql+psycopg://cafeos_admin:cafeos_secure_password@localhost:5432/cafeos_dev"
    )

    # ── Security ──────────────────────────────────────────────
    SECRET_KEY: str = "local_development_jwt_secret_key_12345"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_MINUTES: int = 480  # 8 hours for staff tokens

    # ── Session Cookie ────────────────────────────────────────
    SESSION_COOKIE_NAME: str = "cafeos_session"
    SESSION_COOKIE_MAX_AGE: int = 86400  # 24 hours

    # ── CORS ──────────────────────────────────────────────────
    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",  # Vite dev server
        "http://localhost:3000",
    ]

    # ── Application ───────────────────────────────────────────
    APP_NAME: str = "CafeOS"
    APP_VERSION: str = "1.0.0-MVP"
    DEBUG: bool = True


# Singleton instance
settings = Settings()
