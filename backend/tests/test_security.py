import os

import pytest
from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app import schemas, security
from app.config import Settings


@pytest.fixture
def root(tmp_path, monkeypatch):
    """Carpeta de repositorios aislada para cada prueba."""
    repos = tmp_path / "repos"
    repos.mkdir()
    settings = Settings(repos_root=str(repos), api_key="")
    monkeypatch.setattr(security, "get_settings", lambda: settings)
    return repos


@pytest.mark.parametrize("url,expected", [
    ("https://github.com/Delgan/loguru", "https://github.com/Delgan/loguru"),
    ("https://github.com/Delgan/loguru.git", "https://github.com/Delgan/loguru"),
    ("  https://GitHub.com/pallets/itsdangerous/ ", "https://github.com/pallets/itsdangerous"),
    ("https://gitlab.com/grp/proj", "https://gitlab.com/grp/proj"),
])
def test_valid_repo_urls(root, url, expected):
    assert security.validate_repo_url(url) == expected


@pytest.mark.parametrize("url", [
    "file:///etc/passwd", "/etc/passwd", "../repo", "ssh://git@github.com/a/b", "git@github.com:a/b.git",
    "http://github.com/a/b", "ext::sh -c touch% /tmp/pwn", "--upload-pack=touch /tmp/x",
    "https://user:pw@github.com/a/b", "https://github.com:8443/a/b", "https://evil.com/a/b",
    "https://github.com.evil.com/a/b", "https://github.com/a", "https://github.com/a/b/c",
    "https://github.com/a/b?x=1", "https://github.com/a/b#f", "https://github.com/../b", "https://github.com/a/b c",
    "", "   ", "https://github.com/" + "a" * 300 + "/b", "http://127.0.0.1/a/b", "http://169.254.169.254/a/b",
])
def test_rejected_repo_urls(root, url):
    with pytest.raises(ValueError):
        security.validate_repo_url(url)


def test_repo_path_must_stay_inside_root(root):
    assert security.validate_repo_path(None) is None
    inside = root / "loguru"
    inside.mkdir()
    assert security.validate_repo_path(str(inside)) == os.path.realpath(inside)
    assert security.validate_repo_path("loguru") == os.path.realpath(inside)  # relativa a la raíz
    for bad in ["/etc", "../outside", str(root / ".." / "x"), "/", "loguru/../../x", "a\x00b"]:
        with pytest.raises(ValueError):
            security.validate_repo_path(bad)


def test_repo_path_blocks_symlink_escape(root, tmp_path):
    outside = tmp_path / "secret"
    outside.mkdir()
    link = root / "link"
    os.symlink(outside, link)
    with pytest.raises(ValueError):
        security.validate_repo_path(str(link))


@pytest.mark.parametrize("bad", ["../../etc/passwd", "/etc/passwd", "C:\\Windows\\win.ini", "a/../../b", "", "a\x00b", "..\\x"])
def test_relative_file_rejects_traversal(bad):
    with pytest.raises(ValueError):
        security.validate_relative_file(bad)


def test_safe_join(tmp_path):
    base = tmp_path / "repo"
    (base / "src").mkdir(parents=True)
    assert security.safe_join(str(base), "src/a.py") == os.path.realpath(base / "src" / "a.py")
    with pytest.raises(ValueError):
        security.safe_join(str(base), "../x.py")
    outside = tmp_path / "secret"
    outside.mkdir()
    os.symlink(outside, base / "escape")
    with pytest.raises(ValueError):
        security.safe_join(str(base), "escape/passwd")


def test_request_schemas_reject_malicious_input(root):
    with pytest.raises(ValidationError):
        schemas.RiskRepositoryRequest(repo_url="file:///etc")
    with pytest.raises(ValidationError):
        schemas.RiskRepositoryRequest(repo_url="https://github.com/a/b", repo_path="/etc")
    with pytest.raises(ValidationError):
        schemas.RiskRepositoryRequest(repo_url="https://github.com/a/b", limit=100000)
    with pytest.raises(ValidationError):
        schemas.RiskModuleRequest(repo_url="https://github.com/a/b", file_path="../../etc/passwd")
    with pytest.raises(ValidationError):
        schemas.RepoMetricsRequest(repo_path="/etc")
    with pytest.raises(ValidationError):
        schemas.FileRequest(file_path="/etc/passwd")
    ok = schemas.RiskRepositoryRequest(repo_url="https://github.com/a/b.git")
    assert ok.repo_url == "https://github.com/a/b" and ok.repo_path is None


