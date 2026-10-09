"""
Calculador de Métricas de Código usando Lizard
Extrae complejidad ciclomática, LOC, parámetros, etc.
"""
import hashlib
import lizard
import os
from typing import Dict, List, Any


class MetricsCalculator:
    """Calcula métricas de código usando Lizard"""

    # Extensiones de archivo soportadas
    SUPPORTED_EXTENSIONS = {
        '.py': 'Python',
        '.js': 'JavaScript',
        '.ts': 'TypeScript',
        '.java': 'Java',
        '.cs': 'C#',
        '.cpp': 'C++',
        '.c': 'C',
        '.go': 'Go',
        '.rb': 'Ruby',
        '.php': 'PHP',
        '.swift': 'Swift',
        '.kt': 'Kotlin',
    }

    # Umbrales de deficiencia
    THRESHOLDS = {
        'cyclomatic_complexity_high': 10,
        'cyclomatic_complexity_critical': 15,
        'loc_long_method': 50,
        'parameters_too_many': 5
    }

    # Deteccion de duplicacion: bloques de N lineas normalizadas consecutivas.
    # Un detector tipo "clones exactos" (Type-1), suficiente para el proposito
    # de la formula de riesgo sin depender de una herramienta externa.
    DUP_BLOCK_SIZE = 6

    def __init__(self, repo_path: str = None):
        """
        Inicializa el calculador de métricas

        Args:
            repo_path: Ruta del repositorio a analizar (opcional)
        """
        self.repo_path = repo_path

    def analyze_file(self, file_path: str) -> Dict[str, Any]:
        """
        Analiza un archivo individual
        Retorna: complejidad, LOC, funciones, etc.
        """
        try:
            # Verificar extensión
            _, ext = os.path.splitext(file_path)
            if ext not in self.SUPPORTED_EXTENSIONS:
                return {
                    'error': f'Extensión no soportada: {ext}',
                    'file': file_path
                }

            # Verificar que el archivo existe
            if not os.path.exists(file_path):
                return {
                    'error': f'Archivo no encontrado: {file_path}',
                    'file': file_path
                }

            # Usar Lizard para análisis (Lizard 1.17.10)
            try:
                result = lizard.analyze_file(file_path)
            except Exception as lizard_error:
                return {
                    'error': f'Lizard error: {str(lizard_error)}',
                    'file': file_path,
                    'message': f'No se pudo analizar {file_path}'
                }

            functions = []
            total_complexity = 0

            # Procesar funciones (Lizard usa function_list)
            for func in result.function_list:
                complexity = func.cyclomatic_complexity
                total_complexity += complexity
                parameters_count = len(func.parameters) if hasattr(func, 'parameters') else 0

                functions.append({
                    'name': func.name,
                    'cyclomatic_complexity': complexity,
                    'lines': func.nloc,
                    'parameters': parameters_count
                })

            # Calcular deficiencias (lista de dicts: type/function/severity/value)
            deficiencies = self._detect_deficiencies(result.function_list)

            # Duplicacion dentro del propio archivo (fallback cuando se analiza
            # un solo archivo sin contexto del resto del repositorio).
            duplication_percent = self._file_duplication_percent(file_path)

            return {
                'file': file_path,
                'language': self.SUPPORTED_EXTENSIONS.get(ext, 'Unknown'),
                'loc': result.nloc,
                'functions_count': len(result.function_list),
                'complexity': total_complexity,
                'average_complexity': round(result.average_cyclomatic_complexity, 2) if result.function_list else 0,
                'functions': functions,
                'deficiencies': deficiencies,
                'duplication_percent': duplication_percent
            }

        except Exception as e:
            return {
                'error': str(e),
                'file': file_path,
                'message': f'Error: {str(e)}'
            }

    def analyze_repository(self, repo_path: str = None) -> Dict[str, Any]:
        """
        Analiza todos los archivos del repositorio
        Retorna: agregación de métricas
        """
        target_path = repo_path or self.repo_path

        if not target_path:
            return {
                'error': 'No repository path provided',
                'message': 'Se requiere especificar la ruta del repositorio'
            }

        # Convertir a string por si recibe Path
        target_path = str(target_path)

        if not os.path.exists(target_path):
            return {
                'error': f'Repository path not found: {target_path}',
                'message': f'La ruta no existe: {target_path}'
            }

        file_metrics = []
        languages = {}
        skipped_files = []

        # Recorrer directorio
        for root, dirs, files in os.walk(target_path):
            # Saltar directorios comunes
            dirs[:] = [d for d in dirs if d not in [
                '.git', '__pycache__', 'node_modules', '.venv', 'venv',
                'dist', 'build', '.pytest_cache', '.env'
            ]]

            for file in files:
                file_path = os.path.join(root, file)
                _, ext = os.path.splitext(file_path)

                if ext in self.SUPPORTED_EXTENSIONS:
                    try:
                        metrics = self.analyze_file(file_path)

                        if 'error' not in metrics:
                            file_metrics.append(metrics)
                            lang = metrics['language']
                            languages[lang] = languages.get(lang, 0) + 1
                        else:
                            skipped_files.append({
                                'file': file_path,
                                'reason': metrics.get('error', 'Unknown error')
                            })
                    except Exception as e:
                        skipped_files.append({
                            'file': file_path,
                            'reason': str(e)
                        })

        # Recalcular duplicacion considerando TODO el repositorio (no solo
        # dentro de cada archivo por separado) para mayor precision.
        # OJO: debe ejecutarse ANTES de normalizar 'file' a ruta relativa,
        # porque todavia necesita la ruta real en disco para releer los
        # archivos y calcular los bloques duplicados.
        if file_metrics:
            self._apply_repository_duplication(file_metrics)

        # Normalizar 'file' a ruta relativa a la raiz del repositorio (sin el
        # prefijo del directorio clonado), para que el mismo valor que se
        # muestra en el Dashboard/Lista de Prioridades se pueda pegar
        # directamente en "Analisis de Modulo" (POST /risk/module) sin que
        # el backend lo duplique al unirlo de nuevo con la ruta del clon.
        for metrics in file_metrics:
            raw_path = metrics.get('file')
            if raw_path:
                metrics['file'] = os.path.relpath(raw_path, target_path)

        result = {
            'repository': os.path.basename(target_path) or target_path,
            'files_analyzed': len(file_metrics),
            'languages': languages,
            'files': file_metrics
        }

        if not file_metrics:
            result['error'] = 'No files analyzed'
            result['message'] = f'No se encontraron archivos analizables en {target_path}'
            result['skipped_files'] = skipped_files if skipped_files else []

        return result

    def _detect_deficiencies(self, function_list) -> List[Dict[str, Any]]:
        """
        Detecta deficiencias en el código basado en umbrales
        """
        deficiencies = []

        for func in function_list:
            cc = func.cyclomatic_complexity
            nloc = func.nloc
            params = len(func.parameters) if hasattr(func, 'parameters') else 0

            # Alta complejidad ciclomática
            if cc > self.THRESHOLDS['cyclomatic_complexity_critical']:
                deficiencies.append({
                    'type': 'CRITICAL_COMPLEXITY',
                    'function': func.name,
                    'severity': 'CRITICAL',
                    'value': cc
                })
            elif cc > self.THRESHOLDS['cyclomatic_complexity_high']:
                deficiencies.append({
                    'type': 'HIGH_COMPLEXITY',
                    'function': func.name,
                    'severity': 'HIGH',
                    'value': cc
                })

            # Método muy largo
            if nloc > self.THRESHOLDS['loc_long_method']:
                deficiencies.append({
                    'type': 'LONG_METHOD',
                    'function': func.name,
                    'severity': 'MEDIUM',
                    'value': nloc
                })

            # Muchos parámetros
            if params > self.THRESHOLDS['parameters_too_many']:
                deficiencies.append({
                    'type': 'TOO_MANY_PARAMETERS',
                    'function': func.name,
                    'severity': 'MEDIUM',
                    'value': params
                })

        return deficiencies

    def _normalize_code_lines(self, file_path: str) -> List[str]:
        """
        Lee un archivo y devuelve sus líneas de código normalizadas:
        sin espacios al inicio/fin, sin líneas vacías y sin líneas que
        son comentarios simples (heurística liviana, no un parser real).
        """
        comment_prefixes = ('#', '//', '*', '/*', '"""', "'''")
        lines: List[str] = []
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                for raw_line in f:
                    line = raw_line.strip()
                    if not line:
                        continue
                    if line.startswith(comment_prefixes):
                        continue
                    lines.append(line)
        except Exception:
            return []
        return lines

    @staticmethod
    def _blocks_from_lines(lines: List[str], block_size: int) -> List[str]:
        """
        Convierte una lista de líneas en hashes de bloques de 'block_size'
        líneas consecutivas (ventana deslizante), usados para detectar
        clones exactos (Type-1).
        """
        blocks: List[str] = []
        if len(lines) < block_size:
            return blocks
        for i in range(0, len(lines) - block_size + 1):
            block_text = '\n'.join(lines[i:i + block_size])
            blocks.append(hashlib.sha1(block_text.encode('utf-8')).hexdigest())
        return blocks

    def _file_blocks(self, file_path: str) -> List[str]:
        """Hashes de bloques de un archivo individual."""
        lines = self._normalize_code_lines(file_path)
        return self._blocks_from_lines(lines, self.DUP_BLOCK_SIZE)

    @staticmethod
    def _duplication_percent(blocks: List[str]) -> float:
        """
        Dado un listado de hashes de bloques, calcula el porcentaje que
        corresponde a bloques que aparecen 2 o más veces (duplicados).
        """
        if not blocks:
            return 0.0
        counts: Dict[str, int] = {}
        for b in blocks:
            counts[b] = counts.get(b, 0) + 1
        duplicated = sum(count for count in counts.values() if count > 1)
        return round((duplicated / len(blocks)) * 100, 2)

    def _file_duplication_percent(self, file_path: str) -> float:
        """
        Duplicación dentro del propio archivo (clones Type-1 internos).
        Se usa como fallback cuando se analiza un archivo aislado, sin
        contexto del resto del repositorio.
        """
        blocks = self._file_blocks(file_path)
        return self._duplication_percent(blocks)

    def _apply_repository_duplication(self, file_metrics: List[Dict[str, Any]]) -> None:
        """
        Recalcula 'duplication_percent' de cada archivo analizado
        considerando los bloques duplicados en TODO el repositorio
        (clones entre archivos distintos), que es una medida más
        realista que la duplicación dentro de un solo archivo.
        Modifica 'file_metrics' in-place.
        """
        file_blocks_map: Dict[str, List[str]] = {}
        for metrics in file_metrics:
            path = metrics.get('file')
            if not path:
                continue
            file_blocks_map[path] = self._file_blocks(path)

        block_counts: Dict[str, int] = {}
        for blocks in file_blocks_map.values():
            for b in blocks:
                block_counts[b] = block_counts.get(b, 0) + 1

        for metrics in file_metrics:
            path = metrics.get('file')
            blocks = file_blocks_map.get(path, [])
            if not blocks:
                metrics['duplication_percent'] = 0.0
                continue
            duplicated = sum(1 for b in blocks if block_counts.get(b, 0) > 1)
            metrics['duplication_percent'] = round((duplicated / len(blocks)) * 100, 2)
