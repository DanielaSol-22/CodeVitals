import numpy as np
import pytest

from app.modules import statistics_analyzer as sa


def fake_module(cc, loc, commits, cls, score):
    return {
        "code_metrics": {"cyclomatic_complexity": cc, "lines_of_code": loc},
        "git_metrics": {"commits": commits, "bus_factor_risk": 30},
        "risk_analysis": {"risk_score": score, "classification": cls,
                          "component_scores": {"code_duplication": 0}},
    }


def test_descriptive():
    d = sa.descriptive([1, 2, 3, 4, 5])
    assert d["mean"] == 3 and d["median"] == 3 and d["n"] == 5


def test_spearman_perfect():
    r = sa.spearman([1, 2, 3, 4, 5, 6], [10, 20, 30, 40, 50, 60])
    assert r["rho"] == 1.0 and r["significant"]


def test_spearman_constant_and_small():
    assert sa.spearman([1, 1, 1, 1, 1], [1, 2, 3, 4, 5])["rho"] is None
    assert sa.spearman([1, 2], [1, 2])["rho"] is None


def test_chi_square_association():
    vals = list(range(30))
    cls = ["LOW"] * 10 + ["MEDIUM"] * 10 + ["HIGH"] * 10
    r = sa.chi_square(vals, cls)
    assert r["significant"] and r["cramers_v"] > 0.9


def test_chi_square_single_class():
    r = sa.chi_square(list(range(10)), ["LOW"] * 10)
    assert r["chi2"] is None


def test_analyze_modules_structure():
    rng = np.random.default_rng(1)
    mods = []
    for i in range(40):
        cc = int(rng.integers(1, 50))
        score = cc * 1.5 + float(rng.normal(0, 3))
        cls = "HIGH" if score >= 70 else "MEDIUM" if score >= 40 else "LOW"
        mods.append(fake_module(cc, cc * 10, int(rng.integers(0, 30)), cls, score))
    out = sa.analyze_modules(mods)
    assert out["n_modules"] == 40
    assert len(out["spearman"]) == 7 and len(out["chi_square"]) == 7
    cc_row = next(x for x in out["spearman"] if x["variable"] == "cyclomatic_complexity")
    assert cc_row["rho"] > 0.9
    bf = next(x for x in out["spearman"] if x["variable"] == "bus_factor")
    assert bf["rho"] is None  # constante


def test_complementary_metrics_are_flagged_outside_the_formula():
    mods = [fake_module(i, i * 10, i, "LOW", i * 1.2) for i in range(1, 20)]
    for i, m in enumerate(mods):
        m["code_metrics"]["cognitive_complexity"] = i * 2
        m["git_metrics"]["code_churn"] = i * 30
    out = sa.analyze_modules(mods)
    flags = {x["variable"]: x["in_formula"] for x in out["spearman"]}
    assert flags["cyclomatic_complexity"] and flags["code_churn"]
    assert not flags["cognitive_complexity"] and not flags["churn_lines"]
    cog = next(x for x in out["spearman"] if x["variable"] == "cognitive_complexity")
    assert cog["rho"] == 1.0
