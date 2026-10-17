"""Validez externa: commits de corrección de errores como criterio independiente del puntaje."""
import subprocess

import pytest

from app.modules import statistics_analyzer as sa
from app.modules.git_analyzer import GitAnalyzer, is_fix_commit


@pytest.mark.parametrize("msg", [
    "Fix crash when parsing empty file", "fixes #123", "Fixed off-by-one error", "bugfix: wrong sign",
    "Hotfix for login", "Resolve regression in router", "resolves #45", "BUG: null pointer",
])
def test_is_fix_commit_true(msg):
    assert is_fix_commit(msg)


@pytest.mark.parametrize("msg", [
    "Add new feature", "Refactor module", "Update README", "prefix handling", "Add fixture for tests",
    "Fix typo in docs", "fix formatting", "Fix lint warnings", "", None,
])
def test_is_fix_commit_false(msg):
    assert not is_fix_commit(msg)


def _git(cwd, *args):
    subprocess.run(["git", *args], cwd=cwd, check=True, capture_output=True,
                   env={"GIT_AUTHOR_NAME": "A", "GIT_AUTHOR_EMAIL": "a@x", "GIT_COMMITTER_NAME": "A",
                        "GIT_COMMITTER_EMAIL": "a@x", "PATH": __import__("os").environ["PATH"],
                        "HOME": str(cwd)})


def test_history_counts_fix_commits_per_file(tmp_path):
    repo = tmp_path / "demo"
    repo.mkdir()
    _git(repo, "init", "-q")
    for i, msg in enumerate(["Add a", "Fix crash in a", "Refactor a", "bugfix: wrong value in a"]):
        (repo / "a.py").write_text(f"x = {i}\n")
        _git(repo, "add", "."); _git(repo, "commit", "-q", "-m", msg)
    (repo / "b.py").write_text("y = 1\n")
    _git(repo, "add", "."); _git(repo, "commit", "-q", "-m", "Add b")

    git = GitAnalyzer("local:demo", str(tmp_path))
    a = git.calculate_code_churn("a.py")
    b = git.calculate_code_churn("b.py")
    assert a["total_changes"] == 4 and a["fix_commits"] == 2
    assert b["total_changes"] == 1 and b["fix_commits"] == 0


def _mod(commits, fixes, score, cls):
    return {
        "code_metrics": {"cyclomatic_complexity": 1, "lines_of_code": 10, "cognitive_complexity": 0},
        "git_metrics": {"commits": commits, "fix_commits": fixes, "bus_factor_risk": 10, "code_churn": 5},
        "risk_analysis": {"risk_score": score, "classification": cls, "component_scores": {"code_duplication": 0}},
    }


def test_external_validity_detects_association():
    mods = ([_mod(10, 0, 10 + i, "LOW") for i in range(8)]
            + [_mod(10, 3, 45 + i, "MEDIUM") for i in range(8)]
            + [_mod(10, 7, 75 + i, "HIGH") for i in range(8)])
    ev = sa.external_validity(mods)
    assert ev["sufficient"] and ev["n_eligible"] == 24
    assert ev["score"]["rho"] > 0.8 and ev["score"]["significant"]
    means = {c["classification"]: c["mean_ratio"] for c in ev["by_class"]}
    assert means["LOW"] < means["MEDIUM"] < means["HIGH"]
    assert ev["kruskal"]["significant"]


def test_external_validity_ignores_modules_with_few_commits_and_small_samples():
    mods = [_mod(2, 1, 50, "MEDIUM") for _ in range(10)]  # menos de 5 commits cada uno
    ev = sa.external_validity(mods)
    assert not ev["sufficient"] and ev["n_eligible"] == 0
    assert "insuficiente" in ev["note"].lower()


def test_analyze_modules_includes_external_validity():
    mods = [_mod(10, i % 4, 20 + i, "LOW") for i in range(10)]
    assert "external_validity" in sa.analyze_modules(mods)


