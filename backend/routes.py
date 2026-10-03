"""
Rutas de la API v1
Endpoints para análisis de repositorios y métricas de código
"""
from flask import Blueprint, request, jsonify
from modules import GitAnalyzer, MetricsCalculator, RiskDetector
import os
import shutil

# Crear blueprint para los endpoints
api_v1 = Blueprint('api_v1', __name__, url_prefix='/api/v1')

# ============================================================
# ENDPOINTS DE ANÁLISIS GIT (Option A)
# ============================================================

@api_v1.route('/analyze/repository', methods=['POST'])
def analyze_repository():
    """
    Analiza un repositorio Git completo
    
    Request JSON:
    {
        "repo_url": "https://github.com/user/repo.git",
        "repo_path": "./repos/repo"  (opcional)
    }
    
    Response:
    {
        "total_commits": 145,
        "total_authors": 3,
        "authors": ["dev1", "dev2", "dev3"],
        "commits": [...],
        "files_changed": {...},
        "date_range": {...}
    }
    """
    try:
        data = request.get_json()
        
        # Validar request
        if not data or 'repo_url' not in data:
            return jsonify({
                'error': 'Parámetro requerido faltante',
                'required': ['repo_url'],
                'optional': ['repo_path']
            }), 400
        
        repo_url = data.get('repo_url')
        repo_path = data.get('repo_path', None)
        
        # Validar URL
        if not isinstance(repo_url, str) or not repo_url.strip():
            return jsonify({
                'error': 'repo_url debe ser una URL válida'
            }), 400
        
        # Crear analizador y ejecutar análisis
        analyzer = GitAnalyzer(repo_url, repo_path)
        result = analyzer.analyze_repository()
        
        # Verificar si hay error
        if 'error' in result:
            return jsonify({
                'error': result.get('error'),
                'message': result.get('message', 'Error desconocido')
            }), 500
        
        return jsonify({
            'success': True,
            'data': result,
            'message': f'Análisis completado: {result["total_commits"]} commits de {result["total_authors"]} autores'
        }), 200
    
    except Exception as e:
        return jsonify({
            'error': 'Error interno del servidor',
            'message': str(e)
        }), 500


@api_v1.route('/analyze/repository/<path:repo_name>/churn/<file_path>', methods=['GET'])
def calculate_code_churn(repo_name, file_path):
    """
    Calcula el churn (cambios) de un archivo específico
    
    URL: /api/v1/analyze/repository/my-repo/churn/src/main.py?repo_url=...
    
    Query params:
    - repo_url: URL del repositorio
    - repo_path: Ruta local (opcional)
    
    Response:
    {
        "file": "src/main.py",
        "total_changes": 23,
        "additions": 450,
        "deletions": 120,
        "total_churn": 570
    }
    """
    try:
        repo_url = request.args.get('repo_url')
        repo_path = request.args.get('repo_path', None)
        
        if not repo_url:
            return jsonify({
                'error': 'Parámetro requerido: repo_url'
            }), 400
        
        analyzer = GitAnalyzer(repo_url, repo_path)
        result = analyzer.calculate_code_churn(file_path)
        
        if 'error' in result:
            return jsonify({
                'error': result.get('error')
            }), 500
        
        return jsonify({
            'success': True,
            'data': result
        }), 200
    
    except Exception as e:
        return jsonify({
            'error': 'Error interno del servidor',
            'message': str(e)
        }), 500


