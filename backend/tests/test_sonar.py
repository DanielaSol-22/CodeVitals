import json
import threading
from http.server import BaseHTTPRequestHandler, HTTPServer

import pytest
from fastapi import HTTPException

from app.modules.sonar_client import SonarClient, SonarError
from app.routers import sonar


def _m(file, cc, loc, dup):
    return {"file": file, "code_metrics": {"cyclomatic_complexity": cc, "lines_of_code": loc, "duplication_percent": dup}}


class FakeSonar(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def do_GET(self):
        if self.path.startswith("/api/system/status"):
            body, code = {"status": "UP", "version": "10.6"}, 200
        elif not self.headers.get("Authorization", "").startswith("Basic "):
            body, code = {}, 401
        elif "missing" in self.path:
            body, code = {}, 404
        elif self.path.startswith("/api/measures/component_tree"):
            body = {"paging": {"total": 2}, "components": [
                {"path": "src/a.py", "measures": [{"metric": "complexity", "value": "7"}, {"metric": "ncloc", "value": "40"}]},
                {"path": "src/b.py", "measures": [{"metric": "complexity", "value": "2"}]}]}
            code = 200
        else:
            body = {"component": {"key": "demo", "name": "Demo", "measures": [{"metric": "bugs", "value": "3"}]}}
            code = 200
        data = json.dumps(body).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(data)


@pytest.fixture
def server():
    srv = HTTPServer(("127.0.0.1", 0), FakeSonar)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    yield f"http://127.0.0.1:{srv.server_port}"
    srv.shutdown()


def test_status_when_not_configured():
    st = SonarClient("", "").status()
    assert st["configured"] is False and st["reachable"] is False


def test_status_unreachable():
    st = SonarClient("http://127.0.0.1:1", "t", timeout=1).status()
    assert st["reachable"] is False and "error" in st


def test_status_reachable(server):
    st = SonarClient(server, "t").status()
    assert st["reachable"] and st["status"] == "UP"


def test_project_and_file_measures(server):
    c = SonarClient(server, "t")
    assert c.project_measures("demo")["measures"]["bugs"] == 3.0
    files = c.file_measures("demo")
    assert [f["path"] for f in files] == ["src/a.py", "src/b.py"]
    assert files[0]["measures"]["complexity"] == 7.0 and files[1]["measures"]["ncloc"] is None


def test_missing_project_and_bad_token(server):
    with pytest.raises(SonarError, match="no encontrado"):
        SonarClient(server, "t").project_measures("missing")
    with pytest.raises(SonarError, match="token"):
        SonarClient(server, "").project_measures("demo")


def test_match_files_by_suffix_and_exact():
    mods = [_m("a.py", 1, 1, 0), _m("pkg/src/b.py", 1, 1, 0), _m("other.py", 1, 1, 0)]
    sfiles = [{"path": "a.py", "measures": {}}, {"path": "src/b.py", "measures": {}}]
    pairs = sonar.match_files(mods, sfiles)
    assert [m["file"] for m, _ in pairs] == ["a.py", "pkg/src/b.py"]


def test_compare_metrics_correlates_and_guards():
    pairs = [(_m(f"f{i}.py", i, i * 10, 0), {"path": f"f{i}.py", "measures": {"complexity": i * 2, "ncloc": i * 9, "duplicated_lines_density": 0.0}}) for i in range(1, 8)]
    res = {r["metric"]: r for r in sonar.compare_metrics(pairs)}
    assert res["Complejidad ciclomática"]["rho"] == 1.0
    assert res["Duplicación"]["rho"] is None and "constante" in res["Duplicación"]["note"]
    few = sonar.compare_metrics(pairs[:2])
    assert all(r["rho"] is None for r in few)


def test_compare_requires_configuration(monkeypatch):
    import asyncio
    monkeypatch.setattr(sonar, "_client", lambda: SonarClient("", ""))
    with pytest.raises(HTTPException) as e:
        asyncio.run(sonar.sonar_compare(sonar.CompareRequest(repo_url="https://github.com/a/b", project_key="k")))
    assert e.value.status_code == 503
