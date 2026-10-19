"""Radon como herramienta de contraste adicional (solo archivos Python). Corre dentro del backend."""
import os

from radon.complexity import cc_visit
from radon.metrics import mi_visit
from radon.raw import analyze as raw_analyze
from scipy import stats


MIN_PAIRS = 5

# (nombre, metrica propia, metrica de Radon)
COMPARISONS = [
    ("Complejidad ciclomática", "cyclomatic_complexity", "complexity"),
    ("Líneas de código", "lines_of_code", "sloc"),
]


def radon_metrics(source: str) -> dict | None:
    """Metricas de Radon para un texto Python. None si no se puede parsear."""
    try:
        blocks = cc_visit(source)
        raw = raw_analyze(source)
        return {
            "complexity": sum(b.complexity for b in blocks),
            "sloc": raw.sloc,
            "maintainability": round(mi_visit(source, multi=True), 2),
        }
    except Exception:
        return None


def resolve_path(file: str, bases: list[str]) -> str | None:
    """Ruta real de un modulo: puede venir absoluta o relativa a la carpeta del clon (o a su padre)."""
    for base in [""] + bases:
        cand = os.path.join(base, file) if base else file
        if os.path.isfile(cand):
            return os.path.abspath(cand)
    return None


def compare_with_radon(modules: list[dict], bases: list[str] | None = None) -> tuple[list[dict], int]:
    """Devuelve (acuerdos por metrica, archivos Python comparados)."""
    pairs = []
    for m in modules:
        path = resolve_path(m.get("file", ""), bases or [])
        if path is None or not path.endswith(".py"):
            continue
        try:
            with open(path, encoding="utf-8", errors="replace") as fh:
                rm = radon_metrics(fh.read())
        except OSError:
            continue
        if rm is not None:
            pairs.append((m, rm))

    results = []
    for label, own_key, radon_key in COMPARISONS:
        xs = [float(m["code_metrics"].get(own_key, 0) or 0) for m, _ in pairs]
        ys = [float(r[radon_key]) for _, r in pairs]
        item = {"metric": label, "n": len(xs), "rho": None, "p_value": None, "note": None}
        if len(xs) < MIN_PAIRS:
            item["note"] = "Muestra insuficiente para correlacionar."
        elif len(set(xs)) < 2 or len(set(ys)) < 2:
            item["note"] = "Una de las series es constante; no se calcula la correlación."
        else:
            rho, p = stats.spearmanr(xs, ys)
            item["rho"], item["p_value"] = round(float(rho), 4), round(float(p), 6)
        results.append(item)
    return results, len(pairs)
