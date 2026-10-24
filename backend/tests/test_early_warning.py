"""Índice de alerta temprana: puntaje + correcciones previas, relativos al repositorio."""
import math

from app.modules.risk_detector import (
    EARLY_ALERT_FRACTION, EARLY_WEIGHT_FIXES, EARLY_WEIGHT_SCORE, attach_early_warning, early_warning_index,
)


def _module(name, score, fixes):
    return {"file": name, "risk_analysis": {"risk_score": score}, "git_metrics": {"fix_commits": fixes}}


def test_pesos_suman_uno():
    assert math.isclose(EARLY_WEIGHT_SCORE + EARLY_WEIGHT_FIXES, 1.0)


def test_indice_esta_entre_0_y_100():
    idx = early_warning_index([10, 20, 30, 90], [0, 1, 5, 9])
    assert all(0 <= v <= 100 for v in idx)
    assert idx[0] == 0.0 and idx[-1] == 100.0


def test_mas_correcciones_sube_el_indice_con_igual_puntaje():
    idx = early_warning_index([50, 50, 50], [0, 2, 8])
    assert idx[0] < idx[1] < idx[2]


def test_mayor_puntaje_sube_el_indice_con_iguales_correcciones():
    idx = early_warning_index([10, 40, 80], [3, 3, 3])
    assert idx[0] < idx[1] < idx[2]


def test_correcciones_pesan_mas_que_el_puntaje():
    # A: puntaje máximo sin correcciones; B: puntaje mínimo con más correcciones.
    idx = early_warning_index([90, 10], [0, 7])
    assert idx[1] > idx[0]


def test_un_solo_archivo_no_falla():
    assert early_warning_index([42], [3]) == [0.0]


def test_lista_vacia():
    assert early_warning_index([], []) == []
    attach_early_warning([])


def test_alerta_marca_el_20_por_ciento_superior():
    mods = [_module(f"f{i}.py", i * 5, i) for i in range(20)]
    attach_early_warning(mods)
    alerts = [m for m in mods if m["early_warning"]["alert"]]
    assert len(alerts) == math.ceil(EARLY_ALERT_FRACTION * 20)
    assert {m["file"] for m in alerts} == {"f16.py", "f17.py", "f18.py", "f19.py"}
    assert min(m["early_warning"]["index"] for m in alerts) >= max(m["early_warning"]["index"] for m in mods if not m["early_warning"]["alert"])


def test_rank_y_correcciones_se_reportan():
    mods = [_module("a.py", 10, 0), _module("b.py", 90, 6), _module("c.py", 50, 2)]
    attach_early_warning(mods)
    by = {m["file"]: m["early_warning"] for m in mods}
    assert by["b.py"]["rank"] == 1 and by["b.py"]["fix_commits"] == 6 and by["b.py"]["alert"] is True
    assert by["a.py"]["rank"] == 3 and by["a.py"]["alert"] is False


def test_repositorio_pequeno_marca_al_menos_uno():
    mods = [_module("a.py", 10, 0), _module("b.py", 20, 1)]
    attach_early_warning(mods)
    assert sum(m["early_warning"]["alert"] for m in mods) == 1


def test_sin_correcciones_en_el_repositorio_decide_el_puntaje():
    mods = [_module("a.py", 10, 0), _module("b.py", 80, 0), _module("c.py", 40, 0)]
    attach_early_warning(mods)
    top = min(mods, key=lambda m: m["early_warning"]["rank"])
    assert top["file"] == "b.py"


def test_prioridad_incluye_modulos_en_alerta_de_riesgo_bajo(monkeypatch):
    from app.routers import risk

    def mod(name, score, cls, fixes):
        return {"file": name, "risk_analysis": {"risk_score": score, "classification": cls},
                "git_metrics": {"fix_commits": fixes}, "code_metrics": {"deficiencies": []}, "recommendations": []}

    mods = [mod("alto.py", 85, "HIGH", 0), mod("bajo_con_fixes.py", 20, "LOW", 30)] + [mod(f"x{i}.py", 10, "LOW", 0) for i in range(8)]
    attach_early_warning(mods)
    monkeypatch.setattr(risk, "_analyze_all_modules", lambda *a, **k: (mods, None, 100))
    out = risk.risk_priority(risk.RiskRepositoryRequest(repo_url="https://github.com/pallets/click", limit=100))
    files = {m["file_path"]: m for m in out["modules"]}
    assert "bajo_con_fixes.py" in files and files["bajo_con_fixes.py"]["early_warning"]["alert"] is True
    assert "x0.py" not in files


def test_promedios_de_los_cinco_componentes():
    from app.routers.risk import _average_components

    def mod(**c):
        return {"risk_analysis": {"component_scores": c}}

    out = _average_components([
        mod(cyclomatic_complexity=80, code_churn=40, lines_of_code=20, code_duplication=0, bus_factor=100),
        mod(cyclomatic_complexity=40, code_churn=20, lines_of_code=40, code_duplication=10, bus_factor=50),
    ])
    assert out == {"complexity": 60.0, "churn": 30.0, "loc": 30.0, "duplication": 5.0, "bus_factor": 75.0}
