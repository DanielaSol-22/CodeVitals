"""Esquemas Pydantic (requests) para los endpoints de la API.

Las respuestas se devuelven como dict plano (tal cual lo generan
GitAnalyzer / MetricsCalculator), envueltas en {"success", "data"},
en vez de forzarlas a un response_model estricto.
"""
from pydantic import BaseModel, Field, field_validator

from app import security


class _RepoMixin(BaseModel):
    """Valida repo_url y repo_path en todas las solicitudes que los reciben."""

    @field_validator("repo_url", check_fields=False)
    @classmethod
    def _check_url(cls, v: str) -> str:
        return security.validate_repo_url(v)

    @field_validator("repo_path", check_fields=False)
    @classmethod
    def _check_path(cls, v: str | None) -> str | None:
        return security.validate_repo_path(v)


class RepositoryRequest(_RepoMixin):
    repo_url: str
    repo_path: str | None = None


class FileRequest(BaseModel):
    file_path: str

    @field_validator("file_path")
    @classmethod
    def _check_file(cls, v: str) -> str:
        return security.validate_local_file(v)


class _PathRequired(BaseModel):
    @field_validator("repo_path", check_fields=False)
    @classmethod
    def _check_path(cls, v: str) -> str:
        resolved = security.validate_repo_path(v)
        if resolved is None:
            raise ValueError("repo_path es obligatorio.")
        return resolved


class RepoMetricsRequest(_PathRequired):
    repo_path: str


class SummaryRequest(_PathRequired):
    repo_path: str


class RiskRepositoryRequest(_RepoMixin):
    """Para /api/v1/risk/repository y /api/v1/risk/priority."""
    repo_url: str
    repo_path: str | None = None
    limit: int = Field(default=10, ge=1, le=100)


class RiskModuleRequest(_RepoMixin):
    """Para /api/v1/risk/module. file_path es relativo a la raiz del repo."""
    repo_url: str
    file_path: str
    repo_path: str | None = None

    @field_validator("file_path")
    @classmethod
    def _check_file(cls, v: str) -> str:
        return security.validate_relative_file(v)
