import axios from "axios";

const apiClient = axios.create({
  baseURL: "http://localhost:8000/api/v1",
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add request interceptor for debugging
apiClient.interceptors.request.use(
  (config) => {
    console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error("[API] Request error:", error);
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => {
    console.log(`[API] Response 200:`, response.data);
    return response;
  },
  (error) => {
    console.error("[API] Response error:", error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export { apiClient };

/** Mensaje legible para mostrar al usuario a partir de un error de Axios. */
export function errorMessage(err: any, fallback = "No se pudo obtener datos"): string {
  const detail = err?.response?.data?.detail;
  if (typeof detail === "string" && detail) return detail;
  if (Array.isArray(detail) && detail[0]?.msg) return String(detail[0].msg);
  if (err?.code === "ECONNABORTED") return "El análisis tardó demasiado. Intenta de nuevo con un repositorio más pequeño.";
  if (!err?.response) return "No hay conexión con la API. Verifica que el backend esté en ejecución.";
  return fallback;
}
