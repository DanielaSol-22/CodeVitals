"""
Opción B — Endpoints de métricas de código (Lizard).
  POST /api/v1/metrics/repository
  POST /api/v1/metrics/file
  POST /api/v1/metrics/summary
"""
from fastapi import APIRouter, HTTPException

from app.modules.metrics_calculator import MetricsCalculator
from app.schemas import FileRequest, RepoMetricsRequest, SummaryRequest

router = APIRouter(prefix="/api/v1/metrics", tags=["Code Metrics (Opción B)"])

_calculator = MetricsCalculator()


@router.post("/repository")
def analyze_repository_metrics(payload: RepoMetricsRequest):
    result = _calculator.analyze_repository(payload.repo_path)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result.get("message", result["error"]))
    return {"success": True, "data": result}


@router.post("/file")
def analyze_file_metrics(payload: FileRequest):
    result = _calculator.analyze_file(payload.file_path)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result.get("message", result["error"]))
    return {"success": True, "data": result}


@router.post("/summary")
def repository_summary(payload: SummaryRequest):
    data = _calculator.analyze_repository(payload.repo_path)
    if "error" in data:
        raise HTTPException(status_code=400, detail=data.get("message", data["error"]))

    files = data.get("files", [])
    total_files = len(files)
    total_deficiencies = sum(len(f.get("deficiencies", [])) for f in files)
    deficiency_pct = round((total_deficiencies / total_files) * 100, 2) if total_files else 0.0

    if deficiency_pct < 10:
        overall_quality = "EXCELENTE"
    elif deficiency_pct < 25:
        overall_quality = "BUENO"
    elif deficiency_pct < 50:
        overall_quality = "REGULAR"
    else:
        overall_quality = "DEFICIENTE"

    warnings = [
        f"{f.get('file')}: {len(f.get('deficiencies', []))} deficiencia(s) detectada(s)"
        for f in files
        if f.get("deficiencies")
    ]
    recommendations = []
    if deficiency_pct >= 25:
        recommendations.append("Priorizar refactorización de los módulos con mayor complejidad ciclomática.")
    if deficiency_pct >= 10:
        recommendations.append("Incrementar la cobertura de pruebas unitarias en los módulos señalados.")
    if not recommendations:
        recommendations.append("Mantener las prácticas actuales de desarrollo.")

    return {
        "success": True,
        "data": {
            "repo_path": payload.repo_path,
            "overall_quality": overall_quality,
            "total_deficiencies": total_deficiencies,
            "deficiency_percentage": deficiency_pct,
            "warnings": warnings,
            "recommendations": recommendations,
        },
    }
