from pydantic_settings import BaseSettings
from pydantic import Field
from functools import lru_cache


class Settings(BaseSettings):
    SUPABASE_URL: str
    SUPABASE_ANON_KEY: str
    SUPABASE_SERVICE_ROLE_KEY: str
    DATABASE_URL: str

    # Logging configuration
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "text"          # "text" or "json"
    LOG_EXCLUDED_PATHS: str = ""      # comma-separated, e.g. "/health,/docs"

    # CORS - comma-separated list of allowed origins
    CORS_ORIGINS: str = "http://localhost:3000"

    # Environment (used in health checks and observability)
    ENVIRONMENT: str = "development"   # development | staging | production

    @property
    def cors_origins_list(self) -> list[str]:
        """Return CORS origins as a clean list."""
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
