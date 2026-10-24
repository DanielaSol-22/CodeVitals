"""
Validación predictiva en el tiempo (no circular) del puntaje de riesgo.

Problema que resuelve: el puntaje se calcula con cinco métricas, así que correlacionarlo con esas
mismas métricas es circular. Aquí se evalúa algo distinto, que sí es una prueba del puntaje:

    ¿Los módulos que el puntaje marcaba como riesgosos ANTES de un momento dado acumulan más
    correcciones de errores DESPUÉS de ese momento?

Procedimiento por repositorio:
  1. Se ordena el historial y se elige un punto de corte (por defecto, el 70 % de los commits).
  2. Se reconstruye el repositorio tal como estaba en el corte (código y solo el historial
     anterior al corte) y se calcula el puntaje con la MISMA fórmula (RiskDetector).
  3. Se cuentan los commits de corrección que tocan cada archivo DESPUÉS del corte (resultado).
  4. Se mide qué tan bien el puntaje ordena los archivos según ese resultado y se compara contra
     líneas base simples (solo LOC, solo complejidad, solo frecuencia de cambios, historial de
     correcciones previo).

Como el resultado ocurre después del corte y el puntaje solo usa información anterior, no hay
circularidad ni fuga de información. La fórmula y sus pesos NO se modifican.

Las funciones de estadística son puras; solo `temporal_validation` toca Git y el disco.
"""
from __future__ import annotations

import io
import os
import subprocess
import tarfile
import tempfile
from collections import defaultdict
from typing import Any

import numpy as np
from scipy import stats

from app.modules.git_analyzer import is_fix_commit, resolve_identities
from app.modules.metrics_calculator import MetricsCalculator
from app.modules.risk_detector import RiskDetector
from app.modules.statistics_analyzer import ALPHA_DEFAULT, spearman

CUTOFF_DEFAULT = 0.70        # fracción de commits que forma el "pasado"
TOP_FRACTION = 0.20          # se evalúa a los archivos del 20 % superior de cada predictor
MIN_FILE_COMMITS_BUS = 3     # igual que el análisis normal: con menos commits se usa el valor del repo
MIN_FUTURE_FIXES = 10        # mínimo de correcciones futuras en el repositorio para que la prueba tenga sentido
BOOTSTRAP_RUNS = 1000
_SKIP_DIRS = {".git", "__pycache__", "node_modules", ".venv", "venv", "dist", "build", ".pytest_cache", ".env"}


# --------------------------------------------------------------------------- Git

def _git(repo: str, *args: str) -> str:
    return subprocess.run(
        ["git", "-c", "core.quotepath=false", *args], cwd=repo, check=True,
        capture_output=True, text=True, encoding="utf-8", errors="replace",
        env={**os.environ, "GIT_TERMINAL_PROMPT": "0"},
    ).stdout


def _supported(path: str) -> bool:
    parts = path.replace("\\", "/").split("/")
    if any(p in _SKIP_DIRS for p in parts[:-1]):
        return False
    return os.path.splitext(path)[1] in MetricsCalculator.SUPPORTED_EXTENSIONS


def parse_log(out: str) -> list[dict]:
    """Interpreta `git log --name-status --format=@@\\x1f%H\\x1f%an\\x1f%ae\\x1f%s`.
    Devuelve los commits en el orden del log, cada uno con su lista de cambios."""
    commits: list[dict] = []
    cur: dict | None = None
    for line in out.splitlines():
        if line.startswith("@@\x1f"):
            _, sha, name, email, subject = (line.split("\x1f", 4) + ["", "", "", "", ""])[:5]
            cur = {"sha": sha, "name": name, "email": email, "subject": subject, "changes": []}
            commits.append(cur)
            continue
        if cur is None or not line.strip():
            continue
        parts = line.split("\t")
        status = parts[0][:1]
        if status in ("R", "C") and len(parts) >= 3:
            cur["changes"].append((status, parts[1], parts[2]))
        elif len(parts) >= 2:
            cur["changes"].append((status, None, parts[1]))
    return commits


_LOG_FORMAT = "--format=@@%x1f%H%x1f%an%x1f%ae%x1f%s"