@api_v1.route('/analyze/repository/bus-factor', methods=['POST'])
def calculate_bus_factor():
    """
    Calcula el Bus Factor (concentración de conocimiento)
    
    Request JSON:
    {
        "repo_url": "https://github.com/user/repo.git",
        "repo_path": "./repos/repo"  (opcional)
    }
    
    Response:
    {
        "total_authors": 3,
        "total_commits": 145,
        "total_files": 42,
        "top_author": "dev1",
        "top_author_commits": 95,
        "risk_percentage": 65.5,
        "author_distribution": {...}
    }
    """
    try:
        data = request.get_json()
        
        if not data or 'repo_url' not in data:
            return jsonify({
                'error': 'Parámetro requerido faltante',
                'required': ['repo_url']
            }), 400
        
        repo_url = data.get('repo_url')
        repo_path = data.get('repo_path', None)
        
        analyzer = GitAnalyzer(repo_url, repo_path)
        result = analyzer.calculate_bus_factor()
        
        if 'error' in result:
            return jsonify({
                'error': result.get('error'),
                'message': result.get('message')
            }), 500
        
        # Agregar clasificación de riesgo
        risk_pct = result.get('risk_percentage', 0)
        if risk_pct <= 20:
            risk_level = 'BAJO'
            recommendation = 'Buena distribución de conocimiento'
        elif risk_pct <= 40:
            risk_level = 'MODERADO'
            recommendation = 'Concentración moderada - Documentar decisiones clave'
        elif risk_pct <= 60:
            risk_level = 'ALTO'
            recommendation = 'Alto riesgo - Transferencia de conocimiento recomendada'
        else:
            risk_level = 'CRÍTICO'
            recommendation = 'Riesgo crítico - Acción inmediata necesaria'
        
        result['risk_level'] = risk_level
        result['recommendation'] = recommendation
        
        return jsonify({
            'success': True,
            'data': result
        }), 200
    
    except Exception as e:
        return jsonify({
            'error': 'Error interno del servidor',
            'message': str(e)
        }), 500


# ============================================================
# ENDPOINTS DE MÉTRICAS DE CÓDIGO (Option B)
# ============================================================

@api_v1.route('/metrics/repository', methods=['POST'])
def analyze_metrics_repository():
    """
    Analiza todas las métricas de código en un repositorio
    
    Request JSON:
    {
        "repo_path": "./repos/my-repo"  (requerido, ruta local)
    }
    
    Response:
    {
        "total_files": 42,
        "languages": {"python": 15, "javascript": 10, ...},
        "metrics": {
            "average_complexity": 7.5,
            "average_loc": 150,
            "total_functions": 125,
            "deficiency_count": 12
        },
        "files": [
            {
                "path": "src/main.py",
                "language": "python",
                "loc": 250,
                "complexity": 12,
                "functions": 8,
                "deficiencies": ["HIGH_COMPLEXITY"]
            },
            ...
        ]
    }
    """
    try:
        data = request.get_json()
        
        if not data or 'repo_path' not in data:
            return jsonify({
                'error': 'Parámetro requerido faltante',
                'required': ['repo_path']
            }), 400
        
        repo_path = data.get('repo_path')
        
        # Validar que la ruta existe
        if not os.path.exists(repo_path):
            return jsonify({
                'error': f'Ruta del repositorio no encontrada: {repo_path}'
            }), 400
        
        # Ejecutar análisis de métricas
        calculator = MetricsCalculator()
        metrics_data = calculator.analyze_repository(repo_path)
        
        if 'error' in metrics_data:
            return jsonify({
                'error': metrics_data.get('error'),
                'message': metrics_data.get('message', 'Error desconocido')
            }), 500
        
        # Calcular estadísticas
        files_list = metrics_data.get('files', [])
        total_loc = sum(f.get('loc', 0) for f in files_list)
        total_functions = sum(f.get('functions_count', 0) for f in files_list)
        total_complexity = sum(f.get('complexity', 0) for f in files_list)
        
        avg_complexity = total_complexity / len(files_list) if files_list else 0
        avg_loc = total_loc / len(files_list) if files_list else 0
        
        deficiency_count = sum(
            len(f.get('deficiencies', [])) for f in files_list
        )
        
        return jsonify({
            'success': True,
            'data': {
                'total_files': len(files_list),
                'languages': metrics_data.get('languages', {}),
                'metrics': {
                    'average_complexity': round(avg_complexity, 2),
                    'average_loc': round(avg_loc, 2),
                    'total_functions': total_functions,
                    'total_loc': total_loc,
                    'deficiency_count': deficiency_count
                },
                'files': files_list
            },
            'message': f'Análisis de {len(files_list)} archivos completado'
        }), 200
    
    except Exception as e:
        return jsonify({
            'error': 'Error interno del servidor',
            'message': str(e)
        }), 500