def _comp(cc, churn, loc, dup, bus):
    total = cc * .375 + churn * .275 + loc * .175 + dup * .125 + bus * .125
    return {
        "code_metrics": {"cyclomatic_complexity": 1, "lines_of_code": 10},
        "git_metrics": {"commits": 10, "bus_factor_risk": 10},
        "risk_analysis": {"risk_score": total, "classification": "LOW",
                          "component_scores": {"cyclomatic_complexity": cc, "code_churn": churn,
                                               "lines_of_code": loc, "code_duplication": dup, "bus_factor": bus}},
    }


def test_weight_sensitivity_stable_for_clearly_separated_modules():
    mods = [_comp(5, 5, 5, 5, 5) for _ in range(10)] + [_comp(95, 95, 95, 95, 95) for _ in range(10)]
    ws = sa.weight_sensitivity(mods)
    assert ws["sufficient"] and len(ws["scenarios"]) == 10
    assert all(s["pct_changed"] == 0 for s in ws["scenarios"])
    assert ws["monte_carlo"]["worst_pct_changed"] == 0


def test_weight_sensitivity_detects_borderline_modules():
    # Un módulo cerca del límite (≈39.7 tras normalizar) cambia de clase al mover un peso.
    mods = [_comp(60, 10, 10, 10, 10) for _ in range(9)] + [_comp(100, 19, 0, 0, 0)]
    mods += [_comp(10, 10, 10, 10, 10) for _ in range(5)]
    ws = sa.weight_sensitivity(mods)
    assert any(s["pct_changed"] > 0 for s in ws["scenarios"])
    assert ws["most_sensitive"]["pct_changed"] > 0


def test_weight_sensitivity_small_sample():
    assert sa.weight_sensitivity([_comp(1, 1, 1, 1, 1)])["sufficient"] is False


def test_resolve_identities_merges_same_email_and_same_name():
    from app.modules.git_analyzer import resolve_identities
    pairs = ([("Ana", "a@x.com")] * 3 + [("Ana Pérez", "a@x.com")] * 1      # mismo correo
             + [("ana", "ana@casa.com")] * 2                                # mismo nombre (otra capitalización)
             + [("Luis", "l@x.com")] * 4
             + [("Bot", "noreply@github.com"), ("Otro", "noreply@github.com")])  # correo genérico: no une
    ids = resolve_identities(pairs)
    assert ids[("Ana", "a@x.com")] == ids[("Ana Pérez", "a@x.com")] == ids[("ana", "ana@casa.com")] == "Ana"
    assert ids[("Luis", "l@x.com")] == "Luis"
    assert ids[("Bot", "noreply@github.com")] != ids[("Otro", "noreply@github.com")]


def test_bus_factor_counts_one_person_with_two_identities(tmp_path):
    import os
    repo = tmp_path / "demo2"
    repo.mkdir()

    def git(args, name, email):
        env = {"GIT_AUTHOR_NAME": name, "GIT_AUTHOR_EMAIL": email, "GIT_COMMITTER_NAME": name,
               "GIT_COMMITTER_EMAIL": email, "PATH": os.environ["PATH"], "HOME": str(repo)}
        subprocess.run(["git", *args], cwd=repo, check=True, capture_output=True, env=env)

    git(["init", "-q"], "Ana", "a@x.com")
    for i, (n, e) in enumerate([("Ana", "a@x.com"), ("Ana P.", "a@x.com"), ("Ana", "a@x.com"), ("Luis", "l@x.com")]):
        (repo / "f.py").write_text(f"x = {i}\n")
        git(["add", "."], n, e); git(["commit", "-q", "-m", f"c{i}"], n, e)

    bf = GitAnalyzer("local:demo2", str(tmp_path)).calculate_file_bus_factor("f.py")
    assert bf["authors"] == 2 and bf["risk_percentage"] == 75.0 and bf["top_author"] == "Ana"
