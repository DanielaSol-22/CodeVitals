import subprocess

from app.routers import risk


def _git(cwd, *args):
    subprocess.run(["git", *args], cwd=cwd, check=True, capture_output=True,
                   env={"GIT_AUTHOR_NAME": "a", "GIT_AUTHOR_EMAIL": "a@a", "GIT_COMMITTER_NAME": "a",
                        "GIT_COMMITTER_EMAIL": "a@a", "PATH": subprocess.os.environ["PATH"], "HOME": str(cwd)})


def _make_repo(tmp_path):
    repo = tmp_path / "demo"
    repo.mkdir()
    _git(repo, "init", "-q")
    (repo / "a.py").write_text("def f(x):\n    if x:\n        return 1\n    return 2\n")
    _git(repo, "add", ".")
    _git(repo, "commit", "-q", "-m", "one")
    return repo


def test_analysis_is_cached_until_head_changes(tmp_path, monkeypatch):
    repo = _make_repo(tmp_path)
    calls = []
    original = risk._analyze_uncached
    monkeypatch.setattr(risk, "_analyze_uncached", lambda *a: calls.append(1) or original(*a))
    risk._ANALYSIS_CACHE.clear()

    m1, _, _ = risk._analyze_all_modules(str(repo), str(repo))
    m2, _, _ = risk._analyze_all_modules(str(repo), str(repo))
    assert len(calls) == 1 and len(m1) == len(m2) == 1

    (repo / "b.py").write_text("x = 1\n")
    _git(repo, "add", ".")
    _git(repo, "commit", "-q", "-m", "two")
    m3, _, _ = risk._analyze_all_modules(str(repo), str(repo))
    assert len(calls) == 2 and len(m3) == 2


def test_duplication_percent_is_exposed_for_persistence(tmp_path):
    repo = _make_repo(tmp_path)
    risk._ANALYSIS_CACHE.clear()
    modules, _, _ = risk._analyze_all_modules(str(repo), str(repo))
    assert "duplication_percent" in modules[0]["code_metrics"]


def test_history_endpoint_returns_points_in_order():
    import pytest
    pytest.importorskip("aiosqlite")
    import asyncio
    from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
    from app import models
    from app.database import Base

    async def run():
        engine = create_async_engine("sqlite+aiosqlite://")
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        async with async_sessionmaker(engine, expire_on_commit=False)() as db:
            for i, sc in enumerate([30, 60]):
                r = models.Repositorio(nombre="x", ruta="/", url_remota="u")
                db.add(r); await db.flush()
                m = models.Modulo(repositorio_id=r.id, ruta_archivo="f"); db.add(m); await db.flush()
                db.add(models.Metrica(modulo_id=m.id, complejidad_ciclomatica=10 * (i + 1), codigo_duplicado_pct=5.0))
                db.add(models.Riesgo(modulo_id=m.id, puntaje=sc, clasificacion="LOW"))
            await db.commit()
            out = await risk.risk_history("u", 30, db)
            assert [p["average_risk_score"] for p in out["history"]] == [30.0, 60.0]
            assert out["history"][1]["average_complexity"] == 20.0
            assert (await risk.risk_history("otro", 30, db))["history"] == []

    asyncio.run(run())


def test_classification_has_no_gaps_between_ranges():
    from app.modules.risk_detector import RiskDetector
    d = RiskDetector()
    expected = {0: "LOW", 39: "LOW", 39.5: "LOW", 39.99: "LOW", 40: "MEDIUM", 69: "MEDIUM",
                69.5: "MEDIUM", 69.99: "MEDIUM", 70: "HIGH", 100: "HIGH"}
    for score, level in expected.items():
        assert d._classify_risk(score) == level, score
