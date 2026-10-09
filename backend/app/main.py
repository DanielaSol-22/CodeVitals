"""
CodeVitals API — FastAPI + PostgreSQL
Punto de entrada de la aplicación (equivalente al app.py original en Flask).
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.database import init_db
from app.routers import git_analysis, metrics, risk, system

settings = get_settings()


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
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(system.router)
    app.include_router(git_analysis.router)
    app.include_router(metrics.router)
    app.include_router(risk.router)

    return app


app = create_app()
