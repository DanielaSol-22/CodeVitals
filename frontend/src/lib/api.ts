import axios from 'axios'

/* eslint-disable @typescript-eslint/no-explicit-any */
const http = axios.create({ baseURL: '', timeout: 120000 })

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
}

export function errorMessage(e: unknown): string {
  if (axios.isAxiosError(e)) {
    const d = e.response?.data as any
    return (typeof d?.detail === 'string' ? d.detail : undefined) || d?.error || d?.message || (e.code === 'ERR_NETWORK' ? 'No se pudo conectar con la API en localhost:8000.' : e.message)
  }
  return e instanceof Error ? e.message : 'Error desconocido'
}