@api_v1.route('/metrics/file', methods=['POST'])
def analyze_metrics_file():
    """
    Analiza las métricas de un archivo específico
    
    Request JSON:
    {
        "file_path": "./repos/my-repo/src/main.py"  (requerido)
    }
    
    Response:
    {
        "file": "src/main.py",
        "language": "python",
        "loc": 250,
        "complexity": 12,
        "functions": [
            {
                "name": "calculate_risk",
                "loc": 45,
                "complexity": 5,
                "parameters": 3
            },
            ...
        ],
        "deficiencies": ["HIGH_COMPLEXITY"],
        "quality_score": 75
    }
    """
    try:
        data = request.get_json()
        
        if not data or 'file_path' not in data:
            return jsonify({
                'error': 'Parámetro requerido faltante',
                'required': ['file_path']
            }), 400
        
        file_path = data.get('file_path')
        
        # Validar que el archivo existe
        if not os.path.exists(file_path):
            return jsonify({
                'error': f'Archivo no encontrado: {file_path}'
            }), 400
        
        # Ejecutar análisis de métricas
        calculator = MetricsCalculator()
        file_metrics = calculator.analyze_file(file_path)
        
        if 'error' in file_metrics:
            return jsonify({
                'error': file_metrics.get('error'),
                'message': file_metrics.get('message', 'Error desconocido')
            }), 500
        
        # Calcular calificación de calidad (0-100)
        deficiencies = file_metrics.get('deficiencies', [])
        quality_score = 100 - (len(deficiencies) * 10)
        quality_score = max(0, min(100, quality_score))
        
        file_metrics['quality_score'] = quality_score
        
        return jsonify({
            'success': True,
            'data': file_metrics,
            'message': f'Análisis de {file_path} completado'
        }), 200
    
    except Exception as e:
        return jsonify({
            'error': 'Error interno del servidor',
            'message': str(e)
        }), 500


@api_v1.route('/metrics/summary', methods=['POST'])
def metrics_summary():
    """
    Genera un resumen ejecutivo de métricas de código
    
    Request JSON:
    {
        "repo_path": "./repos/my-repo"  (requerido)
    }
    
    Response:
    {
        "repository": "my-repo",
        "summary": {
            "files_analyzed": 42,
            "total_loc": 15240,
            "average_complexity": 7.5,
            "deficiency_percentage": 28.5,
            "overall_quality": "BUENO"
        },
        "warnings": [
            {
                "severity": "HIGH",
                "message": "12 archivos con complejidad ciclomática alta"
            }
        ],
        "recommendations": [...]
    }
    """
    try:
        data = request.get_json()
        
        if not data or 'repo_path' not in data:
            return jsonify({
                'error': 'Parámetro requerido faltante',
                'required': ['repo_path']
            }), 400
        
        repo_path = data.get('repo_path')
        
        # Validar que la ruta existe
        if not os.path.exists(repo_path):
            return jsonify({
                'error': f'Ruta del repositorio no encontrada: {repo_path}'
            }), 400
        
        # Ejecutar análisis de métricas
        calculator = MetricsCalculator()
        metrics_data = calculator.analyze_repository(repo_path)
        
        if 'error' in metrics_data:
            return jsonify({
                'error': metrics_data.get('error')
            }), 500
        
        files_list = metrics_data.get('files', [])
        
        # Calcular estadísticas
        total_loc = sum(f.get('loc', 0) for f in files_list)
        total_complexity = sum(f.get('complexity', 0) for f in files_list)
        avg_complexity = total_complexity / len(files_list) if files_list else 0
        
        deficiency_count = sum(
            len(f.get('deficiencies', [])) for f in files_list
        )
        deficiency_pct = (deficiency_count / len(files_list)) * 100 if files_list else 0
        
        # Determinar calidad general
        if deficiency_pct < 10:
            overall_quality = 'EXCELENTE'
        elif deficiency_pct < 25:
            overall_quality = 'BUENO'
        elif deficiency_pct < 50:
            overall_quality = 'REGULAR'
        else:
            overall_quality = 'DEFICIENTE'
        
        # Generar advertencias
        warnings = []
        high_complexity_files = [f for f in files_list if f.get('complexity', 0) > 15]
        if high_complexity_files:
            warnings.append({
                'severity': 'HIGH',
                'message': f'{len(high_complexity_files)} archivos con complejidad ciclomática muy alta (>15)'
            })
        
        long_methods = [f for f in files_list if f.get('loc', 0) > 200]
        if long_methods:
            warnings.append({
                'severity': 'MEDIUM',
                'message': f'{len(long_methods)} archivos con más de 200 líneas de código'
            })
        
        # Generar recomendaciones
        recommendations = []
        if avg_complexity > 10:
            recommendations.append('Refactorizar funciones con alta complejidad ciclomática')
        if deficiency_pct > 30:
            recommendations.append('Realizar revisión de código en profundidad')
        if len(files_list) > 50:
            recommendations.append('Considerar modularización del proyecto')
        
        return jsonify({
            'success': True,
            'data': {
                'repository': os.path.basename(repo_path),
                'summary': {
                    'files_analyzed': len(files_list),
                    'total_loc': total_loc,
                    'average_complexity': round(avg_complexity, 2),
                    'deficiency_percentage': round(deficiency_pct, 1),
                    'overall_quality': overall_quality
                },
                'warnings': warnings,
                'recommendations': recommendations
            },
            'message': f'Resumen de {len(files_list)} archivos generado'
        }), 200
    
    except Exception as e:
        return jsonify({
            'error': 'Error interno del servidor',
            'message': str(e)
        }), 500


