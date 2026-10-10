"""
Endpoints de sistema:
  GET /health
  GET /api/v1/info
"""
from fastapi import APIRouter

from app.config import get_settings

router = APIRouter(tags=["Sistema"])
settings = get_settings()


@router.get("/health")
def health_check():
    return {"status": "ok", "service": settings.app_name, "version": settings.app_version}


@router.get("/api/v1/info")
def api_info():
    return {
        "name": settings.app_name,
        "version": settings.app_version,
        "stack": "FastAPI + PostgreSQL + PyDriller + Lizard + GitPython",
        "endpoints": {
            "git_analysis": [
                "POST /api/v1/analyze/repository",
                "GET /api/v1/analyze/repository/{repo_name}/churn/{file_path}",
                "POST /api/v1/analyze/repository/bus-factor",
            ],
            "code_metrics": [
                "POST /api/v1/metrics/repository",
                "POST /api/v1/metrics/file",
                "POST /api/v1/metrics/summary",
            ],
            "statistics": [
                "POST /api/v1/stats/validation",
                "POST /api/v1/stats/validation/multi",
                "GET /api/v1/stats/validation?repo_url=...",
            ],
            "system": ["GET /health", "GET /api/v1/info"],
        },
        "risk_formula": (
            "Risk = 0.375*CC + 0.275*Churn + 0.175*LOC + 0.125*Dup + 0.125*BusFactor "
            "(escala 0-100, clasificación LOW/MEDIUM/HIGH)"
        ),
        "docs": "/docs",
    }
