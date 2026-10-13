"""
Opcion C - Deteccion de riesgo (combina GitAnalyzer + MetricsCalculator + RiskDetector).
Estas son las rutas que consume el frontend (Dashboard, ModuleAnalysis, PriorityList).
  POST /api/v1/risk/repository
  POST /api/v1/risk/module
  POST /api/v1/risk/priority
"""
import os
import threading

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.concurrency import run_in_threadpool
from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app import models, security
from app.config import get_settings
from app.database import get_db
from app.modules.git_analyzer import GitAnalyzer
from app.modules.metrics_calculator import MetricsCalculator
from app.modules.risk_detector import RiskDetector
from app.schemas import RiskModuleRequest, RiskRepositoryRequest

router = APIRouter(prefix="/api/v1/risk", tags=["Risk Detection (Dashboard)"])

_risk_detector = RiskDetector()

# Requisito de la encuesta (42.2%): historial minimo para que el analisis
# tenga suficiente contexto de churn/bus factor. No se bloquea el analisis
# si no se cumple (se sigue calculando), pero se informa al usuario.
MIN_COMMITS_REQUIRED = 50


async def _persist_analysis(
    db: AsyncSession, repo_url: str, repo_path: str, modules: list[dict]
) -> None:
    """Guarda el analisis en PostgreSQL (tablas de app/models.py) para poder
    contar despues cuantos repositorios distintos se han analizado."""
    repositorio = models.Repositorio(
        nombre=repo_url.rstrip("/").split("/")[-1],
        ruta=repo_path,
        url_remota=repo_url,
    )
    db.add(repositorio)
    await db.flush()  # asigna repositorio.id

    for m in modules:
        code = m["code_metrics"]
        git_m = m["git_metrics"]
        risk = m["risk_analysis"]

        modulo = models.Modulo(
            repositorio_id=repositorio.id,
            ruta_archivo=m["file"],
            lenguaje=os.path.splitext(m["file"])[1] or None,
        )
        db.add(modulo)
        await db.flush()

        db.add(
            models.Metrica(
                modulo_id=modulo.id,
                complejidad_ciclomatica=code.get("cyclomatic_complexity", 0),
                loc=code.get("lines_of_code", 0),
                codigo_duplicado_pct=code.get("duplication_percent", 0.0),
                code_churn=git_m.get("code_churn", 0),
                bus_factor=int(git_m.get("bus_factor_risk", 0)),
                numero_commits=git_m.get("commits", 0),
                numero_funciones=code.get("functions_count", 0),
            )
        )
        riesgo = models.Riesgo(
            modulo_id=modulo.id,
            puntaje=risk["risk_score"],
            clasificacion=risk["classification"],
        )
        db.add(riesgo)
        await db.flush()
        for rec in m.get("recommendations", []):
            db.add(models.Recomendacion(
                riesgo_id=riesgo.id,
                texto=f"[{rec['priority']}] {rec['action']} ({rec['reason']})",
            ))

    await db.commit()


def _cloned_repo_dir(git: GitAnalyzer) -> str:
    """Carpeta real donde PyDriller deja el clon (clone_repo_to es la carpeta
    padre; PyDriller crea el la subcarpeta con el nombre del repo adentro)."""
    if git.is_local():
        return git._local_dir()
    if git.repo_path == git._get_default_path(git.repo_url):
        return os.path.join(git.repo_path, git._repo_name())
    return git.repo_path


# Un archivo con muy pocos commits tiene "bus factor 100 %" de forma trivial
# (un solo commit = un solo autor). Por debajo de este minimo se usa el valor
# del repositorio, que es mas representativo.
MIN_COMMITS_FILE_BUS_FACTOR = 3


