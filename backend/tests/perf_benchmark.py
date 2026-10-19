"""
Medición de RENDIMIENTO de CodeVitals (no es parte de pytest: se ejecuta a mano).
Mide el tiempo de análisis completo (PyDriller + Lizard + riesgo) por repositorio, en frío
(sin caché) y en caliente (con caché por HEAD), y la concurrencia con 3 análisis simultáneos.
Uso:  python tests/perf_benchmark.py repo1 repo2 ...     (carpetas dentro de repos/)
"""
import json, os, pathlib, statistics, sys, time, platform
from concurrent.futures import ThreadPoolExecutor

ROOT = pathlib.Path(__file__).resolve().parents[1]
os.environ["REPOS_ROOT"] = str(ROOT / "repos")
sys.path.insert(0, str(ROOT))
from app.routers import risk  # noqa: E402


def run(name):
    t = time.perf_counter()
    mods, _, commits = risk._analyze_all_modules(f"local:{name}", None)
    return time.perf_counter() - t, len(mods), commits


def main(names):
    rows = []
    for n in names:
        risk._ANALYSIS_CACHE.clear()
        cold, mods, commits = run(n)
        warm = [run(n)[0] for _ in range(5)]
        rows.append({"repo": n, "modules": mods, "commits": commits, "cold_s": round(cold, 3),
                     "warm_ms": round(statistics.mean(warm) * 1000, 2), "ms_per_module": round(cold / max(mods, 1) * 1000, 1)})
        print(rows[-1], flush=True)
    risk._ANALYSIS_CACHE.clear()
    t = time.perf_counter()
    with ThreadPoolExecutor(3) as ex:
        list(ex.map(run, names[:3]))
    conc = round(time.perf_counter() - t, 3)
    seq = round(sum(r["cold_s"] for r in rows[:3]), 3)
    out = {"python": platform.python_version(), "cpu_count": os.cpu_count(), "rows": rows,
           "concurrent3_s": conc, "sequential3_s": seq, "started": time.strftime("%Y-%m-%d %H:%M:%S")}
    (ROOT / "perf_resultado.json").write_text(json.dumps(out, indent=2))
    print(json.dumps(out, indent=2))


if __name__ == "__main__":
    main(sys.argv[1:] or ["Hello-World", "prettytable", "itsdangerous", "cleo", "loguru", "requests"])
