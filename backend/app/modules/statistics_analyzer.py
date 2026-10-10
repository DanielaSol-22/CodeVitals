"""
Validación estadística de las métricas de CodeVitals.

Implementa las pruebas definidas en la metodología de la tesis:
  - Estadísticos descriptivos (media, mediana, desviación estándar, mín/máx)
  - Correlación de Spearman entre cada métrica y el puntaje de riesgo
  - Prueba Chi-cuadrado de independencia entre la clasificación de riesgo
    (LOW/MEDIUM/HIGH) y cada métrica categorizada en terciles (bajo/medio/alto)

Todas las funciones son puras (no tocan la base de datos ni Git) para que
puedan probarse de forma aislada.
"""
from __future__ import annotations

import math
from typing import Any

import numpy as np
from scipy import stats

ALPHA_DEFAULT = 0.05
MIN_SAMPLE = 5  # mínimo de módulos para que las pruebas tengan sentido

# Métrica -> (etiqueta legible, función que la extrae de un módulo analizado)
METRICS: dict[str, tuple[str, Any]] = {
    "cyclomatic_complexity": (
        "Complejidad ciclomática",
        lambda m: m["code_metrics"].get("cyclomatic_complexity", 0),
    ),
    "lines_of_code": (
        "Líneas de código (LOC)",
        lambda m: m["code_metrics"].get("lines_of_code", 0),
    ),
    "code_churn": (
        "Code churn (commits)",
        lambda m: m["git_metrics"].get("commits", 0),
    ),
    "code_duplication": (
        "Duplicación de código (puntaje)",
        lambda m: m["risk_analysis"].get("component_scores", {}).get("code_duplication", 0),
    ),
    "bus_factor": (
        "Bus factor (riesgo %)",
        lambda m: m["git_metrics"].get("bus_factor_risk", 0),
    ),
}


def _clean(values) -> np.ndarray:
    arr = np.asarray(values, dtype=float)
    return arr[np.isfinite(arr)]


def descriptive(values) -> dict[str, float | int]:
    arr = _clean(values)
    if arr.size == 0:
        return {"n": 0, "mean": 0.0, "median": 0.0, "std": 0.0, "min": 0.0, "max": 0.0}
    return {
        "n": int(arr.size),
        "mean": round(float(arr.mean()), 4),
        "median": round(float(np.median(arr)), 4),
        "std": round(float(arr.std(ddof=1)) if arr.size > 1 else 0.0, 4),
        "min": round(float(arr.min()), 4),
        "max": round(float(arr.max()), 4),
    }


def _strength(rho: float) -> str:
    a = abs(rho)
    if a < 0.1:
        return "nula"
    if a < 0.3:
        return "débil"
    if a < 0.5:
        return "moderada"
    if a < 0.7:
        return "fuerte"
    return "muy fuerte"


def spearman(x, y, alpha: float = ALPHA_DEFAULT) -> dict[str, Any]:
    """Correlación de rangos de Spearman entre x e y."""
    xa = np.asarray(x, dtype=float)
    ya = np.asarray(y, dtype=float)
    mask = np.isfinite(xa) & np.isfinite(ya)
    xa, ya = xa[mask], ya[mask]
    n = int(xa.size)

    base = {"test": "spearman", "n": n, "alpha": alpha}
    if n < MIN_SAMPLE:
        return {**base, "rho": None, "p_value": None, "significant": False,
                "interpretation": f"Muestra insuficiente (n={n}, mínimo {MIN_SAMPLE})."}
    if np.ptp(xa) == 0 or np.ptp(ya) == 0:
        return {**base, "rho": None, "p_value": None, "significant": False,
                "interpretation": "Variable constante: no se puede calcular la correlación."}

    res = stats.spearmanr(xa, ya)
    rho, p = float(res.statistic), float(res.pvalue)
    if math.isnan(rho):
        return {**base, "rho": None, "p_value": None, "significant": False,
                "interpretation": "No se pudo calcular la correlación."}
    significant = p < alpha
    direction = "positiva" if rho > 0 else "negativa"
    if significant:
        interp = f"Correlación {direction} {_strength(rho)} estadísticamente significativa (p < {alpha})."
    else:
        interp = f"Correlación {_strength(rho)} no significativa (p ≥ {alpha}); no se puede afirmar relación."
    return {**base, "rho": round(rho, 4), "p_value": round(p, 6),
            "significant": significant, "interpretation": interp}


