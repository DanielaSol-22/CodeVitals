"""
Rutas de la API v1
Endpoints para análisis de repositorios
"""
from flask import Blueprint, request, jsonify
from modules import GitAnalyzer
import os

# Crear blueprint para los endpoints
api_v1 = Blueprint('api_v1', __name__, url_prefix='/api/v1')


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


# Registrar blueprint en la app
def register_routes(app):
    """Registra las rutas en la aplicación Flask"""
    app.register_blueprint(api_v1)
