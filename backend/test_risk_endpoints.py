"""
Script para probar endpoints de análisis de riesgo
Prueba: POST /api/v1/risk/module, /api/v1/risk/repository, /api/v1/risk/priority
"""
import requests
import json
import os

BASE_URL = 'http://127.0.0.1:5000/api/v1'

def print_header(text):
    print(f"\n{'='*60}")
    print(f"  {text}")
    print(f"{'='*60}\n")

def print_response(title, response):
    print(f"\n[{title}]")
    print(f"Status Code: {response.status_code}")
    
    try:
        data = response.json()
        print(json.dumps(data, indent=2, ensure_ascii=False))
    except:
        print(response.text)
    
    if response.status_code == 200:
        print("\n✅ PRUEBA EXITOSA")
    else:
        print("\n❌ PRUEBA FALLIDA")

def test_risk_module():
    print_header("Test 1: Analyze Risk for Single Module")
    
    payload = {
        "file_path": r"C:\Users\Daniela\proyectos\metricas-git-risk\backend\modules\risk_detector.py"
    }
    
    print(f"📤 Enviando request con payload:")
    print(json.dumps(payload, indent=2, ensure_ascii=False))
    
    try:
        response = requests.post(f'{BASE_URL}/risk/module', json=payload)
        print_response("Response", response)
        return response
    except Exception as e:
        print(f"❌ Error: {str(e)}")

def test_risk_repository():
    print_header("Test 2: Analyze Risk for Repository")
    
    payload = {
        "repo_path": r"C:\Users\Daniela\proyectos\metricas-git-risk\backend"
    }
    
    print(f"📤 Enviando request con payload:")
    print(json.dumps(payload, indent=2, ensure_ascii=False))
    
    try:
        response = requests.post(f'{BASE_URL}/risk/repository', json=payload)
        print_response("Response", response)
        
        if response.status_code == 200:
            data = response.json()
            summary = data.get('data', {}).get('summary', {})
            print(f"\n📊 Resumen:")
            print(f"   • Total módulos: {summary.get('total_modules')}")
            print(f"   • Clasificación general: {summary.get('overall_risk_classification')}")
            print(f"   • Score promedio: {summary.get('average_risk_score')}")
            print(f"   • Alto riesgo: {summary.get('high_risk_count')}")
            print(f"   • Riesgo medio: {summary.get('medium_risk_count')}")
            print(f"   • Bajo riesgo: {summary.get('low_risk_count')}")
        
        return response
    except Exception as e:
        print(f"❌ Error: {str(e)}")

def test_risk_priority():
    print_header("Test 3: Generate Priority List")
    
    payload = {
        "repo_path": r"C:\Users\Daniela\proyectos\metricas-git-risk\backend",
        "limit": 5
    }
    
    print(f"📤 Enviando request con payload:")
    print(json.dumps(payload, indent=2, ensure_ascii=False))
    
    try:
        response = requests.post(f'{BASE_URL}/risk/priority', json=payload)
        print_response("Response", response)
        
        if response.status_code == 200:
            data = response.json()
            priority_list = data.get('data', {}).get('priority_list', [])
            print(f"\n📋 Top módulos por riesgo:")
            for item in priority_list:
                print(f"\n   {item['priority']}. {os.path.basename(item['file'])}")
                print(f"      Score: {item['risk_score']} | {item['classification']}")
                print(f"      Deficiencias: {item['deficiencies_count']}")
                print(f"      Acción: {item['action']}")
        
        return response
    except Exception as e:
        print(f"❌ Error: {str(e)}")

def main():
    print("\n" + "="*60)
    print("  PRUEBAS DE ENDPOINTS DE RIESGO (Option C)")
    print("="*60)
    
    print("\n🔍 Selecciona una opción:")
    print("   1. Prueba análisis de módulo")
    print("   2. Prueba análisis de repositorio")
    print("   3. Prueba lista de prioridades")
    print("   4. Ejecutar todas las pruebas")
    print("   0. Salir")
    
    option = input("\n¿Opción? ").strip()
    
    if option == '1':
        test_risk_module()
    elif option == '2':
        test_risk_repository()
    elif option == '3':
        test_risk_priority()
    elif option == '4':
        test_risk_module()
        test_risk_repository()
        test_risk_priority()
    elif option == '0':
        print("\n✅ Saliendo...")
        return
    else:
        print("\n❌ Opción no válida")
    
    print("\n" + "="*60)

if __name__ == '__main__':
    main()