def _git_metrics_for_file(git: GitAnalyzer, file_path: str, bus_factor_risk: float) -> dict:
    churn = git.calculate_code_churn(file_path)
    ok = "error" not in churn
    commits = churn.get("total_changes", 0) if ok else 0

    # Bus factor POR ARCHIVO (concentracion de commits en su autor principal).
    file_bf = git.calculate_file_bus_factor(file_path)
    file_risk = file_bf.get("risk_percentage")
    if file_risk is None or file_bf.get("commits", 0) < MIN_COMMITS_FILE_BUS_FACTOR:
        file_risk = bus_factor_risk  # historial insuficiente: valor del repositorio

    return {
        "total_commits": commits,
        "total_churn": churn.get("total_churn", 0) if ok else 0,
        "lines_added": churn.get("additions", 0) if ok else 0,
        "lines_deleted": churn.get("deletions", 0) if ok else 0,
        "risk_percentage": file_risk,
        "top_author": file_bf.get("top_author"),
        "file_commits": file_bf.get("commits", 0),
    }


# Caché del análisis completo: el frontend pide /repository y /priority a la vez,
# y ambos necesitan exactamente los mismos módulos. Se reutiliza mientras el HEAD
# del repositorio no cambie; el lock evita calcularlo dos veces en paralelo.
_ANALYSIS_CACHE: dict[tuple, tuple[str, list[dict], GitAnalyzer, int]] = {}
_ANALYSIS_LOCKS: dict[tuple, threading.Lock] = {}
_ANALYSIS_GUARD = threading.Lock()


def _analyze_all_modules(repo_url: str, repo_path: str | None) -> tuple[list[dict], GitAnalyzer, int]:
    key = (repo_url, repo_path)
    with _ANALYSIS_GUARD:
        lock = _ANALYSIS_LOCKS.setdefault(key, threading.Lock())
    with lock:
        git = GitAnalyzer(repo_url, repo_path)
        cached = _ANALYSIS_CACHE.get(key)
        if cached is not None:
            try:
                if git.head_sha() == cached[0]:
                    return list(cached[1]), cached[2], cached[3]
            except Exception:
                pass  # clon inaccesible: se recalcula y se informa el error real
        modules, git, total = _analyze_uncached(repo_url, repo_path)
        try:
            _ANALYSIS_CACHE[key] = (git.head_sha(), modules, git, total)
        except Exception:
            pass
        return list(modules), git, total


# Limita cuantos analisis pesados (clonado + lectura de historial) corren a la vez,
# para que varias solicitudes simultaneas no agoten CPU, memoria ni disco.
_ANALYSIS_SLOTS = threading.BoundedSemaphore(get_settings().max_parallel_analyses)


def _analyze_uncached(repo_url: str, repo_path: str | None) -> tuple[list[dict], GitAnalyzer, int]:
    with _ANALYSIS_SLOTS:
        return _analyze_uncached_unlimited(repo_url, repo_path)


def _analyze_uncached_unlimited(repo_url: str, repo_path: str | None) -> tuple[list[dict], GitAnalyzer, int]:
    git = GitAnalyzer(repo_url, repo_path)
    cloned_dir = _cloned_repo_dir(git)

    # calculate_bus_factor() es lo que dispara el clonado real (via PyDriller).
    # Debe ejecutarse ANTES de leer el directorio con MetricsCalculator,
    # o la carpeta todavia estara vacia. De paso, nos da el total de commits
    # del repositorio (requisito de historial minimo).
    bus_factor = git.calculate_bus_factor()
    if "error" in bus_factor and not os.path.isdir(cloned_dir):
        # El clonado fallo (repo privado, inexistente...): se informa el motivo real.
        raise HTTPException(status_code=400, detail=bus_factor["error"])
    bus_factor_risk = bus_factor.get("risk_percentage", 0) if "error" not in bus_factor else 0
    repo_total_commits = bus_factor.get("total_commits", 0) if "error" not in bus_factor else 0

    code_result = MetricsCalculator().analyze_repository(cloned_dir)
    if "error" in code_result:
        raise HTTPException(status_code=400, detail=code_result.get("message", code_result["error"]))

    modules = []
    for file_metrics in code_result.get("files", []):
        file_path = file_metrics.get("file")
        if not file_path:
            continue
        git_metrics = _git_metrics_for_file(git, file_path, bus_factor_risk)
        modules.append(_risk_detector.analyze_module(file_path, file_metrics, git_metrics))

    return modules, git, repo_total_commits


