"""
Configuración de la aplicación Flask
"""
import os
from datetime import timedelta


class Config:
    """Configuración base"""
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
    APP_NAME = os.getenv('APP_NAME', 'Analisis Metricas Git')
    APP_VERSION = os.getenv('APP_VERSION', '1.0.0')
    
    # Flask
    JSON_SORT_KEYS = False
    JSONIFY_PRETTYPRINT_REGULAR = True
    
    # CORS
    CORS_ORIGINS = os.getenv('CORS_ORIGINS', 'http://localhost:3000,http://localhost:5000').split(',')
    
    # Database
    DATABASE_URL = os.getenv('DATABASE_URL', 'sqlite:///metrics.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Análisis
    MAX_REPOS_CONCURRENT = 3
    GIT_CLONE_TIMEOUT = 300
    ANALYSIS_MAX_WORKERS = 4


class DevelopmentConfig(Config):
    """Configuración de desarrollo"""
    DEBUG = True
    TESTING = False
    ENV = 'development'


class ProductionConfig(Config):
    """Configuración de producción"""
    DEBUG = False
    TESTING = False
    ENV = 'production'


class TestingConfig(Config):
    """Configuración de testing"""
    TESTING = True
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'


# Selector de configuración
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}


def get_config():
    """Obtiene la configuración según el ambiente"""
    env = os.getenv('FLASK_ENV', 'development')
    return config.get(env, config['default'])
