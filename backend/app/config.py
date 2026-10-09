from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    # ---- Aplicación ----
    app_name: str = "CodeVitals"
    app_version: str = "1.0.0"
    debug: bool = True
    environment: str = "development"  # development | production | testing

    # ---|---- Base de Datos ----
    database_url: str = (
        "postgresql+asyncpg://codevitals:codevitals@db:5432/codevitals"
    )
    database_url_sync: str = (
        "postgresql+psycopg2://codevitals:codevitals@db:5432/codevitals"
    )

    # --- CORS ---
    cors_origins: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]

    #--- Fórmula de riesgo ponderado ---
    # Pesos validados 
    weight_cc: float = 0.375  # Complejidad ciclomática
    weight_churn: float = 0.275  # Code Churn
    weight_loc: float = 0.175 # Líneas de código
    weight_duplication: float = 0.125 # Duplicación de código
    weight_bus_factor: float = 0.125 # Bus Factor

    # --- Umbrales de clasificación de riesgo ---
    risk_threshold_low: int = 33
    risk_threshold_medium: int = 66

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

@lru_cache()
def get_settings() -> Settings:
    return Settings()
