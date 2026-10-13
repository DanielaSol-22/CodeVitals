"""
Analizador de repositorios Git usando PyDriller
Extrae commits, autores, cambios y código churn
"""
from pydriller import Repository
from datetime import datetime
import os
import re
import subprocess
import threading
from collections import defaultdict
from typing import Dict, List, Any, Optional


class GitAnalyzer:
    """Analiza repositorios Git para extraer métricas históricas"""
    
    def __init__(self, repo_url: str, repo_path: str = None):
        """
        Inicializa el analizador Git
        
        Args:
            repo_url: URL del repositorio Git
            repo_path: Ruta local del repositorio (opcional)
        """
        self.repo_url = repo_url
        self.repo_path = repo_path or self._get_default_path(repo_url)
        # PyDriller exige que clone_repo_to ya exista como directorio
        # (el crea el la subcarpeta del repo adentro automaticamente).
        os.makedirs(self.repo_path, exist_ok=True)

    def _get_default_path(self, url: str) -> str:
        """Carpeta base donde PyDriller clonara los repositorios."""
        return "./repos"
    
    def analyze_repository(self) -> Dict[str, Any]:
        """
        Analiza un repositorio Git completo
        Retorna: commits totales, autores, cambios por archivo, etc.
        """
        try:
            repo = Repository(self._ensure_cloned() if self.is_local() else self.repo_url, clone_repo_to=self.repo_path)
            
            commits = []
            authors = set()
            files_changed = {}
            
            for commit in repo.traverse_commits():
                commits.append({
                    'hash': commit.hash,
                    'author': commit.author.name,
                    'date': commit.committer_date,
                    'message': commit.msg,
                    'files': commit.files
                })
                authors.add(commit.author.name)
                
                # Contar cambios por archivo
                for file in commit.modified_files:
                    if file.filename not in files_changed:
                        files_changed[file.filename] = {
                            'additions': 0,
                            'deletions': 0,
                            'changes': 0
                        }
                    files_changed[file.filename]['additions'] += file.added_lines
                    files_changed[file.filename]['deletions'] += file.deleted_lines
                    files_changed[file.filename]['changes'] += 1
            
            return {
                'total_commits': len(commits),
                'total_authors': len(authors),
                'authors': list(authors),
                'commits': commits,
                'files_changed': files_changed,
                'date_range': {
                    'first_commit': commits[-1]['date'] if commits else None,
                    'last_commit': commits[0]['date'] if commits else None
                }
            }
        
        except Exception as e:
            return {
                'error': str(e),
                'message': 'Error analizando repositorio'
            }
    
    # ------------------------------------------------------------------
    # Historial Git en UNA sola pasada (rapido)
    #
    # Antes, bus factor y churn recorrian el historial con PyDriller (que
    # calcula el diff de cada commit en Python, una vez para el bus factor y
    # otra para el churn). Ahora se hace UNA llamada a `git log --numstat`,
    # que entrega commits, autores y lineas cambiadas por archivo en una sola
    # lectura, y de ahi salen ambas metricas. Resultado: de segundos/minutos
    # a fracciones de segundo, sobre todo en Docker con volumenes de Windows.
    # ------------------------------------------------------------------
    _HISTORY_CACHE: Dict[tuple, dict] = {}
    _CLONE_LOCKS: Dict[str, threading.Lock] = {}
    _LOCKS_GUARD = threading.Lock()

    def is_local(self) -> bool:
        """Repositorio ya presente en disco ('local:<carpeta>'): nunca se descarga."""
        return self.repo_url.startswith("local:")

    def _repo_name(self) -> str:
        if self.is_local():
            return self.repo_url[len("local:"):]
        return self.repo_url.rstrip("/").split("/")[-1].replace(".git", "")

    def _local_dir(self) -> str:
        """Carpeta del clon (la misma que usa MetricsCalculator)."""
        if os.path.isdir(self.repo_url):  # URL que en realidad es una carpeta local
            return self.repo_url
        return os.path.join(self.repo_path, self._repo_name())

    def _ensure_cloned(self) -> str:
        dest = self._local_dir()
        if os.path.isdir(os.path.join(dest, ".git")):
            return dest
        with GitAnalyzer._LOCKS_GUARD:
            lock = GitAnalyzer._CLONE_LOCKS.setdefault(dest, threading.Lock())
        with lock:
            if not os.path.isdir(os.path.join(dest, ".git")):
                os.makedirs(self.repo_path, exist_ok=True)
                try:
                    subprocess.run(
                        ["git", "clone", "--quiet", self.repo_url, dest],
                        check=True, capture_output=True, text=True,
                        # sin esto, un repo privado/inexistente pide usuario y se queda colgado
                        env={**os.environ, "GIT_TERMINAL_PROMPT": "0"},
                    )
                except subprocess.CalledProcessError as e:
                    raise RuntimeError(
                        "No se pudo clonar el repositorio (privado, inexistente o sin acceso): "
                        + (e.stderr or "").strip()[:200]
                    ) from e
        return dest

    _RENAME_BRACES = re.compile(r"\{[^{}]* => ([^{}]*)\}")

    @classmethod
    def _final_path(cls, path: str) -> str:
        """numstat muestra renombres como 'dir/{viejo => nuevo}/f.py' o 'viejo => nuevo';
        nos quedamos con la ruta nueva."""
        if " => " not in path:
            return path
        if "{" in path:
            path = cls._RENAME_BRACES.sub(r"\1", path).replace("//", "/")
            return path
        return path.split(" => ", 1)[1]

    def head_sha(self) -> str:
        """Commit HEAD del clon local (clona si hace falta). Sirve para invalidar cachés."""
        dest = self._ensure_cloned()
        return subprocess.run(["git", "rev-parse", "HEAD"], cwd=dest, check=True,
                              capture_output=True, text=True).stdout.strip()

    def _history(self) -> dict:
        """Devuelve (y cachea por commit HEAD) los agregados del historial."""
        cached = getattr(self, "_hist", None)
        if cached is not None:
            return cached

        dest = self._ensure_cloned()
        head = subprocess.run(["git", "rev-parse", "HEAD"], cwd=dest, check=True,
                              capture_output=True, text=True).stdout.strip()
        key = (os.path.abspath(dest), head)
        if key in GitAnalyzer._HISTORY_CACHE:
            self._hist = GitAnalyzer._HISTORY_CACHE[key]
            return self._hist

        out = subprocess.run(
            ["git", "-c", "core.quotepath=false", "log", "--numstat", "-M",
             "--format=@@%x1f%an", "HEAD"],
            cwd=dest, check=True, capture_output=True, text=True,
            encoding="utf-8", errors="replace",
        ).stdout

        author_commits: Dict[str, int] = defaultdict(int)
        author_files: Dict[str, set] = defaultdict(set)
        by_path: Dict[str, Dict[str, int]] = {}
        by_name: Dict[str, Dict[str, int]] = {}
        file_authors_path: Dict[str, Dict[str, int]] = {}
        file_authors_name: Dict[str, Dict[str, int]] = {}
        author: Optional[str] = None

        def _acc(index, k, added, deleted):
            e = index.setdefault(k, {"commits": 0, "added": 0, "deleted": 0})
            e["commits"] += 1
            e["added"] += added
            e["deleted"] += deleted

        for line in out.splitlines():
            if line.startswith("@@\x1f"):
                author = line[3:]
                author_commits[author] += 1
                continue
            if not line.strip() or author is None:
                continue
            parts = line.split("\t", 2)
            if len(parts) != 3:
                continue
            a, d, path = parts
            added = int(a) if a.isdigit() else 0      # archivos binarios: "-"
            deleted = int(d) if d.isdigit() else 0
            path = self._final_path(path)
            name = os.path.basename(path)
            author_files[author].add(name)
            _acc(by_name, name, added, deleted)
            norm = path.replace("\\", "/")
            _acc(by_path, norm, added, deleted)
            for idx, k in ((file_authors_path, norm), (file_authors_name, name)):
                d = idx.setdefault(k, {})
                d[author] = d.get(author, 0) + 1

        hist = {"author_commits": dict(author_commits), "author_files": dict(author_files),
                "by_path": by_path, "by_name": by_name,
                "file_authors_path": file_authors_path, "file_authors_name": file_authors_name}
        GitAnalyzer._HISTORY_CACHE[key] = hist
        self._hist = hist
        return hist

    def calculate_code_churn(self, file_path: str) -> Dict[str, Any]:
        """
        Calcula el churn (cambios) de un archivo específico
        Retorna: total de cambios, líneas añadidas, líneas eliminadas
        """
        try:
            h = self._history()
            key = file_path.replace("\\", "/")
            e = h["by_path"].get(key) or h["by_name"].get(key) \
                or h["by_name"].get(os.path.basename(key)) \
                or {"commits": 0, "added": 0, "deleted": 0}

            return {
                'file': file_path,
                'total_changes': e["commits"],
                'additions': e["added"],
                'deletions': e["deleted"],
                'total_churn': e["added"] + e["deleted"]
            }

        except Exception as e:
            return {
                'error': str(e),
                'file': file_path
            }

    def calculate_file_bus_factor(self, file_path: str) -> Dict[str, Any]:
        """
        Bus factor de UN archivo: porcentaje de los commits del archivo que hizo
        su autor principal (mismo criterio que el bus factor del repositorio,
        pero aplicado al archivo). 100 = una sola persona conoce el archivo.
        """
        try:
            h = self._history()
            key = file_path.replace("\\", "/")
            authors = h["file_authors_path"].get(key) or h["file_authors_name"].get(key) \
                or h["file_authors_name"].get(os.path.basename(key)) or {}
            total = sum(authors.values())
            if total == 0:
                return {"file": file_path, "commits": 0, "authors": 0,
                        "top_author": None, "risk_percentage": None}
            top = max(authors, key=authors.get)
            return {
                "file": file_path,
                "commits": total,
                "authors": len(authors),
                "top_author": top,
                "risk_percentage": round(authors[top] / total * 100, 2),
            }
        except Exception as e:
            return {"error": str(e), "file": file_path}

    def calculate_bus_factor(self) -> Dict[str, Any]:
        """
        Calcula el Bus Factor (factor de colisión)
        Identifica el riesgo si un desarrollador clave se va
        """
        try:
            h = self._history()
            author_commits = h["author_commits"]
            author_files = h["author_files"]

            total_commits = sum(author_commits.values())
            total_files = len(set().union(*author_files.values())) if author_files else 0

            # Calcular riesgo: porcentaje de commits del autor principal
            if author_commits:
                top_author = max(author_commits, key=author_commits.get)
                risk_percentage = (author_commits[top_author] / total_commits * 100) if total_commits > 0 else 0
            else:
                top_author = None
                risk_percentage = 0

            return {
                'total_authors': len(author_commits),
                'total_commits': total_commits,
                'total_files': total_files,
                'top_author': top_author,
                'top_author_commits': author_commits.get(top_author, 0),
                'risk_percentage': round(risk_percentage, 2),
                'author_distribution': author_commits
            }

        except Exception as e:
            return {
                'error': str(e),
                'message': 'Error calculando bus factor'
            }
