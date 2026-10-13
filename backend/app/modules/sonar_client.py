"""
Cliente de SonarQube (apoyo).

SonarQube NO reemplaza el motor de riesgo de CodeVitals: se usa como fuente
complementaria para contrastar las metricas propias (complejidad, tamano y
duplicacion) y para aportar indicadores que el motor no calcula (code smells,
bugs, vulnerabilidades y deuda tecnica). Solo lee resultados ya analizados por
SonarQube; el escaneo lo hace sonar-scanner (ver docker-compose.yml).
"""
import base64
import json
import urllib.error
import urllib.parse
import urllib.request
from typing import Any

MEASURES = [
    "ncloc", "complexity", "cognitive_complexity", "duplicated_lines_density",
    "code_smells", "bugs", "vulnerabilities", "sqale_index",
]
PAGE_SIZE = 500
MAX_PAGES = 20


class SonarError(Exception):
    """Error al consultar SonarQube (no configurado, inalcanzable o respuesta invalida)."""


class SonarClient:
    def __init__(self, base_url: str, token: str, timeout: float = 15.0):
        self.base_url = (base_url or "").rstrip("/")
        self.token = token or ""
        self.timeout = timeout

    @property
    def configured(self) -> bool:
        return bool(self.base_url and self.token)

    def _get(self, path: str, params: dict[str, Any] | None = None) -> dict:
        if not self.base_url:
            raise SonarError("SonarQube no esta configurado (SONAR_URL vacio).")
        url = f"{self.base_url}{path}"
        if params:
            url += "?" + urllib.parse.urlencode(params)
        req = urllib.request.Request(url)
        if self.token:
            auth = base64.b64encode(f"{self.token}:".encode()).decode()
            req.add_header("Authorization", f"Basic {auth}")
        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            if e.code in (401, 403):
                raise SonarError("SonarQube rechazo el token (SONAR_TOKEN).") from e
            if e.code == 404:
                raise SonarError("Proyecto no encontrado en SonarQube; ejecuta primero el escaneo.") from e
            raise SonarError(f"SonarQube respondio con error {e.code}.") from e
        except (urllib.error.URLError, TimeoutError, OSError) as e:
            raise SonarError(f"No se pudo conectar con SonarQube en {self.base_url}.") from e
        except ValueError as e:
            raise SonarError("Respuesta invalida de SonarQube.") from e

    def status(self) -> dict:
        """Estado del servidor: configurado, alcanzable y listo."""
        info = {"configured": self.configured, "url": self.base_url or None, "reachable": False, "status": None}
        if not self.base_url:
            return info
        try:
            data = self._get("/api/system/status")
            info["reachable"] = True
            info["status"] = data.get("status")
            info["version"] = data.get("version")
        except SonarError as e:
            info["error"] = str(e)
        return info

    @staticmethod
    def _to_number(value: Any) -> float | None:
        try:
            return float(value)
        except (TypeError, ValueError):
            return None

    @classmethod
    def _measures_dict(cls, measures: list[dict]) -> dict[str, float | None]:
        out = {m: None for m in MEASURES}
        for item in measures or []:
            if item.get("metric") in out:
                out[item["metric"]] = cls._to_number(item.get("value"))
        return out

    def project_measures(self, project_key: str) -> dict:
        data = self._get("/api/measures/component", {"component": project_key, "metricKeys": ",".join(MEASURES)})
        comp = data.get("component", {})
        return {"project_key": comp.get("key", project_key), "name": comp.get("name"),
                "measures": self._measures_dict(comp.get("measures", []))}

    def file_measures(self, project_key: str) -> list[dict]:
        """Medidas por archivo: [{'path': 'src/a.py', 'measures': {...}}]."""
        files: list[dict] = []
        for page in range(1, MAX_PAGES + 1):
            data = self._get("/api/measures/component_tree", {
                "component": project_key, "qualifiers": "FIL", "metricKeys": ",".join(MEASURES),
                "ps": PAGE_SIZE, "p": page})
            for c in data.get("components", []):
                if c.get("path"):
                    files.append({"path": c["path"].replace("\\", "/"), "measures": self._measures_dict(c.get("measures", []))})
            total = data.get("paging", {}).get("total", 0)
            if page * PAGE_SIZE >= total:
                break
        return files
