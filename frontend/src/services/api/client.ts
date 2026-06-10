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
    const raw = localStorage.getItem('fila_token');
    if (raw) {
      try {
        // zustand persist wraps the value as { state: { token: '...' }, version: 0 }
        const parsed = JSON.parse(raw);
        const token: string | null = parsed?.state?.token ?? null;
        if (token) config.headers.Authorization = `Bearer ${token}`;
      } catch {
        // fallback: raw string token (shouldn't happen, but just in case)
        config.headers.Authorization = `Bearer ${raw}`;
      }
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