# ============================================================
# Función para registrar el blueprint
# ============================================================

def register_routes(app):
    """Registra las rutas en la aplicación Flask"""
    app.register_blueprint(api_v1)


# ============================================================
# ENDPOINTS DE ANÁLISIS DE RIESGO (Option C)
# ============================================================

@api_v1.route('/risk/module', methods=['POST'])
def analyze_risk_module():
    """
    Calcula el riesgo de un módulo (archivo)
    Combina Git metrics + Code metrics
    
    Request JSON:
    {
        "file_path": "./repos/my-repo/src/main.py",
        "repo_url": "https://github.com/user/repo.git" (opcional),
        "repo_path": "./repos/my-repo" (opcional para Git metrics)
    }
    
    Response:
    {
        "file": "src/main.py",
        "risk_analysis": {
            "risk_score": 65.5,
            "classification": "HIGH",
            "maintenance_difficulty_index": 34.5,
            ...
        },
        "code_metrics": {...},
        "git_metrics": {...}
    }
    """
    try:
        data = request.get_json()
        
        if not data or 'file_path' not in data:
            return jsonify({
                'error': 'Parámetro requerido faltante',
                'required': ['file_path'],
                'optional': ['repo_url', 'repo_path']
            }), 400
        
        file_path = data.get('file_path')
        repo_url = data.get('repo_url')
        repo_path = data.get('repo_path')
        
        # Validar que el archivo existe
        if not os.path.exists(file_path):
            return jsonify({
                'error': f'Archivo no encontrado: {file_path}'
            }), 400
        
        # Obtener métricas de código
        calc = MetricsCalculator()
        code_metrics = calc.analyze_file(file_path)
        
        if 'error' in code_metrics:
            return jsonify({
                'error': 'Error al analizar código',
                'message': code_metrics.get('error')
            }), 500
        
        # Obtener métricas de Git (si se proporcionan)
        git_metrics = {
            'total_commits': 0,
            'total_churn': 0,
            'risk_percentage': 0
        }
        
        if repo_url or repo_path:
            try:
                analyzer = GitAnalyzer(repo_url, repo_path)
                
                # Calcular churn para el archivo
                churn_data = analyzer.calculate_code_churn(file_path)
                if 'error' not in churn_data:
                    git_metrics['total_churn'] = churn_data.get('total_churn', 0)
                    git_metrics['total_commits'] = churn_data.get('total_changes', 0)
                
                # Calcular bus factor
                bus_data = analyzer.calculate_bus_factor()
                if 'error' not in bus_data:
                    git_metrics['risk_percentage'] = bus_data.get('risk_percentage', 0)
            except Exception as e:
                # Si Git análisis falla, continuar con métricas de código
                pass
        
        # Calcular riesgo
        detector = RiskDetector()
        risk_result = detector.analyze_module(file_path, code_metrics, git_metrics)
        
        return jsonify({
            'success': True,
            'data': risk_result,
            'message': f'Análisis de riesgo completado para {os.path.basename(file_path)}'
        }), 200
    
    except Exception as e:
        return jsonify({
            'error': 'Error interno del servidor',
            'message': str(e)
        }), 500


