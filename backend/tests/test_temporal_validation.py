"""Pruebas de la validación predictiva en el tiempo (repositorio Git sintético, sin red)."""
import os
import subprocess

import pytest

from app.modules import temporal_validation as tv


def _git(repo, *args, env=None):
    subprocess.run(["git", *args], cwd=repo, check=True, capture_output=True, text=True,
                   env={**os.environ, "GIT_AUTHOR_NAME": "Ana", "GIT_AUTHOR_EMAIL": "ana@x.com",
                        "GIT_COMMITTER_NAME": "Ana", "GIT_COMMITTER_EMAIL": "ana@x.com", **(env or {})})


def _commit(repo, files: dict, msg: str):
    for name, text in files.items():
        path = os.path.join(repo, name)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "a", encoding="utf-8") as fh:
            fh.write(text)
    _git(repo, "add", "-A")
    _git(repo, "commit", "-q", "-m", msg)


@pytest.fixture()
def repo(tmp_path):
    r = str(tmp_path)
    _git(r, "init", "-q")
    # Pasado (14 commits): a.py cambia mucho; b.py, c.py poco.
    _commit(r, {"a.py": "def f(x):\n    return x\n", "b.py": "def g():\n    return 1\n", "c.py": "def h():\n    return 2\n"}, "inicio")
    for i in range(10):
        _commit(r, {"a.py": f"# cambio {i}\n"}, f"feature {i}")
    _commit(r, {"b.py": "# nota\n"}, "feature b")
    _commit(r, {"c.py": "# nota\n"}, "feature c")
    _commit(r, {"d.py": "def k():\n    return 4\n"}, "agrega d")
    # Futuro (6 commits): 3 correcciones en a.py, un renombre de b.py seguido de una corrección, un cambio en c.py.
    _commit(r, {"a.py": "# x\n"}, "fix: corrige error en a")
    _commit(r, {"a.py": "# y\n"}, "Fix crash al iniciar")
    _commit(r, {"a.py": "# z\n"}, "bugfix en a")
    _git(r, "mv", "b.py", "b2.py")
    _git(r, "commit", "-q", "-m", "renombra b")
    _commit(r, {"b2.py": "# w\n"}, "fix regression en b2")
    _commit(r, {"c.py": "# v\n"}, "mejora c")
    return r


def test_split_history_uses_ratio(repo):
    cut = tv.split_history(repo, 0.7)
    assert cut["total_commits"] == 20
    assert cut["past_commits"] == 14 and cut["future_commits"] == 6


def test_past_history_counts_only_the_past(repo):
    cut = tv.split_history(repo, 0.7)
    past = tv.past_history(repo, cut["cutoff_sha"])
    assert past["files"]["a.py"]["commits"] == 11
    assert past["files"]["a.py"]["fixes"] == 0
    assert past["files"]["b.py"]["commits"] == 2
    assert "d.py" in past["files"]


def test_future_outcome_counts_fixes_and_follows_renames(repo):
    cut = tv.split_history(repo, 0.7)
    out = tv.future_outcome(repo, cut["cutoff_sha"], {"a.py", "b.py", "c.py", "d.py"})
    assert out["a.py"]["fixes"] == 3
    assert out["b.py"]["fixes"] == 1          # el renombre no pierde la corrección posterior
    assert out["c.py"]["fixes"] == 0 and out["c.py"]["commits"] == 1
    assert out["d.py"]["commits"] == 0


def test_temporal_rows_has_no_future_information(repo):
    # El historial de este repo es corto: se fuerza el cálculo directamente con las piezas.
    cut = tv.split_history(repo, 0.7)
    metrics = tv.snapshot_metrics(repo, cut["cutoff_sha"])
    assert {m["file"] for m in metrics} == {"a.py", "b.py", "c.py", "d.py"}
    # En el corte b.py todavía se llama b.py (el renombre es posterior).
    assert "b2.py" not in {m["file"] for m in metrics}


def test_temporal_rows_joins_score_at_cutoff_with_future_fixes(repo):
    res = tv.temporal_rows(repo, 0.7)
    by_file = {r["file"]: r for r in res["rows"]}
    assert set(by_file) == {"a.py", "b.py", "c.py", "d.py"}
    assert by_file["a.py"]["future_fixes"] == 3 and by_file["a.py"]["past_commits"] == 11
    assert by_file["b.py"]["future_fixes"] == 1
    # a.py (11 commits antes del corte) tiene más frecuencia de cambios que d.py (1 commit): mayor puntaje
    assert by_file["a.py"]["score"] > by_file["d.py"]["score"]


def test_short_history_is_reported_not_crashed(tmp_path):
    r = str(tmp_path)
    _git(r, "init", "-q")
    for i in range(5):
        _commit(r, {"a.py": f"x = {i}\n"}, f"c{i}")
    res = tv.temporal_rows(r, 0.7)
    assert res["rows"] == [] and "corto" in res["note"]


def test_auc_perfect_random_and_ties():
    assert tv.auc([1, 2, 3, 4], [0, 0, 1, 1]) == 1.0
    assert tv.auc([4, 3, 2, 1], [0, 0, 1, 1]) == 0.0
    assert tv.auc([1, 1, 1, 1], [0, 1, 0, 1]) == 0.5
    assert tv.auc([1, 2], [1, 1]) is None


def test_capture_at_top():
    scores = [10, 9, 1, 1, 1, 1, 1, 1, 1, 1]
    fixes = [5, 5, 0, 0, 0, 0, 0, 0, 0, 0]
    assert tv.capture_at_top(scores, fixes, 0.2) == 1.0
    assert tv.capture_at_top(scores, [0] * 10, 0.2) is None


def _rows(n, good=True):
    rows = []
    for i in range(n):
        s = i * 100 / n
        fixes = (1 if i % 3 == 0 else 0) + (3 if (good and i >= n - 4) else 0)
        rows.append({"score": s, "classification": "HIGH" if s >= 70 else "MEDIUM" if s >= 40 else "LOW",
                     "loc": i, "cc": (i * 7) % 11, "past_commits": i % 5, "past_fixes": i % 2, "future_fixes": fixes})
    return rows


def test_evaluate_reports_prediction_and_baselines():
    ev = tv.evaluate(_rows(60))
    assert ev["sufficient"] and ev["n_files"] == 60
    assert ev["score_vs_future_fixes"]["rho"] > 0
    assert {c["predictor"] for c in ev["comparison"]} == set(tv.PREDICTORS)
    assert [b["classification"] for b in ev["by_class"]] == ["LOW", "MEDIUM", "HIGH"]
    assert ev["by_class"][-1]["mean_future_fixes"] > ev["by_class"][0]["mean_future_fixes"]


def test_evaluate_insufficient_sample():
    ev = tv.evaluate(_rows(5))
    assert ev["sufficient"] is False and "insuficiente" in ev["note"].lower()
    ev2 = tv.evaluate([{**r, "future_fixes": 0} for r in _rows(40)])
    assert ev2["sufficient"] is False