def split_history(repo: str, ratio: float = CUTOFF_DEFAULT) -> dict[str, Any]:
    """Elige el commit de corte: el que deja `ratio` de los commits en el pasado."""
    shas = _git(repo, "rev-list", "--reverse", "HEAD").split()
    n = len(shas)
    k = max(1, min(n - 1, int(n * ratio))) if n > 1 else 1
    return {"total_commits": n, "past_commits": k, "future_commits": n - k, "cutoff_sha": shas[k - 1]}


def past_history(repo: str, cutoff_sha: str) -> dict[str, Any]:
    """Historial anterior al corte, por archivo (siguiendo renombres hacia la ruta que tiene en el corte)."""
    commits = parse_log(_git(repo, "log", "-M", "--name-status", _LOG_FORMAT, cutoff_sha))  # del más nuevo al más viejo
    identity = resolve_identities([(c["name"], c["email"]) for c in commits])
    canon: dict[str, str] = {}
    files: dict[str, dict] = {}
    author_commits: dict[str, int] = defaultdict(int)

    for c in commits:
        who = identity.get((c["name"], c["email"]), c["name"])
        author_commits[who] += 1
        fix = is_fix_commit(c["subject"])
        for status, old, new in c["changes"]:
            key = canon.get(new, new)
            if status in ("R", "C") and old and status == "R":
                canon[old] = key
            e = files.setdefault(key, {"commits": 0, "fixes": 0, "authors": defaultdict(int)})
            e["commits"] += 1
            e["fixes"] += 1 if fix else 0
            e["authors"][who] += 1
    total = sum(author_commits.values())
    top = max(author_commits.values()) if author_commits else 0
    return {"files": files, "repo_bus_factor": round(top / total * 100, 2) if total else 0.0, "commits": total}


def future_outcome(repo: str, cutoff_sha: str, tracked: set[str]) -> dict[str, dict]:
    """Commits (y correcciones) que tocan cada archivo `tracked` DESPUÉS del corte."""
    commits = parse_log(_git(repo, "log", "-M", "--reverse", "--name-status", _LOG_FORMAT, f"{cutoff_sha}..HEAD"))
    cur = {p: p for p in tracked}                       # nombre actual -> ruta que tenía en el corte
    out = {p: {"commits": 0, "fixes": 0} for p in tracked}
    for c in commits:
        fix = is_fix_commit(c["subject"])
        for status, old, new in c["changes"]:
            if status == "R" and old in cur:
                cur[new] = cur.pop(old)
            origin = cur.get(new)
            if origin is None:
                continue
            out[origin]["commits"] += 1
            out[origin]["fixes"] += 1 if fix else 0
    return out


def snapshot_metrics(repo: str, cutoff_sha: str) -> list[dict]:
    """Métricas de código de cada archivo tal como estaba en el corte (mismo MetricsCalculator
    que el análisis normal, incluida la duplicación calculada sobre todo el repositorio)."""
    tar_bytes = subprocess.run(["git", "archive", "--format=tar", cutoff_sha], cwd=repo, check=True,
                               capture_output=True).stdout
    with tempfile.TemporaryDirectory(prefix="cv_snapshot_") as tmp:
        with tarfile.open(fileobj=io.BytesIO(tar_bytes)) as tf:
            members = [m for m in tf.getmembers() if m.isfile() and _supported(m.name)]
            try:
                tf.extractall(tmp, members=members, filter="data")      # Python >= 3.12
            except TypeError:
                tf.extractall(tmp, members=members)
        result = MetricsCalculator().analyze_repository(tmp)
    return result.get("files", []) if "error" not in result else []


# ------------------------------------------------------------------ Estadística (puro)

def auc(scores, labels) -> float | None:
    """Área bajo la curva ROC (Mann-Whitney): probabilidad de que un archivo con corrección futura
    tenga un puntaje mayor que uno sin ella. 0.5 = azar, 1 = perfecto."""
    s = np.asarray(scores, dtype=float)
    y = np.asarray(labels, dtype=bool)
    n1, n0 = int(y.sum()), int((~y).sum())
    if n1 == 0 or n0 == 0:
        return None
    ranks = stats.rankdata(s)
    return float((ranks[y].sum() - n1 * (n1 + 1) / 2) / (n1 * n0))


