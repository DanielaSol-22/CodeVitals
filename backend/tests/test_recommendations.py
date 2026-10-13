from app.modules.risk_detector import RiskDetector

d = RiskDetector()


def _module(funcs, loc, commits, dup, bus, author="Ana", cc=None):
    code = {"complexity": cc if cc is not None else sum(f["cyclomatic_complexity"] for f in funcs),
            "loc": loc, "functions_count": len(funcs), "functions": funcs,
            "deficiencies": [], "duplication_percent": dup}
    git = {"total_commits": commits, "total_churn": 0, "risk_percentage": bus,
           "top_author": author, "file_commits": commits}
    return d.analyze_module("src/x.py", code, git)


def _f(name, cc, lines=20, params=2):
    return {"name": name, "cyclomatic_complexity": cc, "lines": lines, "parameters": params}


def test_low_risk_gets_single_no_action_recommendation():
    m = _module([_f("a", 2)], 30, 3, 0, 40)
    assert m["risk_analysis"]["classification"] == "LOW"
    assert len(m["recommendations"]) == 1 and m["recommendations"][0]["priority"] == "BAJA"


def test_recommendations_name_functions_and_values():
    m = _module([_f("parse", 24, lines=80, params=7), _f("run", 18), _f("tiny", 2)], 600, 60, 30, 90)
    text = " ".join(r["action"] + " " + r["reason"] for r in m["recommendations"])
    assert "parse (24)" in text and "run (18)" in text and "tiny" not in text
    assert "parse (80 líneas)" in text          # método largo
    assert "parse (7 parámetros)" in text       # demasiados parámetros
    assert "60 commits" in text                 # churn
    assert "30%" in text                      # duplicación
    assert "Ana" in text and "90%" in text    # bus factor con autor
    factors = {r["factor"] for r in m["recommendations"]}
    assert {"complejidad", "tamaño", "parámetros", "inestabilidad", "duplicación", "conocimiento"} <= factors


def test_recommendations_are_sorted_by_priority():
    m = _module([_f("parse", 24), _f("run", 18)], 600, 60, 30, 90)
    order = {"ALTA": 0, "MEDIA": 1, "BAJA": 2}
    pr = [order[r["priority"]] for r in m["recommendations"]]
    assert pr == sorted(pr) and m["recommendations"][0]["priority"] == "ALTA"


def test_only_triggered_factors_appear():
    m = _module([_f("parse", 24)], 120, 4, 0, 30)
    factors = {r["factor"] for r in m["recommendations"]}
    assert factors == {"complejidad"}


def test_justification_has_values_and_no_constant_suffix():
    m = _module([_f("parse", 24)], 120, 4, 0, 30)
    j = m["risk_analysis"]["justification"]
    assert "CC 24" in j and "Refactorización recomendada" not in j


def test_medium_without_specific_trigger_gets_generic_recommendation():
    m = _module([_f(f"f{i}", 4) for i in range(6)], 240, 6, 10, 50)
    assert m["risk_analysis"]["classification"] in ("MEDIUM", "LOW")
    assert m["recommendations"]
