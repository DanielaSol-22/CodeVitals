"""
SonarQube como herramienta de apoyo.
  GET  /api/v1/sonar/status    -> configuracion y disponibilidad del servidor
  GET  /api/v1/sonar/measures  -> medidas del proyecto y de sus archivos
  POST /api/v1/sonar/compare   -> contrasta las metricas propias con las de SonarQube
"""
from fastapi import APIRouter, HTTPException, Query
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel, Field, field_validator
from scipy import stats

from app import security
from app.config import get_settings
from app.modules.sonar_client import SonarClient, SonarError
from app.routers.risk import _analyze_all_modules

router = APIRouter(prefix="/api/v1/sonar", tags=["SonarQube (apoyo)"])

MIN_PAIRS = 5

# (nombre, metrica propia, metrica de SonarQube)
COMPARISONS = [
    ("Complejidad ciclomática", "cyclomatic_complexity", "complexity"),
    ("Líneas de código", "lines_of_code", "ncloc"),
    ("Duplicación", "duplication_percent", "duplicated_lines_density"),
]


def _client() -> SonarClient:
    s = get_settings()
    return SonarClient(s.sonar_url, s.sonar_token, s.sonar_timeout)


class CompareRequest(BaseModel):
    repo_url: str
    repo_path: str | None = None
    project_key: str = Field(pattern=r"^[A-Za-z0-9_.:-]{1,400}$")

    @field_validator("repo_url")
    @classmethod
    def _check_url(cls, v: str) -> str:
        return security.validate_repo_url(v)

    @field_validator("repo_path")
    @classmethod
    def _check_path(cls, v: str | None) -> str | None:
        return security.validate_repo_path(v)


def _norm(path: str) -> str:
    path = str(path).replace("\\", "/")
    while path.startswith("./") or path.startswith("/"):
        path = path[2:] if path.startswith("./") else path[1:]
    return path


def match_files(modules: list[dict], sonar_files: list[dict]) -> list[tuple[dict, dict]]:
    """Empareja modulos propios con archivos de SonarQube por ruta (coincidencia por sufijo)."""
    sonar_by_path = {_norm(f["path"]): f for f in sonar_files}
    pairs = []
    for m in modules:
        own = _norm(m.get("file", ""))
        hit = sonar_by_path.get(own)
        if hit is None:
            hit = next((f for p, f in sonar_by_path.items() if own.endswith("/" + p)), None)
        if hit is not None:
            pairs.append((m, hit))
    return pairs


def compare_metrics(pairs: list[tuple[dict, dict]]) -> list[dict]:
    results = []
    for label, own_key, sonar_key in COMPARISONS:
        xs, ys = [], []
        for m, f in pairs:
            y = f["measures"].get(sonar_key)
            if y is not None:
                xs.append(float(m["code_metrics"].get(own_key, 0) or 0))
                ys.append(y)
        item = {"metric": label, "n": len(xs), "rho": None, "p_value": None, "note": None}
        if len(xs) < MIN_PAIRS:
            item["note"] = "Muestra insuficiente para correlacionar."
        elif len(set(xs)) < 2 or len(set(ys)) < 2:
            item["note"] = "Una de las series es constante; no se calcula la correlación."
        else:
            rho, p = stats.spearmanr(xs, ys)
            item["rho"], item["p_value"] = round(float(rho), 4), round(float(p), 6)
        results.append(item)
    return results


@router.get("/status")
def sonar_status():
    return _client().status()


@router.get("/measures")
def sonar_measures(project_key: str = Query(min_length=1, max_length=400, pattern=r"^[A-Za-z0-9_.:-]+$")):
    client = _client()
    try:
        project = client.project_measures(project_key)
        files = client.file_measures(project_key)
    except SonarError as e:
        raise HTTPException(status_code=502, detail=str(e))
    return {**project, "files_count": len(files), "files": files}


@router.post("/compare")
async def sonar_compare(payload: CompareRequest):
    client = _client()
    if not client.configured:
        raise HTTPException(status_code=503, detail="SonarQube no está configurado (SONAR_URL y SONAR_TOKEN).")
    try:
        sonar_files = await run_in_threadpool(client.file_measures, payload.project_key)
    except SonarError as e:
        raise HTTPException(status_code=502, detail=str(e))
    modules, _git, _total = await run_in_threadpool(_analyze_all_modules, payload.repo_url, payload.repo_path)
    pairs = match_files(modules, sonar_files)
    totals = {"smells": 0.0, "bugs": 0.0, "vulnerabilities": 0.0, "debt_minutes": 0.0}
    for _, f in pairs:
        ms = f["measures"]
        totals["smells"] += ms.get("code_smells") or 0
        totals["bugs"] += ms.get("bugs") or 0
        totals["vulnerabilities"] += ms.get("vulnerabilities") or 0
        totals["debt_minutes"] += ms.get("sqale_index") or 0
    return {
        "project_key": payload.project_key,
        "own_modules": len(modules),
        "sonar_files": len(sonar_files),
        "matched": len(pairs),
        "agreement": compare_metrics(pairs),
        "sonar_totals": {k: int(v) for k, v in totals.items()},
    }
