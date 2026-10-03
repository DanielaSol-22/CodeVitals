"""
Aplicación Flask principal
Análisis de Métricas de Código en Repositorios Git
"""
from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import os

from config import get_config
from routes import register_routes

# Cargar variables de entorno
load_dotenv()


def create_app():
    """Factory para crear la aplicación Flask"""
    
    app = Flask(__name__)
    
    # Cargar configuración
    config = get_config()
    app.config.from_object(config)
    
    # Inicializar extensiones
    CORS(app, origins=app.config['CORS_ORIGINS'])
    
    # Registrar rutas
    register_routes(app)
    
    # Health check endpoint
    @app.route('/health', methods=['GET'])
    def health():
        return jsonify({
            'status': 'healthy',
            'app': app.config['APP_NAME'],
            'version': app.config['APP_VERSION']
        }), 200
    
    # Versión endpoint
    @app.route('/api/v1/info', methods=['GET'])
    def api_info():
        return jsonify({
            'app_name': app.config['APP_NAME'],
            'version': app.config['APP_VERSION'],
            'environment': app.config['ENV'],
            'api': 'v1',
            'endpoints': {
                'analyze_repository': 'POST /api/v1/analyze/repository',
                'calculate_churn': 'GET /api/v1/analyze/repository/<repo_name>/churn/<file_path>',
                'calculate_bus_factor': 'POST /api/v1/analyze/repository/bus-factor'
            }
        }), 200
    
    # Manejo de errores
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({
            'error': 'Recurso no encontrado',
            'message': str(error)
        }), 404
    
    @app.errorhandler(500)
    def internal_error(error):
        return jsonify({
            'error': 'Error interno del servidor',
            'message': str(error)
        }), 500
    
    return app


if __name__ == '__main__':
    app = create_app()
    app.run(
        host='0.0.0.0',
        port=5000,
        debug=app.config['DEBUG']
    )
