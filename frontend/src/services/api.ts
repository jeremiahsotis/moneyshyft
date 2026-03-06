import axios from 'axios';
import type { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';

const api: AxiosInstance = axios.create({
  baseURL: '/api/v1',
  withCredentials: true, // Important for sending cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

// Track if we're currently refreshing the token to avoid multiple refresh attempts
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: Error | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve();
    }
  });

  failedQueue = [];
};

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // If we get a 401 error and haven't already tried to refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Don't intercept auth endpoints - let errors pass through to UI
      if (originalRequest.url?.includes('/auth/refresh') ||
          originalRequest.url?.includes('/auth/login') ||
          originalRequest.url?.includes('/auth/signup') ||
          originalRequest.url?.includes('/auth/me')) {
        return Promise.reject(error);
      }

      // Don't redirect if already on login page (prevents redirect loop)
      if (window.location.pathname === '/login') {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // If already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => {
            return api(originalRequest);
          })
          .catch(err => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Try to refresh the token
        await api.post('/auth/refresh');

        // Token refreshed successfully, process queued requests
        processQueue(null);
        isRefreshing = false;

        // Retry the original request
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, clear queue
        processQueue(refreshError as Error);
        isRefreshing = false;

        // Let the router guard handle navigation - don't force redirect here
        return Promise.reject(refreshError);
      }
    }

    // For other errors, just pass them through
    return Promise.reject(error);
  }
);

export default api;