def capture_at_top(scores, fixes, fraction: float = TOP_FRACTION, seed: int = 42) -> float | None:
    """Parte de TODAS las correcciones futuras que cae en el `fraction` superior según `scores`.
    El azar daría `fraction`. Los empates se rompen con un orden aleatorio fijo (reproducible)."""
    s = np.asarray(scores, dtype=float)
    f = np.asarray(fixes, dtype=float)
    total = f.sum()
    if len(s) == 0 or total == 0:
        return None
    rng = np.random.default_rng(seed)
    order = np.lexsort((rng.random(len(s)), -s))
    k = max(1, int(round(len(s) * fraction)))
    return float(f[order[:k]].sum() / total)


def _bootstrap_auc_diff(score, base, labels, runs: int = BOOTSTRAP_RUNS, seed: int = 42):
    """Intervalo de confianza 95 % de AUC(puntaje) - AUC(línea base), remuestreando archivos."""
    score, base, labels = np.asarray(score, float), np.asarray(base, float), np.asarray(labels, bool)
    rng = np.random.default_rng(seed)
    n = len(score)
    diffs = []
    for _ in range(runs):
        idx = rng.integers(0, n, n)
        a, b = auc(score[idx], labels[idx]), auc(base[idx], labels[idx])
        if a is not None and b is not None:
            diffs.append(a - b)
    if len(diffs) < runs * 0.9:
        return None
    lo, hi = np.percentile(diffs, [2.5, 97.5])
    return {"low": round(float(lo), 4), "high": round(float(hi), 4)}


PREDICTORS = {
    "score": "Puntaje de riesgo (fórmula completa)",
    "loc": "Solo líneas de código",
    "cc": "Solo complejidad ciclomática",
    "past_commits": "Solo frecuencia de cambios previa",
    "past_fixes": "Solo correcciones previas (historial de errores)",
}


def evaluate(rows: list[dict], alpha: float = ALPHA_DEFAULT, fraction: float = TOP_FRACTION) -> dict[str, Any]:
    """Evalúa filas {score, classification, loc, cc, past_commits, past_fixes, future_fixes, ...}."""
    n = len(rows)
    total_fixes = int(sum(r["future_fixes"] for r in rows))
    base: dict[str, Any] = {"n_files": n, "future_fixes": total_fixes, "top_fraction": fraction}
    if n < 10 or total_fixes < MIN_FUTURE_FIXES:
        return {**base, "sufficient": False,
                "note": f"Muestra insuficiente: {n} archivos y {total_fixes} correcciones posteriores al corte "
                        f"(se necesitan al menos 10 archivos y {MIN_FUTURE_FIXES} correcciones)."}

    fixes = [r["future_fixes"] for r in rows]
    has_fix = [f > 0 for f in fixes]
    preds = {k: [r[k] for r in rows] for k in PREDICTORS}

    comparison = []
    for key, label in PREDICTORS.items():
        a = auc(preds[key], has_fix)
        item = {"predictor": key, "label": label, "auc": None if a is None else round(a, 4),
                "capture_top": None, "spearman": spearman(preds[key], fixes, alpha)}
        c = capture_at_top(preds[key], fixes, fraction)
        item["capture_top"] = None if c is None else round(c, 4)
        if key != "score":
            item["auc_diff_ci95"] = _bootstrap_auc_diff(preds["score"], preds[key], has_fix)
            if a is not None and item["auc_diff_ci95"] is not None:
                item["score_better"] = bool(item["auc_diff_ci95"]["low"] > 0)
                item["score_worse"] = bool(item["auc_diff_ci95"]["high"] < 0)
        comparison.append(item)

    by_class, groups = [], []
    for cls in ("LOW", "MEDIUM", "HIGH"):
        sel = [r for r in rows if r["classification"] == cls]
        if not sel:
            continue
        f = [r["future_fixes"] for r in sel]
        by_class.append({"classification": cls, "n": len(sel), "mean_future_fixes": round(float(np.mean(f)), 3),
                         "pct_with_fix": round(float(np.mean([x > 0 for x in f]) * 100), 1)})
        if len(sel) >= 2:
            groups.append(f)
    kruskal = None
    if len(groups) >= 2:
        try:
            h, p = stats.kruskal(*groups)
            kruskal = {"h": round(float(h), 4), "p_value": round(float(p), 6), "significant": bool(p < alpha)}
        except ValueError:
            kruskal = None

    score_item = comparison[0]
    best_other = max((c for c in comparison[1:] if c["auc"] is not None), key=lambda c: c["auc"], default=None)
    return {
        **base, "sufficient": True, "alpha": alpha,
        "files_with_fix": int(sum(has_fix)),
        "score_vs_future_fixes": score_item["spearman"],
        "comparison": comparison,
        "by_class": by_class,
        "kruskal": kruskal,
        "best_baseline": None if best_other is None else {"predictor": best_other["predictor"], "label": best_other["label"],
                                                          "auc": best_other["auc"]},
        "score_beats_all_baselines": bool(best_other is not None and score_item["auc"] is not None
                                          and all(c.get("score_better") for c in comparison[1:])),
    }


