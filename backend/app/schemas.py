"""Esquemas Pydantic (requests) para los endpoints de la API.

Las respuestas se devuelven como dict plano (tal cual lo generan
GitAnalyzer / MetricsCalculator), envueltas en {"success", "data"},
en vez de forzarlas a un response_model estricto.
"""
from pydantic import BaseModel


class RepositoryRequest(BaseModel):
    repo_url: str
    repo_path: str | None = None


class FileRequest(BaseModel):
    file_path: str


class RepoMetricsRequest(BaseModel):
    repo_path: str


class SummaryRequest(BaseModel):
    repo_path: str


class RiskRepositoryRequest(BaseModel):
    """Para /api/v1/risk/repository y /api/v1/risk/priority."""
    repo_url: str
    repo_path: str | None = None
    limit: int = 10


class RiskModuleRequest(BaseModel):
    """Para /api/v1/risk/module. file_path es relativo a la raiz del repo."""
    repo_url: str
    file_path: str
    repo_path: str | None = None
