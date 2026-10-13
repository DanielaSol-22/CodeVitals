"""
CodeVitals API — FastAPI + PostgreSQL
Punto de entrada de la aplicación (equivalente al app.py original en Flask).
"""
import os
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.database import init_db
from app.security import require_api_key
from app.routers import git_analysis, metrics, risk, sonar, statistics, system

settings = get_settings()

# Nunca pedir usuario/contraseña por consola si un repositorio es privado: falla de inmediato.
os.environ.setdefault("GIT_TERMINAL_PROMPT", "0")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Crea las tablas en PostgreSQL al iniciar (en producción: usar Alembic migrations)
    await init_db()
    yield


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        description=(
            "API de análisis de métricas de código en repositorios Git para la "
            "detección temprana de módulos con dificultades de mantenibilidad."
        ),
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["Content-Type", "X-API-Key"],
    )

    app.include_router(system.router)
    protected = [Depends(require_api_key)]
    app.include_router(git_analysis.router, dependencies=protected)
    app.include_router(metrics.router, dependencies=protected)
    app.include_router(risk.router, dependencies=protected)
    app.include_router(statistics.router, dependencies=protected)
    app.include_router(sonar.router, dependencies=protected)

    return app


app = create_app()
