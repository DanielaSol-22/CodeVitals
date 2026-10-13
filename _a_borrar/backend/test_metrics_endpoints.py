#!/usr/bin/env python
"""
Script interactivo para probar los endpoints de métricas de código
Uso: python test_metrics_endpoints.py
"""
import requests
import json
from pathlib import Path

BASE_URL = "http://localhost:5000"

def print_header(title):
    """Imprime un encabezado formateado"""
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}\n")

def print_response(response, title="Response"):
    """Imprime una respuesta formateada"""
    print(f"\n[{title}]")
    print(f"Status Code: {response.status_code}")
    try:
        data = response.json()
        print(json.dumps(data, indent=2, ensure_ascii=False))
    except:
        print(response.text)

def test_health():
    """Prueba el endpoint de health check"""
    print_header("Test 1: Health Check")
    try:
        response = requests.get(f"{BASE_URL}/health")
        print_response(response)
        return response.status_code == 200
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_api_info():
    """Prueba el endpoint de información de API"""
    print_header("Test 2: API Info")
    try:
        response = requests.get(f"{BASE_URL}/api/v1/info")
        print_response(response)
        return response.status_code == 200
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_metrics_repository():
    """Prueba análisis de repositorio completo"""
    print_header("Test 3: Analyze Repository Metrics")
    
    repo_path = input("\n📂 Ingresa la ruta local del repositorio a analizar: ").strip()
    
    if not Path(repo_path).exists():
        print(f"❌ Ruta no encontrada: {repo_path}")
        return False
    
    try:
        payload = {"repo_path": repo_path}
        print(f"\n📤 Enviando request con payload: {json.dumps(payload, indent=2)}")
        
        response = requests.post(
            f"{BASE_URL}/api/v1/metrics/repository",
            json=payload
        )
        print_response(response)
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                summary = data['data']['metrics']
                print(f"\n📊 Resumen:")
                print(f"   • Archivos: {data['data']['total_files']}")
                print(f"   • LOC promedio: {summary['average_loc']}")
                print(f"   • Complejidad promedio: {summary['average_complexity']}")
                print(f"   • Deficiencias: {summary['deficiency_count']}")
        
        return response.status_code == 200
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_metrics_file():
    """Prueba análisis de archivo específico"""
    print_header("Test 4: Analyze Single File Metrics")
    
    file_path = input("\n📄 Ingresa la ruta del archivo a analizar: ").strip()
    
    if not Path(file_path).exists():
        print(f"❌ Archivo no encontrado: {file_path}")
        return False
    
    try:
        payload = {"file_path": file_path}
        print(f"\n📤 Enviando request con payload: {json.dumps(payload, indent=2)}")
        
        response = requests.post(
            f"{BASE_URL}/api/v1/metrics/file",
            json=payload
        )
        print_response(response)
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                metrics = data['data']
                print(f"\n📊 Métricas de {file_path}:")
                print(f"   • Lenguaje: {metrics['language']}")
                print(f"   • LOC: {metrics['loc']}")
                print(f"   • Complejidad: {metrics['complexity']}")
                print(f"   • Funciones: {len(metrics['functions'])}")
                print(f"   • Calidad: {metrics['quality_score']}/100")
                if metrics['deficiencies']:
                    print(f"   • Deficiencias: {', '.join(metrics['deficiencies'])}")
        
        return response.status_code == 200
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_metrics_summary():
    """Prueba resumen ejecutivo de métricas"""
    print_header("Test 5: Metrics Summary")
    
    repo_path = input("\n📂 Ingresa la ruta local del repositorio: ").strip()
    
    if not Path(repo_path).exists():
        print(f"❌ Ruta no encontrada: {repo_path}")
        return False
    
    try:
        payload = {"repo_path": repo_path}
        print(f"\n📤 Enviando request con payload: {json.dumps(payload, indent=2)}")
        
        response = requests.post(
            f"{BASE_URL}/api/v1/metrics/summary",
            json=payload
        )
        print_response(response)
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                summary = data['data']['summary']
                print(f"\n📊 Resumen Ejecutivo:")
                print(f"   • Repositorio: {data['data']['repository']}")
                print(f"   • Archivos: {summary['files_analyzed']}")
                print(f"   • LOC total: {summary['total_loc']}")
                print(f"   • Complejidad promedio: {summary['average_complexity']}")
                print(f"   • Deficiencias: {summary['deficiency_percentage']}%")
                print(f"   • Calidad: {summary['overall_quality']}")
                
                if data['data']['warnings']:
                    print(f"\n⚠️  Advertencias:")
                    for warning in data['data']['warnings']:
                        print(f"   [{warning['severity']}] {warning['message']}")
                
                if data['data']['recommendations']:
                    print(f"\n💡 Recomendaciones:")
                    for rec in data['data']['recommendations']:
                        print(f"   • {rec}")
        
        return response.status_code == 200
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def main():
    """Función principal"""
    print("""
    ╔════════════════════════════════════════════════════════════════════╗
    ║          CodeVitals - Prueba de Endpoints de Métricas              ║
    ║                      (Option B)                                    ║
    ╚════════════════════════════════════════════════════════════════════╝
    
    ⚠️  Asegúrate de que el servidor Flask está corriendo:
       python app.py
    
    Selecciona una prueba para ejecutar:
    """)
    
    tests = [
        ("1", "Health Check", test_health),
        ("2", "API Info", test_api_info),
        ("3", "Analyze Repository Metrics", test_metrics_repository),
        ("4", "Analyze Single File", test_metrics_file),
        ("5", "Metrics Summary", test_metrics_summary),
        ("6", "Ejecutar todas las pruebas", None),
    ]
    
    for num, name, _ in tests:
        print(f"  {num}. {name}")
    
    print(f"  0. Salir")
    
    while True:
        choice = input("\n🔍 Selecciona una opción (0-6): ").strip()
        
        if choice == "0":
            print("\n👋 ¡Hasta luego!")
            break
        elif choice == "6":
            results = []
            for num, name, test_func in tests[:-1]:
                if test_func:
                    result = test_func()
                    results.append((name, result))
            
            print_header("Resumen de Pruebas")
            for name, result in results:
                status = "✅ PASÓ" if result else "❌ FALLÓ"
                print(f"{status}: {name}")
        else:
            found = False
            for num, name, test_func in tests:
                if num == choice and test_func:
                    result = test_func()
                    status = "\n✅ PRUEBA EXITOSA" if result else "\n❌ PRUEBA FALLIDA"
                    print(status)
                    found = True
                    break
            
            if not found:
                print("❌ Opción inválida")

if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n👋 Programa interrumpido por el usuario")