# ------------------------------------------------------------------------ Orquestación

def temporal_rows(repo: str, ratio: float = CUTOFF_DEFAULT) -> dict[str, Any]:
    """Construye, para un repositorio ya clonado, una fila por archivo con el puntaje al corte
    y las correcciones posteriores."""
    cut = split_history(repo, ratio)
    if cut["total_commits"] < 20:
        return {**cut, "rows": [], "note": "Historial demasiado corto (menos de 20 commits)."}
    past = past_history(repo, cut["cutoff_sha"])
    metrics = snapshot_metrics(repo, cut["cutoff_sha"])
    tracked = {m["file"].replace("\\", "/") for m in metrics}
    outcome = future_outcome(repo, cut["cutoff_sha"], tracked)
    detector = RiskDetector()

    rows = []
    for m in metrics:
        path = m["file"].replace("\\", "/")
        h = past["files"].get(path, {"commits": 0, "fixes": 0, "authors": {}})
        authors = h["authors"]
        total = sum(authors.values())
        bus = past["repo_bus_factor"]
        if total >= MIN_FILE_COMMITS_BUS:
            bus = round(max(authors.values()) / total * 100, 2)
        module = detector.analyze_module(path, m, {"total_commits": h["commits"], "risk_percentage": bus})
        ra = module["risk_analysis"]
        o = outcome.get(path, {"commits": 0, "fixes": 0})
        rows.append({
            "file": path, "score": ra["risk_score"], "classification": ra["classification"],
            "loc": m.get("loc", 0), "cc": m.get("complexity", 0),
            "past_commits": h["commits"], "past_fixes": h["fixes"],
            "future_commits": o["commits"], "future_fixes": o["fixes"],
        })
    return {**cut, "rows": rows}


def temporal_validation(repo_dirs: dict[str, str], ratio: float = CUTOFF_DEFAULT,
                        alpha: float = ALPHA_DEFAULT) -> dict[str, Any]:
    """Validación predictiva sobre varios repositorios {nombre: carpeta}.
    Devuelve el resultado por repositorio y el conjunto (todos los archivos juntos)."""
    per_repo, pooled, failed = [], [], []
    for name, repo in repo_dirs.items():
        try:
            r = temporal_rows(repo, ratio)
        except Exception as e:  # repo sin historial, sin git, etc.: no detiene a los demás
            failed.append({"repo": name, "error": str(e)[:200]})
            continue
        rows = r.pop("rows")
        ev = evaluate(rows, alpha) if rows else {"sufficient": False, "n_files": 0, "note": r.get("note", "")}
        per_repo.append({"repo": name, **r, "evaluation": ev})
        pooled.extend({**row, "repo": name} for row in rows)
    return {
        "design": {
            "cutoff_ratio": ratio, "top_fraction": TOP_FRACTION, "outcome": "Commits de corrección posteriores al corte",
            "note": ("El puntaje se calcula solo con el código y el historial anteriores al corte; las correcciones se "
                     "cuentan después. La fórmula y los pesos no se modifican. Las correcciones se detectan por "
                     "palabras clave del mensaje del commit (aproximación)."),
        },
        "repositories": per_repo, "failed": failed,
        "pooled": evaluate(pooled, alpha) if pooled else {"sufficient": False, "n_files": 0},
    }


if __name__ == "__main__":  # python -m app.modules.temporal_validation <carpeta_repo> [<carpeta_repo> ...]
    import json
    import sys
    dirs = {os.path.basename(p.rstrip("/\\")): p for p in sys.argv[1:]}
    print(json.dumps(temporal_validation(dirs), indent=2, ensure_ascii=False))
