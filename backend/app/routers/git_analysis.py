"""
Opción A — Endpoints de análisis Git (historial, churn, bus factor).
  POST /api/v1/analyze/repository
  GET  /api/v1/analyze/repository/{repo_name}/churn/{file_path}
  POST /api/v1/analyze/repository/bus-factor
"""
from fastapi import APIRouter, HTTPException

from app.modules.git_analyzer import GitAnalyzer
from app.schemas import RepositoryRequest

router = APIRouter(prefix="/api/v1/analyze", tags=["Git Analysis (Opción A)"])


@router.post("/repository")
def analyze_repository(payload: RepositoryRequest):
    analyzer = GitAnalyzer(payload.repo_url, payload.repo_path)
    result = analyzer.analyze_repository()
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return {"success": True, "data": result}


@router.get("/repository/{repo_name}/churn/{file_path:path}")
def get_file_churn(repo_name: str, file_path: str, repo_url: str, repo_path: str | None = None):
    """
    repo_url se pasa como query param (igual que en la versión Flask);
    repo_name queda solo como identificador legible en la URL.
    """
    analyzer = GitAnalyzer(repo_url, repo_path)
    result = analyzer.calculate_code_churn(file_path)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return {"success": True, "data": result}


@router.post("/repository/bus-factor")
def get_bus_factor(payload: RepositoryRequest):
    analyzer = GitAnalyzer(payload.repo_url, payload.repo_path)
    result = analyzer.calculate_bus_factor()
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return {"success": True, "data": result}
