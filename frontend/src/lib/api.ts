import axios from 'axios'

/* eslint-disable @typescript-eslint/no-explicit-any */
const http = axios.create({ baseURL: '', timeout: 120000 })

// Si el backend tiene API_KEY configurada, se envía en cada solicitud (VITE_API_KEY en .env del frontend).
const API_KEY = import.meta.env.VITE_API_KEY as string | undefined
if (API_KEY) http.defaults.headers.common['X-API-Key'] = API_KEY

export const apiClient = {
  async getHealth(): Promise<boolean> {
    try {
      await http.get('/health', { timeout: 4000 })
      return true
    } catch {
      return false
    }
  },
  async analyzeRepositoryRisk(repoPath: string): Promise<any> {
    const { data } = await http.post('/api/v1/risk/repository', { repo_url: repoPath })
    return data
  },
  async getPriorityList(repoPath: string, limit = 100): Promise<any> {
    const { data } = await http.post('/api/v1/risk/priority', { repo_url: repoPath, limit })
    return data
  },
  async analyzeModuleRisk(repoPath: string, filePath: string): Promise<any> {
    const { data } = await http.post('/api/v1/risk/module', { repo_url: repoPath, file_path: filePath })
    return data
  },
  async getHistory(repoUrl: string): Promise<any> {
    const { data } = await http.get('/api/v1/risk/history', { params: { repo_url: repoUrl } })
    return data
  },
  /** Validación estadística (Spearman + chi-cuadrado) sobre uno o varios repositorios. Puede tardar varios minutos. */
  async validateRepos(repoUrls: string[], alpha = 0.05): Promise<any> {
    const { data } = await http.post('/api/v1/stats/validation/multi', { repo_urls: repoUrls, alpha }, { timeout: 30 * 60 * 1000 })
    return data
  },
}

export function errorMessage(e: unknown): string {
  if (axios.isAxiosError(e)) {
    const d = e.response?.data as any
    const first = Array.isArray(d?.detail) ? d.detail[0]?.msg : undefined // errores 422 de validación
    const detail = typeof d?.detail === 'string' ? d.detail
      : typeof d?.detail?.message === 'string' ? d.detail.message
      : typeof first === 'string' ? first.replace(/^Value error, /, '') : undefined
    return detail || d?.error || d?.message || (e.code === 'ERR_NETWORK' ? 'No se pudo conectar con la API en localhost:8000.' : e.message)
  }
  return e instanceof Error ? e.message : 'Error desconocido'
}
