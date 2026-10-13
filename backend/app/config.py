from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    # ---- Aplicación ----
    app_name: str = "CodeVitals"
    app_version: str = "1.0.0"
    debug: bool = False
    environment: str = "development"  # development | production | testing

    # ---|---- Base de Datos ----
    database_url: str = (
        "postgresql+asyncpg://codevitals:codevitals@db:5432/codevitals"
    )
    database_url_sync: str = (
        "postgresql+psycopg2://codevitals:codevitals@db:5432/codevitals"
    )

    # --- Seguridad ---
    api_key: str = ""  # vacío = sin autenticación (solo desarrollo local)
    allowed_repo_hosts: list[str] = ["github.com", "gitlab.com", "bitbucket.org"]
    repos_root: str = "./repos"  # única carpeta donde se leen/clonan repositorios
    max_parallel_analyses: int = 3

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
    risk_threshold_low: int = 39
    risk_threshold_medium: int = 69

    # --- SonarQube (herramienta de apoyo, opcional) ---
    sonar_url: str = ""          # p. ej. http://sonarqube:9000; vacío = desactivado
    sonar_token: str = ""
    sonar_timeout: float = 15.0

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8-sig"
        extra = "ignore"

@lru_cache()
def get_settings() -> Settings:
    return Settings()
