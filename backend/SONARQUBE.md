# SonarQube como herramienta de apoyo

CodeVitals calcula el puntaje de riesgo con su propio motor (PyDriller, Lizard y
el detector de duplicación). SonarQube **no cambia ese puntaje**: sirve para
contrastar las métricas propias y para aportar indicadores adicionales (code
smells, bugs, vulnerabilidades y deuda técnica). Es opcional: si no está
configurado, el sistema funciona igual.

## 1. Levantar SonarQube

```bash
docker compose --profile sonar up -d sonar_db sonarqube
```

Espera 1 a 2 minutos y abre http://localhost:9000 (usuario y contraseña
iniciales: `admin` / `admin`; te pedirá cambiarla).
En Docker Desktop con WSL2, si el contenedor se detiene por memoria, aumenta
la memoria en `.wslconfig` (mínimo 3 GB).

## 2. Crear un token

En SonarQube: Mi cuenta → Seguridad → Generar token (tipo *User*). Guárdalo en
`backend/.env`:

```
SONAR_URL=http://sonarqube:9000
SONAR_TOKEN=squ_xxxxxxxxxxxxxxxx
```

Reinicia la API: `docker compose up -d api`.

## 3. Escanear un repositorio

El repositorio debe estar en `backend/repos/<nombre>`:

```bash
docker compose --profile sonar run --rm sonar-scanner \
  -Dsonar.projectKey=loguru -Dsonar.projectBaseDir=/usr/src/loguru -Dsonar.sources=.
```

## 4. Consultar desde CodeVitals

| Endpoint | Función |
|---|---|
| `GET /api/v1/sonar/status` | Configuración y disponibilidad del servidor |
| `GET /api/v1/sonar/measures?project_key=loguru` | Medidas del proyecto y de cada archivo |
| `POST /api/v1/sonar/compare` | Contrasta las métricas propias con las de SonarQube |

Ejemplo de `compare`:

```json
{ "repo_url": "https://github.com/Delgan/loguru", "project_key": "loguru" }
```

Devuelve cuántos archivos coincidieron, la correlación de Spearman entre cada
métrica propia y la de SonarQube (complejidad, líneas de código y duplicación)
y los totales de code smells, bugs, vulnerabilidades y deuda técnica.
