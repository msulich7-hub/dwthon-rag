from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "ortools-scheduler"
    host: str = "0.0.0.0"
    port: int = 8080
    log_level: str = "info"

    # Solver wall-clock limit (seconds). Matches Mercato HEXALY_BRIDGE_TIMEOUT_MS default.
    solver_timeout_seconds: int = Field(default=120, ge=1, le=600)

    # Optional bearer token (HEXALY_BRIDGE_API_KEY compatible).
    api_key: str | None = None

    # CP-SAT search workers; 0 lets OR-Tools pick.
    solver_num_workers: int = Field(default=0, ge=0, le=64)


@lru_cache
def get_settings() -> Settings:
    return Settings()
