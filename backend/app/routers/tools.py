"""
Contraste con herramientas externas (no cambian el puntaje de riesgo).
  POST /api/v1/tools/compare -> correlacion de Spearman entre las metricas de CodeVitals y las de scc (todos los
                                lenguajes) y Radon (solo Python)
"""
import os

from fastapi import APIRouter
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel, field_validator
from scipy import stats

from app import security
from app.modules import radon_compare
from app.modules.scc_runner import run_scc, scc_available
from app.routers.risk import _analyze_all_modules, _cloned_repo_dir

router = APIRouter(prefix="/api/v1/tools", tags=["Contraste con otras herramientas"])

MIN_PAIRS = 5

# (nombre, metrica propia, clave en la herramienta)
SCC_COMPARISONS = [
    ("Complejidad ciclomática", "cyclomatic_complexity", "complexity"),
    ("Líneas de código", "lines_of_code", "code"),
]


class ToolsRequest(BaseModel):
    repo_url: str
    repo_path: str | None = None

    @field_validator("repo_url")
    @classmethod
    def _check_url(cls, v: str) -> str:
        return security.validate_repo_url(v)

    @field_validator("repo_path")
    @classmethod
    def _check_path(cls, v: str | None) -> str | None:
        return security.validate_repo_path(v)


def spearman_item(label: str, xs: list[float], ys: list[float]) -> dict:
    item = {"metric": label, "n": len(xs), "rho": None, "p_value": None, "note": None}
    if len(xs) < MIN_PAIRS:
        item["note"] = "Muestra insuficiente para correlacionar."
    elif len(set(xs)) < 2 or len(set(ys)) < 2:
        item["note"] = "Una de las series es constante; no se calcula la correlación."
    else:
        rho, p = stats.spearmanr(xs, ys)
        item["rho"], item["p_value"] = round(float(rho), 4), round(float(p), 6)
    return item


def compare_with_scc(modules: list[dict], scc_files: dict[str, dict], bases: list[str] | None = None) -> tuple[list[dict], int]:
    pairs = []
    for m in modules:
        real = radon_compare.resolve_path(m.get("file", ""), bases or [])
        hit = scc_files.get(os.path.normcase(real)) if real else None
        if hit is not None:
            pairs.append((m, hit))
    items = []
    for label, own_key, key in SCC_COMPARISONS:
        xs = [float(m["code_metrics"].get(own_key, 0) or 0) for m, _ in pairs]
        ys = [float(h[key]) for _, h in pairs]
        items.append(spearman_item(label, xs, ys))
    return items, len(pairs)


@router.post("/compare")
async def tools_compare(payload: ToolsRequest):
    modules, git, _total = await run_in_threadpool(_analyze_all_modules, payload.repo_url, payload.repo_path)
    clone = os.path.abspath(_cloned_repo_dir(git))
    bases = [clone, os.path.dirname(clone)]
    tools = []

    if scc_available():
        try:
            files = await run_in_threadpool(run_scc, clone)
            agreement, n = compare_with_scc(modules, files, bases)
            tools.append({"tool": "scc", "scope": "todos los lenguajes", "files": n, "agreement": agreement, "error": None})
        except Exception as e:  # scc roto o sin tiempo: se informa, el resto sigue
            tools.append({"tool": "scc", "scope": "todos los lenguajes", "files": 0, "agreement": [], "error": str(e)[:200]})
    else:
        tools.append({"tool": "scc", "scope": "todos los lenguajes", "files": 0, "agreement": [],
                      "error": "scc no está instalado en el servidor."})

    agreement, n = await run_in_threadpool(radon_compare.compare_with_radon, modules, bases)
    tools.append({"tool": "Radon", "scope": "solo Python", "files": n, "agreement": agreement, "error": None})

    return {"own_modules": len(modules), "tools": tools}
