# CodeVitals · frontend v2 (React + TypeScript + Vite + Tailwind)

Reemplaza al frontend anterior (copia de respaldo en `frontend-backup/`, incluye la página Historial de repositorios).

## Levantar
1. Backend: `cd backend && docker compose up` (API en http://localhost:8000).
2. `cd frontend && npm install && npm run dev`
3. Abrir http://localhost:5173 (el proxy de Vite redirige `/api` y `/health` al puerto 8000).

## Uso
- Al abrir muestra datos de ejemplo con un aviso.
- Escribe la URL del repositorio Git en el menú lateral y pulsa Analizar. Usa:
  - POST /api/v1/risk/repository  { repo_url }
  - POST /api/v1/risk/priority    { repo_url, limit }
- Pantallas: Inicio, Módulos (con detalle), Análisis, Reportes (CSV/Excel) y vista móvil.

## Pendiente del lado del backend
- Historial de métricas por fecha: la gráfica de evolución usa una serie de ejemplo.
- Puntajes 0-100 por componente a nivel repositorio: `/risk/repository` entrega promedios en bruto, por eso las barras muestran aviso si no hay datos.
- Tendencias "vs. anterior": solo aparecen si la API las entrega.

## Pruebas
`npm test` (Vitest + Testing Library).
