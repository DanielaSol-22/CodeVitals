"""
Calculador de Métricas de Código usando Lizard
Extrae complejidad ciclomática, LOC, parámetros, etc.
"""
from lizard import FunctionInfo, SourceFile
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
    
    def __init__(self, repo_path: str):
        """
        Inicializa el calculador de métricas
        
        Args:
            repo_path: Ruta del repositorio a analizar
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
            
            # Leer archivo
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
            
            # Usar Lizard para análisis
            from lizard import analyze_file as lizard_analyze
            result = lizard_analyze(file_path)
            
            functions = []
            for func in result.functions:
                functions.append({
                    'name': func.name,
                    'cyclomatic_complexity': func.cyclomatic_complexity,
                    'lines': func.lines,
                    'parameters': len(func.parameters),
                    'long_method': func.lines > self.THRESHOLDS['loc_long_method'],
                    'high_complexity': func.cyclomatic_complexity > self.THRESHOLDS['cyclomatic_complexity_high'],
                    'critical_complexity': func.cyclomatic_complexity > self.THRESHOLDS['cyclomatic_complexity_critical']
                })
            
            return {
                'file': file_path,
                'language': self.SUPPORTED_EXTENSIONS.get(ext, 'Unknown'),
                'loc': result.loc,
                'functions_count': len(result.functions),
                'average_complexity': round(
                    sum(f.cyclomatic_complexity for f in result.functions) / len(result.functions)
                    if result.functions else 0, 2
                ),
                'total_complexity': sum(f.cyclomatic_complexity for f in result.functions),
                'functions': functions,
                'deficiencies': self._detect_deficiencies(result)
            }
        
        except Exception as e:
            return {
                'error': str(e),
                'file': file_path
            }
    
    def analyze_repository(self) -> Dict[str, Any]:
        """
        Analiza todos los archivos del repositorio
        Retorna: agregación de métricas
        """
        file_metrics = []
        total_loc = 0
        total_complexity = 0
        total_functions = 0
        
        # Recorrer directorio
        for root, dirs, files in os.walk(self.repo_path):
            # Saltar directorios comunes
            dirs[:] = [d for d in dirs if d not in ['.git', '__pycache__', 'node_modules', '.venv', 'venv']]
            
            for file in files:
                file_path = os.path.join(root, file)
                _, ext = os.path.splitext(file_path)
                
                if ext in self.SUPPORTED_EXTENSIONS:
                    metrics = self.analyze_file(file_path)
                    
                    if 'error' not in metrics:
                        file_metrics.append(metrics)
                        total_loc += metrics['loc']
                        total_complexity += metrics['total_complexity']
                        total_functions += metrics['functions_count']
        
        return {
            'repository': self.repo_path,
            'files_analyzed': len(file_metrics),
            'total_loc': total_loc,
            'total_functions': total_functions,
            'average_complexity': round(
                total_complexity / total_functions if total_functions > 0 else 0, 2
            ),
            'files': file_metrics
        }
    
    def _detect_deficiencies(self, file_result) -> List[Dict[str, Any]]:
        """
        Detecta deficiencias en el código basado en umbrales
        """
        deficiencies = []
        
        for func in file_result.functions:
            # Alta complejidad ciclomática
            if func.cyclomatic_complexity > self.THRESHOLDS['cyclomatic_complexity_critical']:
                deficiencies.append({
                    'type': 'CRITICAL_COMPLEXITY',
                    'function': func.name,
                    'severity': 'CRITICAL',
                    'value': func.cyclomatic_complexity,
                    'threshold': self.THRESHOLDS['cyclomatic_complexity_critical']
                })
            elif func.cyclomatic_complexity > self.THRESHOLDS['cyclomatic_complexity_high']:
                deficiencies.append({
                    'type': 'HIGH_COMPLEXITY',
                    'function': func.name,
                    'severity': 'HIGH',
                    'value': func.cyclomatic_complexity,
                    'threshold': self.THRESHOLDS['cyclomatic_complexity_high']
                })
            
            # Método muy largo
            if func.lines > self.THRESHOLDS['loc_long_method']:
                deficiencies.append({
                    'type': 'LONG_METHOD',
                    'function': func.name,
                    'severity': 'MEDIUM',
                    'value': func.lines,
                    'threshold': self.THRESHOLDS['loc_long_method']
                })
            
            # Muchos parámetros
            if len(func.parameters) > self.THRESHOLDS['parameters_too_many']:
                deficiencies.append({
                    'type': 'TOO_MANY_PARAMETERS',
                    'function': func.name,
                    'severity': 'MEDIUM',
                    'value': len(func.parameters),
                    'threshold': self.THRESHOLDS['parameters_too_many']
                })
        
        return deficiencies