def _terciles(values: np.ndarray) -> np.ndarray:
    """Asigna 0/1/2 (bajo/medio/alto) por terciles usando rangos, lo que
    reparte bien los empates (muchas métricas tienen valores repetidos)."""
    ranks = stats.rankdata(values, method="average")
    q = (ranks - 0.5) / len(values)
    return np.digitize(q, [1 / 3, 2 / 3])


def chi_square(metric_values, classifications, alpha: float = ALPHA_DEFAULT) -> dict[str, Any]:
    """Chi-cuadrado de independencia: clasificación de riesgo × métrica en terciles."""
    xa = np.asarray(metric_values, dtype=float)
    cls = np.asarray(classifications, dtype=object)
    mask = np.isfinite(xa)
    xa, cls = xa[mask], cls[mask]
    n = int(xa.size)
    base = {"test": "chi_square", "n": n, "alpha": alpha}

    if n < MIN_SAMPLE:
        return {**base, "chi2": None, "p_value": None, "dof": None, "cramers_v": None,
                "significant": False, "low_expected_warning": False,
                "interpretation": f"Muestra insuficiente (n={n}, mínimo {MIN_SAMPLE})."}
    if np.ptp(xa) == 0:
        return {**base, "chi2": None, "p_value": None, "dof": None, "cramers_v": None,
                "significant": False, "low_expected_warning": False,
                "interpretation": "Variable constante: no se puede construir la tabla de contingencia."}

    bins = _terciles(xa)
    rows = sorted(set(cls.tolist()))
    table = np.array([[int(np.sum((cls == r) & (bins == b))) for b in (0, 1, 2)] for r in rows])
    table = table[table.sum(axis=1) > 0][:, table.sum(axis=0) > 0]
    if table.shape[0] < 2 or table.shape[1] < 2:
        return {**base, "chi2": None, "p_value": None, "dof": None, "cramers_v": None,
                "significant": False, "low_expected_warning": False,
                "interpretation": "La tabla de contingencia no tiene al menos 2 filas y 2 columnas "
                                  "(por ejemplo, todos los módulos tienen la misma clasificación)."}

    chi2, p, dof, expected = stats.chi2_contingency(table)
    k = min(table.shape) - 1
    v = math.sqrt(chi2 / (table.sum() * k)) if k > 0 else 0.0
    low_exp = bool((expected < 5).any())
    significant = bool(p < alpha)
    interp = (
        f"Existe asociación significativa entre la clasificación de riesgo y la métrica (p < {alpha}), "
        f"V de Cramér = {v:.2f}."
        if significant else
        f"No se encontró asociación significativa (p ≥ {alpha}); V de Cramér = {v:.2f}."
    )
    if low_exp:
        interp += " Aviso: hay frecuencias esperadas menores a 5, interpretar con cautela."
    return {**base, "chi2": round(float(chi2), 4), "p_value": round(float(p), 6), "dof": int(dof),
            "cramers_v": round(float(v), 4), "significant": significant,
            "low_expected_warning": low_exp, "interpretation": interp}


def analyze_modules(modules: list[dict], alpha: float = ALPHA_DEFAULT) -> dict[str, Any]:
    """Ejecuta toda la validación sobre la lista de módulos analizados
    (la misma estructura que devuelve RiskDetector.analyze_module)."""
    scores = [m["risk_analysis"]["risk_score"] for m in modules]
    classes = [m["risk_analysis"]["classification"] for m in modules]

    descriptives = {"risk_score": {"label": "Puntaje de riesgo", **descriptive(scores)}}
    correlations, chi_squares = [], []

    for key, (label, getter) in METRICS.items():
        values = [getter(m) for m in modules]
        descriptives[key] = {"label": label, **descriptive(values)}
        correlations.append({"variable": key, "label": label, **spearman(values, scores, alpha)})
        chi_squares.append({"variable": key, "label": label, **chi_square(values, classes, alpha)})

    n = len(modules)
    return {
        "n_modules": n,
        "alpha": alpha,
        "sufficient_sample": n >= MIN_SAMPLE,
        "descriptives": descriptives,
        "spearman": correlations,
        "chi_square": chi_squares,
        "note": (
            "Spearman correlaciona cada métrica con el puntaje de riesgo (que a su vez se calcula "
            "con estas métricas), por lo que una correlación alta es esperable; se reporta para "
            "documentar la contribución de cada métrica."
        ),
    }
