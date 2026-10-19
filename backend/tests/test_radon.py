from app.modules import radon_compare as radon

SRC = """
def a(x):
    if x > 1:
        return 1
    for i in range(3):
        if i:
            return i
    return 0

def b():
    return 2
"""


def test_radon_metrics_parses_python():
    r = radon.radon_metrics(SRC)
    assert r["complexity"] >= 4
    assert r["sloc"] > 5
    assert 0 <= r["maintainability"] <= 100


def test_radon_metrics_invalid_source_returns_none():
    assert radon.radon_metrics("def (:") is None


def test_compare_with_radon_correlates_real_files(tmp_path):
    modules = []
    for i in range(1, 8):
        f = tmp_path / f"m{i}.py"
        f.write_text("\n".join(f"def f{j}(x):\n    if x:\n        return {j}\n    return 0" for j in range(i)))
        modules.append({"file": str(f), "code_metrics": {"cyclomatic_complexity": i * 2, "lines_of_code": i * 4}})
    modules.append({"file": str(tmp_path / "app.js"), "code_metrics": {"cyclomatic_complexity": 3, "lines_of_code": 9}})
    agreement, n = radon.compare_with_radon(modules)
    assert n == 7  # el .js no se compara
    assert agreement[0]["rho"] > 0.9 and agreement[1]["rho"] > 0.9


def test_compare_with_radon_small_sample_has_note(tmp_path):
    f = tmp_path / "a.py"
    f.write_text(SRC)
    agreement, n = radon.compare_with_radon([{"file": str(f), "code_metrics": {"cyclomatic_complexity": 4, "lines_of_code": 9}}])
    assert n == 1 and agreement[0]["rho"] is None and "insuficiente" in agreement[0]["note"]


def test_scc_comparison_and_tools_endpoint(tmp_path, monkeypatch):
    import shutil
    from app.modules.scc_runner import run_scc, scc_available
    from app.routers import tools
    if not scc_available():
        import pytest
        pytest.skip("scc no instalado")
    mods = []
    for i in range(1, 8):
        f = tmp_path / f"m{i}.js"
        f.write_text("\n".join(f"function f{j}(x){{\n  if (x) {{ return {j}; }}\n  return 0;\n}}" for j in range(i)))
        mods.append({"file": str(f), "code_metrics": {"cyclomatic_complexity": i * 2, "lines_of_code": i * 4}})
    items, n = tools.compare_with_scc(mods, run_scc(str(tmp_path)))
    assert n == 7 and items[0]["rho"] > 0.9 and items[1]["rho"] > 0.9