@router.post("/repository")
async def risk_repository(payload: RiskRepositoryRequest, db: AsyncSession = Depends(get_db)):
    # El análisis es síncrono y pesado: va a un hilo para no bloquear el event loop.
    modules, git, repo_total_commits = await run_in_threadpool(_analyze_all_modules, payload.repo_url, payload.repo_path)
    repo_analysis = _risk_detector.analyze_repository(modules)
    if "error" in repo_analysis:
        raise HTTPException(status_code=400, detail=repo_analysis["message"])

    try:
        await _persist_analysis(db, payload.repo_url, _cloned_repo_dir(git), modules)
    except Exception:
        # No queremos que un fallo al guardar en PostgreSQL tumbe la
        # respuesta del analisis, que ya se calculo correctamente.
        await db.rollback()

    summary = repo_analysis["summary"]
    total = summary["total_modules"]
    high = summary["high_risk_count"]
    medium = summary["medium_risk_count"]
    low = summary["low_risk_count"]
    total_deficiencies = sum(len(m.get("code_metrics", {}).get("deficiencies", [])) for m in modules)

    # Para la tabla, usamos los modulos completos (no la version recortada de
    # repo_analysis) para poder mostrar CC, churn, bus factor y justificacion reales.
    risky = [
        m for m in modules
        if m["risk_analysis"]["classification"] in ("HIGH", "MEDIUM")
    ]
    risky.sort(key=lambda m: m["risk_analysis"]["risk_score"], reverse=True)
    top_risk_modules = [
        {
            "file_path": m["file"],
            "risk_score": m["risk_analysis"]["risk_score"],
            "classification": m["risk_analysis"]["classification"],
            "deficiency_count": len(m["code_metrics"].get("deficiencies", [])),
            "cyclomatic_complexity": m["code_metrics"].get("cyclomatic_complexity", 0),
            "churn_commits": m["git_metrics"].get("commits", 0),
            "modification_frequency": m["git_metrics"].get("modification_frequency", 0),
            "code_churn_lines": m["git_metrics"].get("code_churn", 0),
            "cognitive_complexity": m["code_metrics"].get("cognitive_complexity"),
            "bus_factor_risk": m["git_metrics"].get("bus_factor_risk", 0),
            "justification": m["risk_analysis"].get("justification", ""),
            "recommended_action": _risk_detector._recommend_action(m["risk_analysis"]["classification"]),
            "recommended_actions": [r["action"] for r in m.get("recommendations", [])],
            "recommendations": m.get("recommendations", []),
        }
        for m in risky[:10]
    ]

    return {
        "average_risk_score": summary["average_risk_score"],
        "total_modules": total,
        "total_deficiencies": total_deficiencies,
        "high_risk_modules": high,
        "high_risk_percentage": round(high / total * 100, 2) if total else 0,
        "medium_risk_percentage": round(medium / total * 100, 2) if total else 0,
        "low_risk_percentage": round(low / total * 100, 2) if total else 0,
        "metrics": repo_analysis["average_component_scores"],
        "top_risk_modules": top_risk_modules,
        "repository_total_commits": repo_total_commits,
        "meets_minimum_history": repo_total_commits >= MIN_COMMITS_REQUIRED,
        "minimum_commits_required": MIN_COMMITS_REQUIRED,
    }


