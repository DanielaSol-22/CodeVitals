"""
Analizador de repositorios Git usando PyDriller
Extrae commits, autores, cambios y código churn
"""
from pydriller import Repository
from datetime import datetime
import os
from typing import Dict, List, Any


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
    
    def _get_default_path(self, url: str) -> str:
        """Obtiene la ruta por defecto para clonar"""
        repo_name = url.split('/')[-1].replace('.git', '')
        return f"./repos/{repo_name}"
    
    def analyze_repository(self) -> Dict[str, Any]:
        """
        Analiza un repositorio Git completo
        Retorna: commits totales, autores, cambios por archivo, etc.
        """
        try:
            repo = Repository(self.repo_url, clone_repo_to=self.repo_path)
            
            commits = []
            authors = set()
            files_changed = {}
            
            for commit in repo.traverse_commits():
                commits.append({
                    'hash': commit.hash,
                    'author': commit.author.name,
                    'date': commit.commit_date,
                    'message': commit.msg,
                    'files': len(commit.files)
                })
                authors.add(commit.author.name)
                
                # Contar cambios por archivo
                for file in commit.files:
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
    
    def calculate_code_churn(self, file_path: str) -> Dict[str, Any]:
        """
        Calcula el churn (cambios) de un archivo específico
        Retorna: total de cambios, líneas añadidas, líneas eliminadas
        """
        try:
            repo = Repository(self.repo_url, clone_repo_to=self.repo_path)
            
            total_additions = 0
            total_deletions = 0
            commits_touching_file = 0
            
            for commit in repo.traverse_commits():
                for file in commit.files:
                    if file.filename == file_path:
                        total_additions += file.added_lines
                        total_deletions += file.deleted_lines
                        commits_touching_file += 1
            
            return {
                'file': file_path,
                'total_changes': commits_touching_file,
                'additions': total_additions,
                'deletions': total_deletions,
                'total_churn': total_additions + total_deletions
            }
        
        except Exception as e:
            return {
                'error': str(e),
                'file': file_path
            }
    
    def calculate_bus_factor(self) -> Dict[str, Any]:
        """
        Calcula el Bus Factor (factor de colisión)
        Identifica el riesgo si un desarrollador clave se va
        """
        try:
            repo = Repository(self.repo_url, clone_repo_to=self.repo_path)
            
            author_commits = {}
            author_files = {}
            
            for commit in repo.traverse_commits():
                author = commit.author.name
                
                if author not in author_commits:
                    author_commits[author] = 0
                    author_files[author] = set()
                
                author_commits[author] += 1
                
                for file in commit.files:
                    author_files[author].add(file.filename)
            
            total_commits = sum(author_commits.values())
            total_files = len(set().union(*author_files.values()))
            
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
