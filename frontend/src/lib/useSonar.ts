import { useQuery } from '@tanstack/react-query'
import { apiClient } from './api'
import { defaultProjectKey, normalizeSonarFiles, normalizeSonarStatus } from './sonar'

/** Estado del servidor SonarQube. Si la API no responde o Sonar no está configurado, simplemente queda "apagado". */
export function useSonarStatus() {
  return useQuery({
    queryKey: ['sonar', 'status'],
    queryFn: async () => normalizeSonarStatus(await apiClient.sonarStatus()),
    staleTime: 60_000,
    retry: false,
  })
}

/** Medidas por archivo del proyecto en SonarQube (solo si el servidor está disponible). */
export function useSonarFiles(repoRef: string, enabled: boolean, projectKey?: string) {
  const key = projectKey || defaultProjectKey(repoRef)
  return useQuery({
    queryKey: ['sonar', 'files', key],
    queryFn: async () => normalizeSonarFiles(await apiClient.sonarFiles(key)),
    enabled: enabled && !!key,
    staleTime: 5 * 60_000,
    retry: false,
  })
}