@router.post("/module")
def risk_module(payload: RiskModuleRequest):
    git = GitAnalyzer(payload.repo_url, payload.repo_path)
    cloned_dir = _cloned_repo_dir(git)

    # Igual que en _analyze_all_modules: forzar el clonado antes de leer el archivo.
    bus_factor = git.calculate_bus_factor()
    bus_factor_risk = bus_factor.get("risk_percentage", 0) if "error" not in bus_factor else 0
    repo_total_commits = bus_factor.get("total_commits", 0) if "error" not in bus_factor else 0

    try:
        full_path = security.safe_join(cloned_dir, payload.file_path)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    code_metrics = MetricsCalculator().analyze_file(full_path)
    if "error" in code_metrics:
        raise HTTPException(status_code=400, detail=code_metrics.get("message", code_metrics["error"]))
    git_metrics = _git_metrics_for_file(git, payload.file_path, bus_factor_risk)

    module = _risk_detector.analyze_module(payload.file_path, code_metrics, git_metrics)
    risk = module["risk_analysis"]
    code = module["code_metrics"]
    git_m = module["git_metrics"]

    return {
        "file_path": module["file"],
        "risk_score": risk["risk_score"],
        "classification": risk["classification"],
        "component_scores": risk["component_scores"],
        "component_assessments": risk.get("component_assessments", {}),
        "justification": risk.get("justification", ""),
        "difficulty_rating": risk.get("difficulty_rating", ""),
        "maintenance_difficulty_index": risk.get("maintenance_difficulty_index", 0),
        "recommended_action": _risk_detector._recommend_action(risk["classification"]),
        "recommended_actions": [r["action"] for r in module.get("recommendations", [])],
        "recommendations": module.get("recommendations", []),
        "loc": code["lines_of_code"],
        "complexity": code["cyclomatic_complexity"],
        "cognitive_complexity": code.get("cognitive_complexity"),
        "num_functions": code["functions_count"],
        "deficiency_count": len(code["deficiencies"]),
        "deficiencies": [
            {
                "type": d.get("type"),
                "function": d.get("function"),
                "description": (
                    f"Funcion '{d.get('function')}': valor {d.get('value')}"
                    if d.get("function")
                    else str(d.get("value", ""))
                ),
                "severity": d.get("severity"),
            }
            for d in code["deficiencies"]
        ],
        "git_metrics": {
            "commits": git_m["commits"],
            "churn": git_m["code_churn"],
            "churn_lines": git_m["code_churn"],
            "modification_frequency": git_m["commits"],
            "lines_added": git_m.get("lines_added", 0),
            "lines_deleted": git_m.get("lines_deleted", 0),
            "bus_factor": git_m["bus_factor_risk"],
            # GitAnalyzer no calcula antiguedad de archivo todavia.
            "file_age_days": 0,
        },
        "repository_total_commits": repo_total_commits,
        "meets_minimum_history": repo_total_commits >= MIN_COMMITS_REQUIRED,
        "minimum_commits_required": MIN_COMMITS_REQUIRED,
        "functions_risk": [
            {
                "function": fr["function"],
                "risk_score": fr["risk_analysis"]["risk_score"],
                "classification": fr["risk_analysis"]["classification"],
                "cyclomatic_complexity": fr["cyclomatic_complexity"],
                "lines_of_code": fr["lines_of_code"],
                "justification": fr["risk_analysis"].get("justification", ""),
                "recommended_action": _risk_detector._recommend_action(fr["risk_analysis"]["classification"]),
                "approximation_note": fr.get("approximation_note", ""),
            }
            for fr in module.get("functions_risk", [])
        ],
    }


@router.post("/priority")
def risk_priority(payload: RiskRepositoryRequest):
    modules, _, _ = _analyze_all_modules(payload.repo_url, payload.repo_path)
    repo_analysis = _risk_detector.analyze_repository(modules)
    if "error" in repo_analysis:
        raise HTTPException(status_code=400, detail=repo_analysis["message"])

    priority = _risk_detector.generate_priority_list(repo_analysis, payload.limit)
    recs_by_file = {m["file"]: m.get("recommendations", []) for m in modules}

    return {
        "modules": [
            {
                "file_path": p["file"],
                "risk_score": p["risk_score"],
                "classification": p["classification"],
                "deficiency_count": p["deficiencies_count"],
                "recommended_actions": [r["action"] for r in recs_by_file.get(p["file"], [])] or [p["action"]],
                "recommendations": recs_by_file.get(p["file"], []),
            }
            for p in priority
        ]
    }


