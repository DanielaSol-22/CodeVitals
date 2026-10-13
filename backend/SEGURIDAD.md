# Seguridad de CodeVitals

## Qué se protege

| Riesgo | Antes | Ahora |
|---|---|---|
| URL de repositorio arbitraria (`file://`, `ssh://`, `ext::`, `--opciones`, direcciones internas) | Se pasaba tal cual a git | Solo `https://` y solo GitHub, GitLab o Bitbucket, con la forma `host/propietario/repositorio`. Sin credenciales, puertos ni parámetros |
| `repo_path` y `file_path` arbitrarios (leer cualquier carpeta o archivo del servidor) | `/api/v1/metrics/*` aceptaba cualquier ruta | Deben estar dentro de `REPOS_ROOT` (`/code/repos`); se resuelven enlaces simbólicos |
| Path traversal en `/risk/module` y en el endpoint de churn (`../../etc/passwd`) | `os.path.join` sin control | Ruta relativa obligatoria, sin `..`, y el resultado debe quedar dentro del repositorio |
| Acceso sin autenticación | Abierto | `API_KEY` opcional: si se define, todos los endpoints (excepto `/health`) exigen el encabezado `X-API-Key` |
| Saturación (muchos análisis a la vez) | Sin límite | Máximo `MAX_PARALLEL_ANALYSES` (3) análisis pesados simultáneos; `limit` acotado a 1–100 |
| Git pidiendo usuario/contraseña por consola | Podía colgar la solicitud | `GIT_TERMINAL_PROMPT=0`: falla de inmediato |
| Base de datos y SonarQube expuestos a la red | Puertos abiertos | Enlazados a `127.0.0.1`; la API también (cambiar con `API_BIND=0.0.0.0` para publicarla) |
| Contraseña de PostgreSQL fija | `codevitals` en el compose | Se toma de `POSTGRES_PASSWORD` en `.env` |
| `debug` activo y CORS abierto a todos los métodos | `debug=True`, `*` | `debug=False`; solo GET, POST y OPTIONS con los encabezados necesarios |

La inyección SQL no aplica: todas las consultas usan SQLAlchemy con parámetros.

## Configuración recomendada para producción (`backend/.env`)

```
POSTGRES_PASSWORD=<contraseña larga y única>
API_KEY=<clave larga y aleatoria>
API_BIND=0.0.0.0
```

Y en `frontend/.env`: `VITE_API_KEY=<la misma clave>`.
No subas `.env` ni `repos/` a Git (agrégalos a `.gitignore`).

## Repositorios privados y proyectos locales

CodeVitals no guarda ni pide credenciales: nunca descarga un repositorio privado. En su lugar lee uno que **ya está clonado** en `backend/repos/`:

1. Clónalo en tu equipo con tus propias credenciales, dentro de `backend/repos/`:
   ```bash
   cd backend/repos
   git clone https://github.com/usuario/mi-proyecto-privado
   ```
   También sirve un proyecto que solo existe en tu disco (debe tener `.git`).
2. En la interfaz escribe `local:mi-proyecto-privado` en lugar de la URL.

Se aplican las mismas validaciones: la carpeta debe estar dentro de `repos/` y contener un repositorio Git. Cuando el repositorio cambie, actualízalo con `git pull` y vuelve a analizar.
Si el repositorio es de otro servidor (Azure DevOps, un Gitea propio), basta clonarlo igual y usar `local:`.

Por qué no se aceptan tokens por la API: guardar o transmitir un token de acceso personal obliga a cifrarlo, rotarlo y protegerlo en cada solicitud; para una tesis con un único usuario, clonar localmente es más seguro y no abre ninguna superficie nueva.

## Lo que queda fuera de alcance

- Autenticación por usuario (hoy es una sola clave compartida).
- HTTPS: debe terminarlo un proxy inverso (Nginx, Caddy) delante de la API.
- Límite de tamaño de repositorios y de tasa de solicitudes por IP.
- Descargar repositorios privados desde la API (requiere manejo seguro de credenciales; se usa `local:`).
