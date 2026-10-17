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

from app.modules.risk_detector import RiskDetector

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
        "Frecuencia de modificaciones (commits)",
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
    # Metricas medidas que NO forman parte de la formula del puntaje: su relacion con el
    # puntaje no es circular, por lo que aportan evidencia independiente de validez.
    "cognitive_complexity": (
        "Complejidad cognitiva",
        lambda m: m["code_metrics"].get("cognitive_complexity"),
    ),
    "churn_lines": (
        "Code churn (líneas agregadas y eliminadas)",
        lambda m: m["git_metrics"].get("code_churn", 0),
    ),
}

# Metricas que componen la formula del puntaje (las demas se reportan como complementarias).
IN_FORMULA = {"cyclomatic_complexity", "lines_of_code", "code_churn", "code_duplication", "bus_factor"}


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


MIN_COMMITS_EXTERNAL = 5  # un módulo con pocos commits no permite estimar su proporción de correcciones


def external_validity(modules: list[dict], alpha: float = ALPHA_DEFAULT,
                      min_commits: int = MIN_COMMITS_EXTERNAL) -> dict[str, Any]:
    """Validez contra un criterio EXTERNO: la proporción de commits de corrección de errores.

    El puntaje se calcula con las métricas, así que correlacionarlo con ellas es parcialmente
    circular. En cambio, la proporción de commits "fix" de un archivo viene de otra fuente (el
    historial: lo que el equipo tuvo que corregir). Si los módulos de riesgo alto concentran
    más correcciones, el puntaje captura dificultades reales de mantenimiento.

    Se usa la PROPORCIÓN (fix_commits / commits) y no el conteo, porque el conteo crece con la
    frecuencia de modificaciones, que ya forma parte de la fórmula, y daría una correlación
    mecánica. Solo se consideran módulos con al menos `min_commits` commits.
    """
    eligible = [m for m in modules if m["git_metrics"].get("commits", 0) >= min_commits]
    base: dict[str, Any] = {
        "criterion": "Proporción de commits de corrección de errores (fix / commits del archivo)",
        "min_commits": min_commits,
        "n_total": len(modules),
        "n_eligible": len(eligible),
        "alpha": alpha,
    }
    if len(eligible) < MIN_SAMPLE:
        return {**base, "sufficient": False, "score": None, "by_metric": [], "by_class": [], "kruskal": None,
                "note": f"Muestra insuficiente: solo {len(eligible)} módulos tienen al menos {min_commits} commits."}

    ratio = [m["git_metrics"].get("fix_commits", 0) / m["git_metrics"]["commits"] for m in eligible]
    scores = [m["risk_analysis"]["risk_score"] for m in eligible]
    classes = [m["risk_analysis"]["classification"] for m in eligible]

    by_metric = []
    for key, (label, getter) in METRICS.items():
        by_metric.append({"variable": key, "label": label, "in_formula": key in IN_FORMULA,
                          **spearman([getter(m) for m in eligible], ratio, alpha)})

    by_class = []
    groups = []
    for cls in ("LOW", "MEDIUM", "HIGH"):
        vals = [r for r, c in zip(ratio, classes) if c == cls]
        if vals:
            by_class.append({"classification": cls, "n": len(vals),
                             "mean_ratio": round(float(np.mean(vals)), 4),
                             "median_ratio": round(float(np.median(vals)), 4)})
            if len(vals) >= 2:
                groups.append(vals)

    kruskal = None
    if len(groups) >= 2:
        try:
            h, p = stats.kruskal(*groups)
            kruskal = {"h": round(float(h), 4), "p_value": round(float(p), 6), "significant": bool(p < alpha)}
        except ValueError:  # todos los valores idénticos
            kruskal = None

    return {
        **base,
        "sufficient": True,
        "n_with_fixes": int(sum(1 for r in ratio if r > 0)),
        "score": spearman(scores, ratio, alpha),
        "by_metric": by_metric,
        "by_class": by_class,
        "kruskal": kruskal,
        "note": (
            "Los commits de corrección se detectan por palabras clave del mensaje (fix, bug, defect, crash, "
            "regression) y excluyen correcciones de texto (typo, docs, format). Es una aproximación: "
            "depende de la disciplina del equipo al escribir sus mensajes. El puntaje se calcula con el "
            "código actual y las correcciones son pasadas; una validación predictiva estricta compararía "
            "el puntaje en un momento con las correcciones posteriores."
        ),
    }


SENSITIVITY_DELTA = 0.2     # variación de cada peso: ±20 %
SENSITIVITY_RUNS = 1000     # simulaciones con todos los pesos variando a la vez
_CLASS_ORDER = ("LOW", "MEDIUM", "HIGH")