@router.get("/repositories")
async def risk_repositories(db: AsyncSession = Depends(get_db)):
    """Historial de analisis: un registro por cada vez que se analizo un
    repositorio (request b de la encuesta: historial de repositorios)."""
    result = await db.execute(
        select(models.Repositorio).order_by(models.Repositorio.fecha_analisis.desc())
    )
    repos = result.scalars().all()

    # Una sola consulta agregada para todos los repositorios (antes eran 2 por repo).
    agg = await db.execute(
        select(
            models.Modulo.repositorio_id,
            func.count(models.Riesgo.id),
            func.coalesce(func.avg(models.Riesgo.puntaje), 0.0),
            func.coalesce(func.sum(case((models.Riesgo.clasificacion == "HIGH", 1), else_=0)), 0),
            func.coalesce(func.sum(case((models.Riesgo.clasificacion == "MEDIUM", 1), else_=0)), 0),
        )
        .join(models.Riesgo, models.Riesgo.modulo_id == models.Modulo.id)
        .group_by(models.Modulo.repositorio_id)
    )
    stats = {row[0]: row[1:] for row in agg.all()}

    history = []
    for repo in repos:
        total_modulos, avg, high_count, medium_count = stats.get(repo.id, (0, 0.0, 0, 0))
        avg_score = round(float(avg), 2)
        avg_classification = (
            "HIGH" if avg_score >= 70 else "MEDIUM" if avg_score >= 40 else "LOW"
        )
        history.append(
            {
                "id": repo.id,
                "nombre": repo.nombre,
                "url_remota": repo.url_remota,
                "fecha_analisis": repo.fecha_analisis.isoformat(),
                "total_modulos": total_modulos,
                "average_risk_score": avg_score,
                "classification": avg_classification,
                "high_risk_modules": int(high_count),
                "medium_risk_modules": int(medium_count),
            }
        )

    return {"history": history}


@router.get("/history")
async def risk_history(repo_url: str, limit: int = Query(30, ge=1, le=365), db: AsyncSession = Depends(get_db)):
    try:
        repo_url = security.validate_repo_url(repo_url)  # misma forma con la que se guardó
    except ValueError:
        pass  # no es una URL válida: simplemente no habrá historial
    """Evolución en el tiempo: un punto por cada análisis guardado del repositorio,
    con promedios de sus métricas (alimenta la pantalla Análisis)."""
    limit = max(1, min(limit, 200))
    rows = await db.execute(
        select(
            models.Repositorio.id,
            models.Repositorio.fecha_analisis,
            func.count(models.Modulo.id),
            func.avg(models.Riesgo.puntaje),
            func.avg(models.Metrica.complejidad_ciclomatica),
            func.avg(models.Metrica.codigo_duplicado_pct),
            func.avg(models.Metrica.loc),
            func.avg(models.Metrica.code_churn),
        )
        .join(models.Modulo, models.Modulo.repositorio_id == models.Repositorio.id)
        .join(models.Riesgo, models.Riesgo.modulo_id == models.Modulo.id)
        .join(models.Metrica, models.Metrica.modulo_id == models.Modulo.id)
        .where(models.Repositorio.url_remota == repo_url)
        .group_by(models.Repositorio.id, models.Repositorio.fecha_analisis)
        .order_by(models.Repositorio.fecha_analisis.desc())
        .limit(limit)
    )
    r2 = lambda v: round(float(v or 0), 2)  # noqa: E731
    points = [
        {
            "id": r[0], "fecha_analisis": r[1].isoformat(), "total_modulos": r[2],
            "average_risk_score": r2(r[3]), "average_complexity": r2(r[4]),
            "average_duplication": r2(r[5]), "average_loc": r2(r[6]), "average_churn": r2(r[7]),
        }
        for r in reversed(rows.all())
    ]
    return {"repo_url": repo_url, "history": points}


@router.get("/stats")
async def risk_stats(db: AsyncSession = Depends(get_db)):
    """Cuantos repositorios distintos se han analizado (para el badge del menu)."""
    result = await db.execute(select(func.count(func.distinct(models.Repositorio.url_remota))))
    count = result.scalar() or 0
    return {"repos_analyzed": count}