@api_v1.route('/risk/repository', methods=['POST'])
def analyze_risk_repository():
    """
    Calcula el riesgo de todo el repositorio
    
    Request JSON:
    {
        "repo_path": "./repos/my-repo",
        "repo_url": "https://github.com/user/repo.git" (opcional)
    }
    
    Response:
    {
        "summary": {
            "total_modules": 42,
            "overall_risk_classification": "HIGH",
            "average_risk_score": 65.5,
            "high_risk_count": 8,
            "medium_risk_count": 12,
            "low_risk_count": 22
        },
        "high_risk_modules": [...],
        "medium_risk_modules": [...]
    }
    """
    try:
        data = request.get_json()
        
        if not data or 'repo_path' not in data:
            return jsonify({
                'error': 'Parámetro requerido faltante',
                'required': ['repo_path']
            }), 400
        
        repo_path = data.get('repo_path')
        repo_url = data.get('repo_url')
        
        if not os.path.exists(repo_path):
            return jsonify({
                'error': f'Repositorio no encontrado: {repo_path}'
            }), 400
        
        # Obtener todas las métricas de código
        calc = MetricsCalculator()
        metrics_data = calc.analyze_repository(repo_path)
        
        if 'error' in metrics_data:
            return jsonify({
                'error': metrics_data.get('error'),
                'message': metrics_data.get('message')
            }), 500
        
        # Preparar módulos con métricas de Git
        modules = []
        analyzer = None
        
        if repo_url:
            try:
                analyzer = GitAnalyzer(repo_url, repo_path)
            except:
                pass
        
        for file_metrics in metrics_data.get('files', []):
            git_metrics = {
                'total_commits': 0,
                'total_churn': 0,
                'risk_percentage': 0
            }
            
            if analyzer:
                try:
                    churn_data = analyzer.calculate_code_churn(file_metrics['file'])
                    if 'error' not in churn_data:
                        git_metrics['total_churn'] = churn_data.get('total_churn', 0)
                        git_metrics['total_commits'] = churn_data.get('total_changes', 0)
                except:
                    pass
            
            detector = RiskDetector()
            module_risk = detector.analyze_module(
                file_metrics['file'],
                file_metrics,
                git_metrics
            )
            modules.append(module_risk)
        
        # Analizar repositorio completo
        detector = RiskDetector()
        repo_risk = detector.analyze_repository(modules)
        
        return jsonify({
            'success': True,
            'data': repo_risk,
            'message': f'Análisis de riesgo completado para {len(modules)} módulos'
        }), 200
    
    except Exception as e:
        return jsonify({
            'error': 'Error interno del servidor',
            'message': str(e)
        }), 500


@api_v1.route('/risk/priority', methods=['POST'])
def risk_priority_list():
    """
    Genera lista priorizada de módulos para refactorización
    
    Request JSON:
    {
        "repo_path": "./repos/my-repo",
        "limit": 10  (opcional, default 10)
    }
    
    Response:
    {
        "priority_list": [
            {
                "priority": 1,
                "file": "src/main.py",
                "risk_score": 85.5,
                "classification": "HIGH",
                "deficiencies_count": 4,
                "action": "Refactorización urgente - Programar inmediatamente"
            },
            ...
        ]
    }
    """
    try:
        data = request.get_json()
        
        if not data or 'repo_path' not in data:
            return jsonify({
                'error': 'Parámetro requerido faltante',
                'required': ['repo_path']
            }), 400
        
        repo_path = data.get('repo_path')
        limit = data.get('limit', 10)
        
        if not os.path.exists(repo_path):
            return jsonify({
                'error': f'Repositorio no encontrado: {repo_path}'
            }), 400
        
        # Obtener análisis de riesgo del repositorio
        calc = MetricsCalculator()
        metrics_data = calc.analyze_repository(repo_path)
        
        if 'error' in metrics_data:
            return jsonify({
                'error': metrics_data.get('error')
            }), 500
        
        # Preparar módulos
        modules = []
        for file_metrics in metrics_data.get('files', []):
            git_metrics = {
                'total_commits': 0,
                'total_churn': 0,
                'risk_percentage': 0
            }
            
            detector = RiskDetector()
            module_risk = detector.analyze_module(
                file_metrics['file'],
                file_metrics,
                git_metrics
            )
            modules.append(module_risk)
        
        # Generar lista de prioridades
        detector = RiskDetector()
        repo_risk = detector.analyze_repository(modules)
        priority_list = detector.generate_priority_list(repo_risk, limit)
        
        return jsonify({
            'success': True,
            'data': {
                'total_modules': len(modules),
                'high_risk_modules': repo_risk['summary']['high_risk_count'],
                'priority_list': priority_list
            },
            'message': f'Lista de prioridades generada - Top {len(priority_list)} módulos'
        }), 200
    
    except Exception as e:
        return jsonify({
            'error': 'Error interno del servidor',
            'message': str(e)
        }), 500

