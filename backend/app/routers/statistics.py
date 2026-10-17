"""
Validación estadística (Spearman + Chi-cuadrado).
  POST /api/v1/stats/validation   -> analiza el repositorio, calcula y guarda resultados
  GET  /api/v1/stats/validation   -> último resultado guardado para un repo_url
"""
import asyncio

from fastapi.concurrency import run_in_threadpool
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app import models
from app.database import get_db
from app import security
from app.modules import statistics_analyzer as sa
from app.routers.risk import _analyze_all_modules, _cloned_repo_dir

MAX_PARALLEL_REPOS = 3

router = APIRouter(prefix="/api/v1/stats", tags=["Validación estadística"])


class StatsRequest(BaseModel):
    repo_url: str
    repo_path: str | None = None
    alpha: float = Field(default=sa.ALPHA_DEFAULT, gt=0, lt=1)

    @field_validator("repo_url")
    @classmethod
    def _check_url(cls, v: str) -> str:
        return security.validate_repo_url(v)

    @field_validator("repo_path")
    @classmethod
    def _check_path(cls, v: str | None) -> str | None:
        return security.validate_repo_path(v)


class MultiStatsRequest(BaseModel):
    repo_urls: list[str] = Field(min_length=1, max_length=20)
    alpha: float = Field(default=sa.ALPHA_DEFAULT, gt=0, lt=1)

    @field_validator("repo_urls")
    @classmethod
    def _check_urls(cls, v: list[str]) -> list[str]:
        return list(dict.fromkeys(security.validate_repo_url(u) for u in v))


async def _persist(db: AsyncSession, repo_url: str, result: dict) -> None:
    nombre = repo_url.rstrip("/").split("/")[-1][:255]
    rows = []
    for item in result["spearman"]:
        rows.append(models.ResultadoEstadistico(
            repo_url=repo_url, nombre=nombre, prueba="spearman", variable=item["variable"],
            estadistico=item["rho"], valor_p=item["p_value"], n=item["n"],
            significativo=item["significant"], interpretacion=item["interpretation"]))
    for item in result["chi_square"]:
        rows.append(models.ResultadoEstadistico(
            repo_url=repo_url, nombre=nombre, prueba="chi_square", variable=item["variable"],
            estadistico=item["chi2"], valor_p=item["p_value"], n=item["n"],
            significativo=item["significant"], interpretacion=item["interpretation"]))
    ext = result.get("external_validity") or {}
    ext_items = ([("risk_score", ext["score"])] if ext.get("score") else []) + [(i["variable"], i) for i in ext.get("by_metric", [])]
    for variable, item in ext_items:
        rows.append(models.ResultadoEstadistico(
            repo_url=repo_url, nombre=nombre, prueba="spearman_externo", variable=variable,
            estadistico=item["rho"], valor_p=item["p_value"], n=item["n"],
            significativo=item["significant"], interpretacion=item["interpretation"]))
    db.add_all(rows)
    await db.commit()


@router.post("/validation")
async def run_validation(payload: StatsRequest, db: AsyncSession = Depends(get_db)):
    # El análisis es síncrono y pesado (clona y recorre el historial): se ejecuta en un
    # hilo aparte para no bloquear el servidor mientras trabaja.
    modules, git, _ = await run_in_threadpool(_analyze_all_modules, payload.repo_url, payload.repo_path)
    if not modules:
        raise HTTPException(status_code=400, detail="El repositorio no tiene módulos analizables.")
    result = sa.analyze_modules(modules, payload.alpha)
    result["repo_url"] = payload.repo_url
    try:
        await _persist(db, payload.repo_url, result)
        result["saved"] = True
    except Exception:
        await db.rollback()
        result["saved"] = False
    return result


@router.post("/validation/multi")
async def run_validation_multi(payload: MultiStatsRequest, db: AsyncSession = Depends(get_db)):
    """Analiza varios repositorios y junta todos sus módulos en UNA sola muestra
    para las pruebas estadísticas (más módulos = mayor poder estadístico).
    Un repositorio que falle no detiene a los demás: se reporta en 'failed'."""
    pooled: list[dict] = []
    per_repo: list[dict] = []
    failed: list[dict] = []

    urls = list(dict.fromkeys(u.strip() for u in payload.repo_urls if u.strip()))
    gate = asyncio.Semaphore(MAX_PARALLEL_REPOS)  # varios repos a la vez, sin saturar el equipo

    async def work(url: str):
        async with gate:
            try:
                modules, _git, commits = await run_in_threadpool(_analyze_all_modules, url, None)
                return url, modules, commits, None
            except HTTPException as e:
                return url, None, 0, str(e.detail)
            except Exception as e:  # clonado fallido, repo privado, etc.
                return url, None, 0, str(e)[:300]

    for url, modules, commits, error in await asyncio.gather(*(work(u) for u in urls)):
        if error is not None:
            failed.append({"repo_url": url, "error": error})
            continue
        pooled.extend(modules)
        per_repo.append({"repo_url": url, "modules": len(modules), "total_commits": commits})

    if not pooled:
        raise HTTPException(status_code=400, detail={"message": "Ningún repositorio produjo módulos analizables.", "failed": failed})

    result = sa.analyze_modules(pooled, payload.alpha)
    result["repositories"] = per_repo
    result["failed"] = failed
    key = "multi:" + ",".join(r["repo_url"] for r in per_repo)
    result["repo_url"] = key[:1024]
    try:
        await _persist(db, key[:1024], result)
        result["saved"] = True
    except Exception:
        await db.rollback()
        result["saved"] = False
    return result


@router.get("/validation")
async def last_validation(repo_url: str = Query(...), db: AsyncSession = Depends(get_db)):
    q = (select(models.ResultadoEstadistico)
         .where(models.ResultadoEstadistico.repo_url == repo_url)
         .order_by(models.ResultadoEstadistico.fecha_calculo.desc(), models.ResultadoEstadistico.id.desc())
         .limit(10))
    rows = (await db.execute(q)).scalars().all()
    if not rows:
        raise HTTPException(status_code=404, detail="Aún no hay resultados guardados para este repositorio.")
    return [
        {"prueba": r.prueba, "variable": r.variable, "estadistico": r.estadistico,
         "valor_p": r.valor_p, "n": r.n, "significativo": r.significativo,
         "interpretacion": r.interpretacion, "fecha": r.fecha_calculo.isoformat()}
        for r in rows
    ]
