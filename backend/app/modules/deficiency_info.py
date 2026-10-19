"""Descripcion legible de las deficiencias que detecta MetricsCalculator (para la interfaz y los reportes)."""
from typing import Any

from app.modules.metrics_calculator import MetricsCalculator

T = MetricsCalculator.THRESHOLDS

# tipo -> (nombre, explicacion con el valor, consejo)
_INFO = {
    "CRITICAL_COMPLEXITY": (
        "Complejidad crítica",
        "Complejidad ciclomática {v}; lo recomendado es hasta " + str(T["cyclomatic_complexity_high"]) + " y por encima de " + str(T["cyclomatic_complexity_critical"]) + " es crítico.",
        "Divide la función en funciones más pequeñas, una por decisión.",
    ),
    "HIGH_COMPLEXITY": (
        "Complejidad alta",
        "Complejidad ciclomática {v}; lo recomendado es hasta " + str(T["cyclomatic_complexity_high"]) + ".",
        "Simplifica las condiciones y extrae las ramas a funciones auxiliares.",
    ),
    "HIGH_COGNITIVE_COMPLEXITY": (
        "Complejidad cognitiva alta",
        "Complejidad cognitiva {v}; el umbral es " + str(T["cognitive_complexity_high"]) + ". Cuesta entender el flujo.",
        "Reduce el anidamiento: usa retornos tempranos y evita condiciones encadenadas.",
    ),
    "LONG_METHOD": (
        "Función muy larga",
        "{v} líneas; lo recomendado es menos de " + str(T["loc_long_method"]) + ".",
        "Extrae bloques en funciones con un solo propósito.",
    ),
    "TOO_MANY_PARAMETERS": (
        "Demasiados parámetros",
        "{v} parámetros; lo recomendado es " + str(T["parameters_too_many"]) + " o menos.",
        "Agrupa los parámetros relacionados en un objeto o estructura.",
    ),
}


def describe_deficiencies(deficiencies: list[dict[str, Any]]) -> list[dict[str, Any]]:
    out = []
    for d in deficiencies or []:
        label, detail, advice = _INFO.get(d.get("type"), (str(d.get("type")), "Valor {v}.", ""))
        out.append({
            "type": d.get("type"),
            "label": label,
            "function": d.get("function"),
            "severity": d.get("severity"),
            "value": d.get("value"),
            "detail": detail.format(v=d.get("value")),
            "advice": advice,
        })
    order = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2}
    out.sort(key=lambda x: order.get(x["severity"], 3))
    return out
