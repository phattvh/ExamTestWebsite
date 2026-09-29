import type { AxiosInstance } from 'axios';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

// Refresh chỉ nên chạy 1 lần dù có nhiều request 401 cùng lúc.
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem('refresh_token');
  if (!refreshToken) return null;

  if (!refreshPromise) {
    refreshPromise = axios
      .post(`${API_URL}/auth/refresh`, { refresh_token: refreshToken })
      .then((res) => {
        const { access_token, refresh_token } = res.data;
        localStorage.setItem('access_token', access_token);
        localStorage.setItem('refresh_token', refresh_token);
        return access_token as string;
      })
      .catch(() => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        return null;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

/**
 * Gắn interceptor dùng chung cho 1 axios instance:
 * - Request: tự động thêm header Authorization từ access_token đang lưu.
 * - Response: khi gặp 401, thử refresh access_token 1 lần và gửi lại request gốc.
 *   Nếu refresh thất bại (hoặc không có refresh_token), điều hướng về /login.
 */
export function attachAuthInterceptors(instance: AxiosInstance) {
  instance.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('access_token');
      if (token && config.headers) {
        config.headers['Authorization'] = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  instance.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;
      if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
        originalRequest._retry = true;
        const newToken = await refreshAccessToken();
        if (newToken) {
          originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
          return instance(originalRequest);
        }
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }
  );

  return instance;
}

export { API_URL };
