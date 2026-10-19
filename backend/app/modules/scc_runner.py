"""scc (Sloc, Cloc and Code): contador independiente de lineas y complejidad para mas de 200 lenguajes."""
import json
import os
import shutil
import subprocess

SCC_TIMEOUT = 120


def scc_available() -> bool:
    return shutil.which("scc") is not None


def run_scc(directory: str) -> dict[str, dict]:
    """Ejecuta scc por archivo. Devuelve {ruta absoluta: {"complexity": int, "code": int}}."""
    out = subprocess.run(
        ["scc", "--by-file", "--format", "json", "--no-cocomo", directory],
        capture_output=True, text=True, timeout=SCC_TIMEOUT, check=True,
    ).stdout
    result: dict[str, dict] = {}
    for lang in json.loads(out):
        for f in lang.get("Files", []):
            path = os.path.normcase(os.path.abspath(f["Location"]))
            result[path] = {"complexity": int(f.get("Complexity", 0)), "code": int(f.get("Code", 0))}
    return result