def weight_sensitivity(modules: list[dict], delta: float = SENSITIVITY_DELTA,
                       runs: int = SENSITIVITY_RUNS, seed: int = 42) -> dict[str, Any]:
    """Análisis de sensibilidad de los pesos de la fórmula.

    Responde "¿qué tan dependientes son los resultados de los pesos elegidos?". Se usan los
    puntajes por componente ya calculados y se recalcula el puntaje con pesos alterados:
      1. Un peso a la vez: se sube o baja `delta` (±20 %) y los demás se reescalan para que la
         suma siga siendo 1.
      2. Simulación: todos los pesos varían a la vez, cada uno al azar entre ±`delta`.
    Para cada escenario se reporta qué porcentaje de módulos cambia de clasificación y qué tanto
    se parece el nuevo orden de módulos al original (Spearman).
    """
    keys = list(RiskDetector.WEIGHTS)
    n = len(modules)
    base = {"delta": delta, "n_modules": n}
    if n < MIN_SAMPLE:
        return {**base, "sufficient": False, "scenarios": [], "monte_carlo": None, "most_sensitive": None}

    detector = RiskDetector()
    comps = np.array([[m["risk_analysis"]["component_scores"].get(k, 0) for k in keys] for m in modules], dtype=float)
    w0 = np.array([RiskDetector.WEIGHTS[k] for k in keys], dtype=float)

    def classify(scores: np.ndarray) -> np.ndarray:
        return np.array([detector._classify_risk(float(x)) for x in scores])

    w0 = w0 / w0.sum()
    s0 = comps @ w0
    c0 = classify(s0)

    def compare(w: np.ndarray) -> dict[str, float]:
        w = w / w.sum()  # el puntaje se normaliza por la suma de pesos
        s1 = comps @ w
        changed = float(np.mean(classify(s1) != c0) * 100)
        rho = 1.0 if np.ptp(s0) == 0 or np.ptp(s1) == 0 else float(stats.spearmanr(s0, s1).statistic)
        diff = np.abs(s1 - s0)
        return {"pct_changed": round(changed, 2), "rho": round(rho, 4),
                "mean_abs_diff": round(float(diff.mean()), 3), "max_abs_diff": round(float(diff.max()), 3)}

    scenarios = []
    for i, k in enumerate(keys):
        for sign, name in ((-1, "baja"), (1, "sube")):
            w = w0.copy()
            w[i] *= 1 + sign * delta
            scenarios.append({"weight": k, "label": METRICS[k][0] if k in METRICS else k,
                              "base_weight": float(w0[i]), "direction": name, **compare(w)})

    rng = np.random.default_rng(seed)
    sims = [compare(w0 * (1 + rng.uniform(-delta, delta, size=len(keys)))) for _ in range(runs)]
    changed = np.array([x["pct_changed"] for x in sims])
    monte_carlo = {
        "runs": runs,
        "median_pct_changed": round(float(np.median(changed)), 2),
        "p95_pct_changed": round(float(np.percentile(changed, 95)), 2),
        "worst_pct_changed": round(float(changed.max()), 2),
        "min_rho": round(float(min(x["rho"] for x in sims)), 4),
    }
    worst = max(scenarios, key=lambda x: x["pct_changed"])
    return {**base, "sufficient": True, "scenarios": scenarios, "monte_carlo": monte_carlo,
            "most_sensitive": {"label": worst["label"], "direction": worst["direction"], "pct_changed": worst["pct_changed"]}}


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
        in_formula = key in IN_FORMULA
        correlations.append({"variable": key, "label": label, "in_formula": in_formula, **spearman(values, scores, alpha)})
        chi_squares.append({"variable": key, "label": label, "in_formula": in_formula, **chi_square(values, classes, alpha)})

    n = len(modules)
    return {
        "n_modules": n,
        "alpha": alpha,
        "sufficient_sample": n >= MIN_SAMPLE,
        "descriptives": descriptives,
        "spearman": correlations,
        "chi_square": chi_squares,
        "external_validity": external_validity(modules, alpha),
        "weight_sensitivity": weight_sensitivity(modules),
        "note": (
            "Spearman correlaciona cada métrica con el puntaje de riesgo (que a su vez se calcula "
            "con estas métricas), por lo que una correlación alta es esperable; se reporta para "
            "documentar la contribución de cada métrica. La complejidad cognitiva y el churn en líneas "
            "no forman parte de la fórmula, por lo que su relación con el puntaje no es circular."
        ),
    }
