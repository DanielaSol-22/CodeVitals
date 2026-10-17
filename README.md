# CodeVitals

Prototipo del proyecto de graduación **"Análisis de métricas de código en repositorios Git para la detección temprana de módulos con dificultades de mantenibilidad"**.

**Autora:** Daniela Esther Solórzano Sierra · Universidad Mariano Gálvez de Guatemala, sede Cobán
**Asesora:** Ing. Amanda Aurora Bac ·

CodeVitals analiza repositorios Git, calcula métricas de código e historial, las combina en un **puntaje de riesgo de mantenibilidad (0–100)** por módulo y propone **recomendaciones concretas** para los módulos con más riesgo.

## Qué mide

| Métrica | Herramienta | Participa en la fórmula |
|---|---|---|
| Complejidad ciclomática (CC) | Lizard | Sí |
| Frecuencia de modificaciones (componente *Churn*) | PyDriller | Sí |
| Líneas de código (LOC) | Lizard | Sí |
| Duplicación de código | Detector propio | Sí |
| Factor de bus | PyDriller | Sí |
| Complejidad cognitiva (solo Python) | Implementación propia (método de SonarSource) | No, se valida contra el puntaje |
| *Churn* en líneas (añadidas + eliminadas) | PyDriller | No, se valida contra el puntaje |

**Fórmula de riesgo**

```
Riesgo = (0.375·CC + 0.275·Frecuencia + 0.175·LOC + 0.125·Duplicación + 0.125·Factor de bus) / 1.075
```

- Los pesos suman 1.075, por lo que el puntaje se divide entre esa suma para que el máximo sea 100. Cada componente se normaliza a 0–100. CC es por tramos (≤5, ≤10, ≤15, >15); la frecuencia llega a 100 con 20 commits (`CHURN_MAX_COMMITS` en `risk_detector.py`) y LOC con 500 líneas.
- **Clasificación:** BAJO < 40 · MEDIO < 70 · ALTO ≥ 70.
- Validación estadística: correlación de **Spearman** y prueba **chi-cuadrado** (V de Cramér) de cada métrica contra el puntaje.
- **SonarQube** es una herramienta de apoyo opcional: contrasta las métricas propias, pero no altera el puntaje.

## Arquitectura

```
frontend/   React 18 + TypeScript + Vite + Tailwind 4   
→ http://localhost:8080 (Docker) / :5173 (desarrollo)
backend/    FastAPI + SQLAlchemy (async)               
 → http://localhost:8000  (docs en /docs)
            PostgreSQL 16                               
             → localhost:5433
```

## Cómo ejecutarlo

Requisitos: Docker Desktop.

```powershell
cd backend
docker compose up -d --build
docker compose ps
```

- Interfaz: <http://localhost:8080>
- API y documentación interactiva: <http://localhost:8000/docs>
- Estado: <http://localhost:8000/health>

Si PostgreSQL local ocupa el puerto 5433, define `DB_PORT` en `backend/.env`.

**Desarrollo del frontend** (con recarga en vivo):

```powershell
cd frontend
npm install
npm run dev        # http://localhost:5173
```

**SonarQube (opcional):** `docker compose --profile sonar up -d`. Ver `backend/SONARQUBE.md`.

## Uso rápido

1. Abre la interfaz y escribe la URL de un repositorio (`https://github.com/owner/repo`) o `local:<carpeta>` para uno clonado en `backend/repos/`.
2. Revisa el tablero: distribución del riesgo, módulos prioritarios y recomendaciones.
3. En **Validación**, ejecuta el análisis estadístico sobre varios repositorios.

**Principales endpoints** (prefijo `/api/v1`)

| Endpoint | Para qué sirve |
|---|---|
| `POST /risk/repository` | Análisis de riesgo de un repositorio |
| `POST /risk/priority` | Lista de módulos priorizados |
| `POST /risk/module` | Análisis de un archivo, con recomendaciones |
| `GET /risk/history`, `/risk/repositories`, `/risk/stats` | Historial y resumen guardado |
| `POST /analyze/repository`, `/analyze/repository/bus-factor` | Métricas de Git |
| `POST /metrics/repository`, `/metrics/file`, `/metrics/summary` | Métricas de código |
| `POST /stats/validation`, `/stats/validation/multi` | Validación estadística (uno o varios repositorios) |
| `GET /sonar/status`, `/sonar/measures`, `POST /sonar/compare` | Contraste con SonarQube |

## Seguridad

Solo se aceptan URL `https://` de GitHub, GitLab o Bitbucket; las rutas locales deben estar dentro de `repos/`; `API_KEY` opcional (encabezado `X-API-Key`); puertos enlazados a `127.0.0.1`; límite de análisis simultáneos. Detalle en `backend/SEGURIDAD.md`.

## Repositorios privados

La API nunca descarga repositorios privados ni maneja tokens. Clónalo tú en `backend/repos/<carpeta>` y analízalo con `local:<carpeta>`.

## Pruebas

```powershell
cd backend  ; python -m pytest        # backend
cd frontend ; npm test                # frontend (Vitest)
```

## Limitaciones conocidas

- La complejidad cognitiva y el detector de duplicación solo cubren Python.
- El factor de bus usa el nombre del autor del commit: una misma persona con distintos correos cuenta como autores distintos.
- Los pesos y topes de la fórmula son parte de la metodología de la investigación; cambiarlos exige repetir la validación estadística.
