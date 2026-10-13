#!/usr/bin/env python
"""Script de diagnóstico para Lizard"""
import lizard
import os

print("=" * 60)
print("Diagnóstico de Lizard")
print("=" * 60)

# Probar con archivos locales
test_files = [
    'app.py',
    'config.py',
    'routes.py',
    'modules/git_analyzer.py',
    'modules/metrics_calculator.py',
    'modules/risk_detector.py'
]

for file_path in test_files:
    print(f"\n📄 Probando: {file_path}")
    
    if not os.path.exists(file_path):
        print(f"   ❌ No existe")
        continue
    
    try:
        result = lizard.analyze_file(file_path)
        print(f"   ✅ OK")
        print(f"      LOC: {result.loc}")
        print(f"      Funciones: {len(result.functions)}")
        print(f"      Complejidad: {sum(f.cyclomatic_complexity for f in result.functions)}")
    except Exception as e:
        print(f"   ❌ Error: {e}")

print("\n" + "=" * 60)
print("Fin diagnóstico")
print("=" * 60)
