import axios from 'axios';

// Lightweight HTTP client for the Exam Admin Super App (VJP Pro).
// Reuses the gateway base URL; auth header read lazily so token refresh is picked up.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE ?? 'http://localhost/api',
  timeout: 8000, // fail fast -> UI can fall back to offline cache (speed UX)
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token && config.headers) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
