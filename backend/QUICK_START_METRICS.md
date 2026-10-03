# 🚀 Quick Start - Endpoints de Métricas

## Paso 1: Verificar que el servidor está corriendo

```bash
# En una terminal, desde el directorio backend/
python app.py

# Deberías ver:
# WARNING in app.runserver: This is a development server. Do not use it in production.
# Running on http://0.0.0.0:5000
```

## Paso 2: Probar Health Check

```bash
curl http://localhost:5000/health
```

Respuesta esperada:
```json
{
  "status": "healthy",
  "app": "CodeVitals",
  "version": "1.0.0"
}
```

## Paso 3: Ver Endpoints Disponibles

```bash
curl http://localhost:5000/api/v1/info
```

Verás una lista de todos los endpoints disponibles (incluyendo los nuevos de métricas).

## Paso 4: Probar Endpoint de Métricas

### Opción A: Usando el script interactivo (recomendado)

```bash
python test_metrics_endpoints.py
```

Sigue el menú interactivo:
1. Selecciona "3" para analizar un repositorio
2. Ingresa la ruta local (ej: `./repos/my-project`)
3. Recibirás un análisis completo

### Opción B: Usando curl

```bash
curl -X POST http://localhost:5000/api/v1/metrics/repository \
  -H "Content-Type: application/json" \
  -d '{
    "repo_path": "./repos/my-project"
  }'
```

### Opción C: Usando Python

```python
import requests
import json

# Analizar repositorio
response = requests.post(
    'http://localhost:5000/api/v1/metrics/repository',
    json={'repo_path': './repos/my-project'}
)

data = response.json()
print(json.dumps(data, indent=2, ensure_ascii=False))

# Verificar si fue exitoso
if data['success']:
    summary = data['data']['metrics']
    print(f"\n✅ Análisis exitoso!")
    print(f"  • Archivos: {data['data']['total_files']}")
    print(f"  • Complejidad promedio: {summary['average_complexity']}")
    print(f"  • Deficiencias encontradas: {summary['deficiency_count']}")
```

## Paso 5: Interpretar los Resultados

### Complejidad Ciclomática
- **Baja** (< 5): Código simple y mantenible ✅
- **Media** (5-10): Aceptable con algunas consideraciones ⚠️
- **Alta** (> 10): Requiere refactorización 🔴

### Quality Score
- **80-100**: Excelente código ✅
- **60-79**: Código bueno con mejoras menores
- **40-59**: Código que necesita atención
- **0-39**: Código de baja calidad 🔴

### Deficiencias Comunes
1. **HIGH_COMPLEXITY**: Función demasiado compleja
   - **Solución**: Dividir en funciones más pequeñas
   
2. **LONG_METHOD**: Más de 50 líneas
   - **Solución**: Extraer métodos auxiliares
   
3. **TOO_MANY_PARAMETERS**: Más de 5 parámetros
   - **Solución**: Usar objetos de configuración

## Paso 6: Explorar Otros Endpoints

### Analizar un archivo específico
```bash
curl -X POST http://localhost:5000/api/v1/metrics/file \
  -H "Content-Type: application/json" \
  -d '{
    "file_path": "./repos/my-project/src/main.py"
  }'
```

### Obtener resumen ejecutivo
```bash
curl -X POST http://localhost:5000/api/v1/metrics/summary \
  -H "Content-Type: application/json" \
  -d '{
    "repo_path": "./repos/my-project"
  }'
```

---

## 📚 Documentación Completa

Para ver ejemplos más detallados:
```bash
# Abre este archivo
cat METRICS_API_EXAMPLES.md
```

## 🆘 Solucionar Problemas

### Error: "Ruta no encontrada"
```
❌ Asegúrate de que la ruta sea relativa al directorio backend/
✅ Usa rutas como: ./repos/my-project o ./my-repo
```

### Error: "Módulo no encontrado"
```bash
❌ Asegúrate de estar en el directorio backend/
✅ cd backend
✅ Luego ejecuta: python app.py
```

### Error: "Puerto 5000 ya está en uso"
```bash
❌ Cambia el puerto en app.py
✅ Busca la línea: app.run(..., port=5000, ...)
✅ Cambia a un puerto diferente: port=5001
```

---

## 📊 Próximas Métricas

Después de probar estos endpoints, puedes implementar Option C:
- **Endpoints de detección de riesgos** con la fórmula ponderada
- Combina Git + Métricas + Riesgos en un análisis unificado

