from app.modules import metrics_calculator as mc


def _make_repo(tmp_path, n=45):
    for i in range(n):
        body = "\n".join(f"def f{i}_{j}(x):\n    if x:\n        return {j}\n    return 0\n" for j in range(1, 4 + i % 3))
        (tmp_path / f"m{i}.py").write_text(body)
    (tmp_path / "copy1.py").write_text((tmp_path / "m0.py").read_text())
    return str(tmp_path)


def _key(res):
    return {f["file"]: (f["loc"], f["complexity"], f["duplication_percent"]) for f in res["files"]}


def test_parallel_and_sequential_give_same_metrics(tmp_path, monkeypatch):
    repo = _make_repo(tmp_path)
    monkeypatch.setattr(mc, "PARALLEL_MIN_FILES", 10**9)
    seq = mc.MetricsCalculator().analyze_repository(repo)
    monkeypatch.setattr(mc, "PARALLEL_MIN_FILES", 2)
    par = mc.MetricsCalculator().analyze_repository(repo)
    assert _key(seq) == _key(par)
    assert seq["files_analyzed"] == par["files_analyzed"] == 46
    assert all("_blocks" not in f for f in par["files"])
    assert any(v[2] > 0 for v in _key(par).values())  # copy1.py duplica m0.py
