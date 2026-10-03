from flask import Flask, jsonify, request, Response
from flask_cors import CORS
import json

app = Flask(__name__)

# ✅ CONFIGURAR CORS
CORS(app,
     origins="*",
     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
     allow_headers=["Content-Type"],
     supports_credentials=False)

# ✅ HANDLER PARA PREFLIGHT OPTIONS
@app.before_request
def handle_preflight():
    """Manejar solicitudes OPTIONS (preflight) de CORS"""
    if request.method == "OPTIONS":
        response = Response()
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type")
        response.headers.add("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        return response, 200

# ============================================
# ENDPOINTS DE SALUD
# ============================================

@app.route('/api/v1/health', methods=['GET', 'OPTIONS'])
def health_check():
    """Verificar que la API está disponible"""
    return jsonify({
        'status': 'ok',
        'message': 'API is running',
        'service': 'CodeVitals Risk Analysis'
    }), 200

@app.route('/api/v1/info', methods=['GET', 'OPTIONS'])
def api_info():
    """Información general de la API"""
    return jsonify({
        'name': 'CodeVitals Risk Analysis API',
        'version': '1.0.0',
        'endpoints': {
            'health': 'GET /api/v1/health',
            'analyze_module': 'POST /api/v1/risk/module',
            'analyze_repository': 'POST /api/v1/risk/repository',
            'priority_list': 'POST /api/v1/risk/priority'
        }
    }), 200

# ============================================
# ENDPOINTS DE ANÁLISIS
# ============================================

@app.route('/api/v1/risk/module', methods=['POST', 'OPTIONS'])
def analyze_module():
    """Analizar riesgo de un módulo (archivo)"""
    data = request.get_json()
    file_path = data.get('file_path', '')

    # Aquí iría tu lógica de análisis con Lizard, PyDriller, etc.
    # Por ahora, retorna un ejemplo

    return jsonify({
        'file_path': file_path,
        'overall_risk_score': 45,
        'risk_level': 'MEDIUM',
        'components': {
            'code_complexity': 38,
            'code_duplication': 22,
            'comments_ratio': 35,
            'test_coverage': 60,
            'maintainability': 42
        },
        'metrics': {
            'lines_of_code': 245,
            'cyclomatic_complexity': 12,
            'functions_count': 8,
            'average_function_length': 30.6
        },
        'git_metrics': {
            'total_commits': 15,
            'churn_rate': 0.35,
            'bus_factor': 1,
            'last_modified': '2026-10-02'
        },
        'deficiencies': [
            {'type': 'HIGH_COMPLEXITY', 'severity': 'high'},
            {'type': 'LOW_COVERAGE', 'severity': 'medium'}
        ]
    }), 200

@app.route('/api/v1/risk/repository', methods=['POST', 'OPTIONS'])
def analyze_repository():
    """Analizar riesgo de un repositorio completo"""
    data = request.get_json()
    repo_path = data.get('repo_path', '')

    # Aquí iría tu lógica de análisis de repositorio
    # Por ahora, retorna un ejemplo

    return jsonify({
        'repository_path': repo_path,
        'analysis_date': '2026-10-02',
        'total_files': 24,
        'summary': {
            'average_risk_score': 52,
            'high_risk_count': 5,
            'medium_risk_count': 8,
            'low_risk_count': 11
        },
        'risk_distribution': {
            'HIGH': 20.8,
            'MEDIUM': 33.3,
            'LOW': 45.9
        },
        'top_risk_modules': [
            {
                'file_path': 'src/services/analysis.py',
                'risk_score': 78,
                'risk_level': 'HIGH',
                'deficiency_count': 3
            },
            {
                'file_path': 'src/core/metrics.py',
                'risk_score': 72,
                'risk_level': 'HIGH',
                'deficiency_count': 2
            }
        ],
        'metrics': {
            'total_lines': 5843,
            'average_complexity': 11.2,
            'test_coverage': 58,
            'code_duplication': 8.5
        }
    }), 200

@app.route('/api/v1/risk/priority', methods=['POST', 'OPTIONS'])
def get_priority_list():
    """Obtener lista de módulos priorizados por riesgo"""
    data = request.get_json()
    repo_path = data.get('repo_path', '')
    limit = data.get('limit', 10)

    # Aquí iría tu lógica de priorización
    # Por ahora, retorna un ejemplo

    return jsonify({
        'repository_path': repo_path,
        'limit': limit,
        'modules': [
            {
                'rank': 1,
                'file_path': 'src/services/analysis.py',
                'risk_score': 78,
                'risk_level': 'HIGH',
                'deficiency_count': 3,
                'recommended_actions': [
                    'Reducir complejidad ciclomática',
                    'Mejorar cobertura de pruebas',
                    'Refactorizar funciones largas'
                ]
            },
            {
                'rank': 2,
                'file_path': 'src/core/metrics.py',
                'risk_score': 72,
                'risk_level': 'HIGH',
                'deficiency_count': 2,
                'recommended_actions': [
                    'Aumentar documentación',
                    'Mejorar nombres de variables'
                ]
            },
            {
                'rank': 3,
                'file_path': 'src/utils/helpers.py',
                'risk_score': 65,
                'risk_level': 'MEDIUM',
                'deficiency_count': 2,
                'recommended_actions': [
                    'Agregar tipos de datos',
                    'Dividir funciones grandes'
                ]
            }
        ]
    }), 200

# ============================================
# MANEJO DE ERRORES
# ============================================

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint no encontrado'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Error interno del servidor'}), 500

# ============================================
# INICIAR LA APLICACIÓN
# ============================================

if __name__ == '__main__':
    print("🚀 CodeVitals API iniciando...")
    print("📡 CORS habilitado para todas las rutas")
    print("🌐 Accesible en: http://localhost:5000")
    app.run(debug=True, host='localhost', port=5000)