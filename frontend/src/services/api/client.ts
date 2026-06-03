import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'https://fila-production-3062.up.railway.app';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ── Request interceptor: attach Bearer token ──────────────────────────────────
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('fila_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ── Response interceptor: handle 401 ─────────────────────────────────────────
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('fila_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);