def test_multi_stats_validates_every_url(root):
    from app.routers.statistics import MultiStatsRequest
    with pytest.raises(ValidationError):
        MultiStatsRequest(repo_urls=["https://github.com/a/b", "file:///etc/passwd"])
    m = MultiStatsRequest(repo_urls=["https://github.com/a/b", "https://github.com/a/b.git"])
    assert m.repo_urls == ["https://github.com/a/b"]


def test_api_key_dependency(monkeypatch):
    app = FastAPI()

    @app.get("/x", dependencies=[Depends(security.require_api_key)])
    def x():
        return {"ok": True}

    client = TestClient(app)
    monkeypatch.setattr(security, "get_settings", lambda: Settings(api_key=""))
    assert client.get("/x").status_code == 200  # sin API key configurada: abierto
    monkeypatch.setattr(security, "get_settings", lambda: Settings(api_key="secreta"))
    assert client.get("/x").status_code == 401
    assert client.get("/x", headers={"X-API-Key": "mala"}).status_code == 401
    assert client.get("/x", headers={"X-API-Key": "secreta"}).status_code == 200


def test_endpoints_reject_traversal_over_http(root):
    from app.main import create_app
    client = TestClient(create_app())
    r = client.post("/api/v1/metrics/file", json={"file_path": "/etc/passwd"})
    assert r.status_code == 422
    r = client.post("/api/v1/metrics/repository", json={"repo_path": "/"})
    assert r.status_code == 422
    r = client.post("/api/v1/risk/module", json={"repo_url": "https://github.com/a/b", "file_path": "../../etc/passwd"})
    assert r.status_code == 422
    r = client.post("/api/v1/risk/repository", json={"repo_url": "file:///etc"})
    assert r.status_code == 422
    r = client.get("/api/v1/analyze/repository/x/churn/..%2F..%2Fetc%2Fpasswd", params={"repo_url": "https://github.com/a/b"})
    assert r.status_code in (404, 422)
    assert client.get("/health").status_code == 200  # el health check queda público


def _init_repo(path):
    import subprocess
    path.mkdir()
    env = {"GIT_AUTHOR_NAME": "a", "GIT_AUTHOR_EMAIL": "a@a", "GIT_COMMITTER_NAME": "a",
           "GIT_COMMITTER_EMAIL": "a@a", "PATH": os.environ["PATH"], "HOME": str(path)}
    subprocess.run(["git", "init", "-q"], cwd=path, check=True, env=env)
    (path / "a.py").write_text("def f(x):\n    if x:\n        return 1\n    return 2\n")
    subprocess.run(["git", "add", "."], cwd=path, check=True, env=env)
    subprocess.run(["git", "commit", "-q", "-m", "one"], cwd=path, check=True, env=env)


def test_local_repository_reference(root):
    _init_repo(root / "mi-proyecto")
    assert security.validate_repo_url("local:mi-proyecto") == "local:mi-proyecto"
    for bad in ["local:no-existe", "local:../x", "local:a/b", "local:", "local:.."]:
        with pytest.raises(ValueError):
            security.validate_repo_url(bad)
    (root / "sin-git").mkdir()
    with pytest.raises(ValueError, match="Clónelo"):
        security.validate_repo_url("local:sin-git")


def test_local_repository_is_analyzed_without_network(root):
    from app.routers import risk
    _init_repo(root / "mi-proyecto")
    mods, git, total = risk._analyze_all_modules("local:mi-proyecto", str(root))
    assert [m["file"] for m in mods] == ["a.py"] and total == 1
    assert git.head_sha()
