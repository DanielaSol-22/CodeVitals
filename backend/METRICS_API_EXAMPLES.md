# CodeVitals - API de Métricas de Código

## Descripción General

Estos endpoints analizan la calidad del código usando **Lizard** para extraer métricas estáticas:
- **Complejidad Ciclomática**: Nivel de complejidad en funciones
- **Líneas de Código (LOC)**: Total de líneas por archivo/función
- **Deficiencias de Código**: HIGH_COMPLEXITY, LONG_METHOD, TOO_MANY_PARAMETERS

---

## Endpoint 1: Analizar Repositorio Completo

### Request

```bash
curl -X POST http://localhost:5000/api/v1/metrics/repository \
  -H "Content-Type: application/json" \
  -d '{
    "repo_path": "./repos/my-project"
  }'
```

### Python

```python
import requests

response = requests.post(
    'http://localhost:5000/api/v1/metrics/repository',
    json={
        'repo_path': './repos/my-project'
    }
)

print(response.json())
```

### Response (Success)

```json
{
  "success": true,
  "data": {
    "total_files": 42,
    "languages": {
      "python": 15,
      "javascript": 10,
      "typescript": 8,
      "java": 9
    },
    "metrics": {
      "average_complexity": 7.5,
      "average_loc": 150,
      "total_functions": 125,
      "total_loc": 6300,
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
      {
        "path": "src/utils.py",
        "language": "python",
        "loc": 180,
        "complexity": 5,
        "functions": 6,
        "deficiencies": []
      }
    ]
  },
  "message": "Análisis de 42 archivos completado"
}
```

---

## Endpoint 2: Analizar Archivo Específico

### Request

```bash
curl -X POST http://localhost:5000/api/v1/metrics/file \
  -H "Content-Type: application/json" \
  -d '{
    "file_path": "./repos/my-project/src/main.py"
  }'
```

### Python

```python
import requests

response = requests.post(
    'http://localhost:5000/api/v1/metrics/file',
    json={
        'file_path': './repos/my-project/src/main.py'
    }
)

metrics = response.json()['data']
print(f"Archivo: {metrics['file']}")
print(f"Complejidad: {metrics['complexity']}")
print(f"Calidad: {metrics['quality_score']}/100")
```

### Response (Success)

```json
{
  "success": true,
  "data": {
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
      {
        "name": "analyze_repository",
        "loc": 78,
        "complexity": 7,
        "parameters": 2
      }
    ],
    "deficiencies": ["HIGH_COMPLEXITY"],
    "quality_score": 90
  },
  "message": "Análisis de src/main.py completado"
}
```

---

## Endpoint 3: Resumen Ejecutivo de Métricas

### Request

```bash
curl -X POST http://localhost:5000/api/v1/metrics/summary \
  -H "Content-Type: application/json" \
  -d '{
    "repo_path": "./repos/my-project"
  }'
```

### Python

```python
import requests

response = requests.post(
    'http://localhost:5000/api/v1/metrics/summary',
    json={
        'repo_path': './repos/my-project'
    }
)

summary = response.json()['data']['summary']
print(f"Calidad General: {summary['overall_quality']}")
print(f"Archivos analizados: {summary['files_analyzed']}")
print(f"Complejidad promedio: {summary['average_complexity']}")
print(f"Deficiencias: {summary['deficiency_percentage']}%")
```

### Response (Success)

```json
{
  "success": true,
  "data": {
    "repository": "my-project",
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
        "message": "12 archivos con complejidad ciclomática alta (>15)"
      },
      {
        "severity": "MEDIUM",
        "message": "5 archivos con más de 200 líneas de código"
      }
    ],
    "recommendations": [
      "Refactorizar funciones con alta complejidad ciclomática",
      "Realizar revisión de código en profundidad"
    ]
  },
  "message": "Resumen de 42 archivos generado"
}
```

---

## Clasificación de Deficiencias

| Deficiencia | Descripción | Umbral |
|---|---|---|
| **HIGH_COMPLEXITY** | Complejidad ciclomática muy alta | > 10 (crítico > 15) |
| **LONG_METHOD** | Método/función demasiado largo | > 50 líneas |
| **TOO_MANY_PARAMETERS** | Función con demasiados parámetros | > 5 |

---

## Clasificación de Calidad General

| Rango | Calidad | Acción |
|---|---|---|
| < 10% deficiencias | **EXCELENTE** | Mantener estándares |
| 10-25% deficiencias | **BUENO** | Mejora gradual recomendada |
| 25-50% deficiencias | **REGULAR** | Refactorización necesaria |
| > 50% deficiencias | **DEFICIENTE** | Intervención inmediata |

---

## Códigos de Error

### 400 - Bad Request

```json
{
  "error": "Parámetro requerido faltante",
  "required": ["repo_path"]
}
```

### 400 - Archivo/Ruta no encontrada

```json
{
  "error": "Ruta del repositorio no encontrada: ./repos/invalid"
}
```

### 500 - Error del servidor

```json
{
  "error": "Error interno del servidor",
  "message": "Lizard no pudo procesar el archivo"
}
```

---

## Testing con Postman

1. **Crear request POST**:
   - URL: `http://localhost:5000/api/v1/metrics/repository`
   - Body (JSON):
   ```json
   {
     "repo_path": "./repos/my-project"
   }
   ```

2. **Copiar la respuesta** y usar datos reales en siguientes requests

3. **Guardar como Collection** para ejecuciones repetidas

---

## Lenguajes Soportados

- Python (.py)
- JavaScript (.js)
- TypeScript (.ts)
- Java (.java)
- C# (.cs)
- C++ (.cpp)
- C (.c)
- Go (.go)
- Ruby (.rb)
- PHP (.php)
- Swift (.swift)
- Kotlin (.kt)

---

## Notas Importantes

- **repo_path**: Debe ser una ruta local válida (no URL)
- **Quality Score**: Basado en número de deficiencias (100 - deficiencias * 10)
- **Análisis recursivo**: Escanea automáticamente subdirectorios
- **Timeout**: Análisis de repositorios grandes puede tardar

