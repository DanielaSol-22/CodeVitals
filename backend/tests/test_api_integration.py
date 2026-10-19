"""
Pruebas de INTEGRACIÓN de la API (CodeVitals).

Ejercen la aplicación real a través de HTTP (FastAPI TestClient) con todos los módulos
conectados: validación de entrada -> GitAnalyzer (PyDriller) -> MetricsCalculator (Lizard)
-> RiskDetector -> persistencia en base de datos -> respuesta JSON.
Usan repositorios reales de la carpeta repos/ mediante 'local:<carpeta>', sin red.
La base de datos es SQLite en memoria de archivo temporal (en producción es PostgreSQL).
"""
import os
import pathlib

import pytest

REPOS = pathlib.Path(__file__).resolve().parents[1] / "repos"
os.environ["REPOS_ROOT"] = str(REPOS)
os.environ["API_KEY"] = ""

from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine  # noqa: E402

from app import database  # noqa: E402
from app.main import create_app  # noqa: E402
from app.routers import risk  # noqa: E402

REPO = "local:prettytable"
pytestmark = pytest.mark.skipif(not (REPOS / "prettytable").is_dir(), reason="falta repos/prettytable")


@pytest.fixture(scope="module")
def client(tmp_path_factory):
    import asyncio
    db_file = tmp_path_factory.mktemp("db") / "t.db"
    engine = create_async_engine(f"sqlite+aiosqlite:///{db_file}")
    maker = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

    async def init():
        from app import models  # noqa: F401
        async with engine.begin() as conn:
            await conn.run_sync(database.Base.metadata.create_all)
    asyncio.run(init())

    async def override():
        async with maker() as s:
            yield s

    app = create_app()
    app.dependency_overrides[database.get_db] = override
    risk._ANALYSIS_CACHE.clear()
    yield TestClient(app)  # sin 'with': no ejecuta el arranque que conecta a PostgreSQL


@pytest.fixture(scope="module")
def analysis(client):
    r = client.post("/api/v1/risk/repository", json={"repo_url": REPO})
    assert r.status_code == 200, r.text
    return r.json()


def test_health_endpoint(client):
    r = client.get("/health")
    assert r.status_code == 200 and r.json()["status"] == "ok"


def test_info_endpoint(client):
    r = client.get("/api/v1/info")
    assert r.status_code == 200 and "FastAPI" in r.json()["stack"]


def test_risk_repository_full_flow(analysis):
    assert analysis["total_modules"] > 0
    assert 0 <= analysis["average_risk_score"] <= 100
    pct = analysis["high_risk_percentage"] + analysis["medium_risk_percentage"] + analysis["low_risk_percentage"]
    assert abs(pct - 100) < 0.1
    assert analysis["repository_total_commits"] > 0


def test_risk_scores_follow_classification_thresholds(analysis):
    for m in analysis["top_risk_modules"]:
        s, c = m["risk_score"], m["classification"]
        assert (c == "HIGH") == (s >= 70)
        assert (c == "MEDIUM") == (40 <= s < 70)


def test_top_modules_sorted_and_expose_loc(analysis):
    scores = [m["risk_score"] for m in analysis["top_risk_modules"]]
    assert scores == sorted(scores, reverse=True)
    assert all("loc" in m for m in analysis["top_risk_modules"])


def test_component_scores_present(analysis):
    assert analysis["metrics"] and all(0 <= v <= 100 for v in analysis["metrics"].values())


def test_risk_module_detail(client, analysis):
    top = analysis["top_risk_modules"]
    if not top:
        pytest.skip("el repositorio no tiene módulos de riesgo medio/alto")
    r = client.post("/api/v1/risk/module", json={"repo_url": REPO, "file_path": top[0]["file_path"]})
    assert r.status_code == 200
    assert r.json()


def test_priority_list(client):
    r = client.post("/api/v1/risk/priority", json={"repo_url": REPO, "limit": 5})
    assert r.status_code == 200


def test_analysis_is_persisted_and_listed(client, analysis):
    r = client.get("/api/v1/risk/repositories")
    assert r.status_code == 200
    assert "prettytable" in r.text


def test_history_endpoint(client, analysis):
    r = client.get("/api/v1/risk/history", params={"repo_url": REPO})
    assert r.status_code == 200


def test_metrics_repository_endpoint(client):
    r = client.post("/api/v1/metrics/repository", json={"repo_path": str(REPOS / "prettytable")})
    assert r.status_code == 200


def test_git_bus_factor_endpoint(client):
    r = client.post("/api/v1/analyze/repository/bus-factor", json={"repo_url": REPO})
    assert r.status_code == 200
    assert r.json()


def test_stats_validation_with_local_repo(client, analysis):
    r = client.post("/api/v1/stats/validation", json={"repo_url": REPO})
    assert r.status_code == 200
    body = r.json()
    assert "spearman" in body


@pytest.mark.parametrize("payload", [
    {"repo_url": "file:///etc"},
    {"repo_url": "https://evil.com/a/b"},
    {"repo_url": "local:../../etc"},
    {"repo_url": ""},
])
def test_invalid_input_is_rejected(client, payload):
    r = client.post("/api/v1/risk/repository", json=payload)
    assert r.status_code in (400, 422)


def test_missing_body_is_422(client):
    assert client.post("/api/v1/risk/repository", json={}).status_code == 422


def test_unknown_route_is_404(client):
    assert client.get("/api/v1/no-existe").status_code == 404


def test_api_key_enforced_when_configured(monkeypatch):
    from app import security
    from app.config import Settings
    monkeypatch.setattr(security, "get_settings", lambda: Settings(api_key="clave", repos_root=str(REPOS)))
    c = TestClient(create_app())
    assert c.get("/health").status_code == 200  # público
    assert c.post("/api/v1/risk/repository", json={"repo_url": REPO}).status_code == 401
