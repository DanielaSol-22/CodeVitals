"""
Validaciones de seguridad de entrada.

La API clona repositorios y lee archivos del servidor, por lo que NUNCA debe
aceptar tal cual lo que envia el cliente:
  - repo_url: solo https y solo hosts permitidos (GitHub, GitLab, Bitbucket).
    Bloquea file://, ssh://, ext::, rutas locales, credenciales en la URL y
    opciones de git disfrazadas de URL (por ejemplo, que empiecen con '-').
  - repo_path / rutas de archivo: deben quedar dentro de la carpeta de
    repositorios (REPOS_ROOT). Bloquea rutas absolutas y '..' (path traversal).
  - API key opcional (X-API-Key) para proteger todos los endpoints.
"""
import hmac
import os
import re
from urllib.parse import urlsplit

from fastapi import Header, HTTPException

from app.config import get_settings

MAX_URL_LENGTH = 300
_SEGMENT = re.compile(r"^[A-Za-z0-9._-]{1,100}$")
LOCAL_PREFIX = "local:"


def validate_repo_url(url: str) -> str:
    """Devuelve la URL normalizada o lanza ValueError."""
    if not isinstance(url, str):
        raise ValueError("La URL del repositorio no es válida.")
    url = url.strip()
    if not url or len(url) > MAX_URL_LENGTH or any(c.isspace() or ord(c) < 32 for c in url):
        raise ValueError("La URL del repositorio no es válida.")
    if url.lower().startswith(LOCAL_PREFIX):
        return validate_local_repo(url)
    parts = urlsplit(url)
    if parts.scheme != "https":
        raise ValueError("Solo se permiten repositorios por https.")
    if parts.username or parts.password or "@" in parts.netloc or parts.port is not None:
        raise ValueError("La URL no puede incluir credenciales ni puerto.")
    if parts.query or parts.fragment:
        raise ValueError("La URL no puede incluir parámetros.")
    host = (parts.hostname or "").lower()
    allowed = [h.strip().lower() for h in get_settings().allowed_repo_hosts if h.strip()]
    if host not in allowed:
        raise ValueError(f"Host no permitido. Hosts permitidos: {', '.join(allowed)}.")
    segments = [s for s in parts.path.split("/") if s]
    if len(segments) != 2 or not all(_SEGMENT.match(s) for s in segments) or any(s in (".", "..") for s in segments):
        raise ValueError("La URL debe tener la forma https://host/propietario/repositorio.")
    owner, repo = segments
    repo = repo[:-4] if repo.endswith(".git") else repo
    if not repo:
        raise ValueError("La URL debe tener la forma https://host/propietario/repositorio.")
    return f"https://{host}/{owner}/{repo}"


def validate_local_repo(ref: str) -> str:
    """Repositorio ya clonado por la usuaria: 'local:<carpeta>' dentro de REPOS_ROOT.
    Sirve para repositorios privados o proyectos que solo existen en disco:
    la API no necesita credenciales porque nunca los descarga."""
    name = ref[len(LOCAL_PREFIX):]
    if not _SEGMENT.match(name) or name in (".", ".."):
        raise ValueError("Use local:<carpeta>, con la carpeta dentro de repos/.")
    folder = os.path.realpath(os.path.join(repos_root(), name))
    if not _inside(repos_root(), folder) or not os.path.isdir(os.path.join(folder, ".git")):
        raise ValueError(f"No existe un repositorio Git en repos/{name}. Clónelo allí primero.")
    return f"{LOCAL_PREFIX}{name}"


def is_local_ref(url: str) -> bool:
    return isinstance(url, str) and url.startswith(LOCAL_PREFIX)


def repos_root() -> str:
    return os.path.realpath(get_settings().repos_root)


def _inside(root: str, path: str) -> bool:
    try:
        return os.path.commonpath([root, path]) == root
    except ValueError:  # discos distintos en Windows
        return False


def validate_repo_path(path: str | None) -> str | None:
    """repo_path debe ser una carpeta dentro de REPOS_ROOT (o None)."""
    if path is None or path == "":
        return None
    if "\x00" in path:
        raise ValueError("Ruta no válida.")
    root = repos_root()
    resolved = os.path.realpath(path if os.path.isabs(path) else os.path.join(root, path))
    if not _inside(root, resolved):
        raise ValueError("La ruta debe estar dentro de la carpeta de repositorios.")
    return resolved


def validate_local_file(path: str) -> str:
    """Ruta de archivo local: debe existir dentro de REPOS_ROOT."""
    resolved = validate_repo_path(path)
    if resolved is None:
        raise ValueError("Ruta no válida.")
    return resolved


def validate_relative_file(path: str) -> str:
    """Ruta relativa dentro de un repositorio: sin '..', sin absolutas."""
    if not isinstance(path, str) or not path.strip() or "\x00" in path or len(path) > 500:
        raise ValueError("Ruta de archivo no válida.")
    norm = path.replace("\\", "/")
    if norm.startswith("/") or re.match(r"^[A-Za-z]:", norm) or ".." in norm.split("/"):
        raise ValueError("La ruta del archivo debe ser relativa al repositorio.")
    return norm


def safe_join(base: str, relative: str) -> str:
    """Une base + ruta relativa garantizando que el resultado queda dentro de base."""
    base_real = os.path.realpath(base)
    full = os.path.realpath(os.path.join(base_real, validate_relative_file(relative)))
    if not _inside(base_real, full):
        raise ValueError("La ruta del archivo sale del repositorio.")
    return full


def require_api_key(x_api_key: str | None = Header(default=None)) -> None:
    """Si API_KEY está configurada, exige el encabezado X-API-Key."""
    expected = get_settings().api_key
    if not expected:
        return
    if not x_api_key or not hmac.compare_digest(x_api_key.encode(), expected.encode()):
        raise HTTPException(status_code=401, detail="API key inválida o ausente.")
