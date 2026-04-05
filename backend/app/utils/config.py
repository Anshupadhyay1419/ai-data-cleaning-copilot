"""
utils/config.py
───────────────
Centralised settings loader.

All configuration comes from environment variables (or the .env file in the
project root).  Access any setting via:

    from app.utils.config import settings
    print(settings.hf_codemix_url)
"""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Pydantic-Settings automatically reads values from:
      1. The environment (highest priority)
      2. The .env file specified in model_config
    """

    # ── Hugging Face model URLs ──────────────────────────────────────────
    hf_codemix_url: str = ""
    hf_english_url: str = ""
    hf_fake_news_url: str = ""

    # ── Hugging Face API tokens ──────────────────────────────────────────
    hf_codemix_token: str = ""
    hf_english_token: str = ""
    hf_fake_news_token: str = ""

    # ── Application settings ─────────────────────────────────────────────
    app_env: str = "development"
    log_level: str = "INFO"

    model_config = SettingsConfigDict(
        env_file=".env",           # used locally; ignored if file not present
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",            # ignore any extra env vars in the container
    )


@lru_cache()
def get_settings() -> Settings:
    """Return a cached singleton Settings instance."""
    return Settings()


# Convenient module-level alias so callers can just do:
#   from app.utils.config import settings
settings: Settings = get_settings()
