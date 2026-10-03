import axios from "axios";

const apiClient = axios.create({
  baseURL: "http://localhost:5000/api/v1",
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