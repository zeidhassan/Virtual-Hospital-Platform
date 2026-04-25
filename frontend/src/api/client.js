import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// In-memory token store (more secure than localStorage)
let accessToken = null;

export const setAccessToken = (token) => {
  accessToken = token;
};

export const clearAccessToken = () => {
  accessToken = null;
};

export const getAccessToken = () => accessToken;

// Request interceptor: attach token
apiClient.interceptors.request.use(
  (config) => {
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle errors
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    // 401 — clear token and redirect to login
    if (error.response?.status === 401 && !error.config._retry) {
      clearAccessToken();
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    // 429 — rate limited
    if (error.response?.status === 429) {
      const retryAfter = error.response.headers['retry-after'];
      error.userMessage = retryAfter
        ? `Too many requests. Please try again in ${retryAfter} seconds.`
        : 'Too many requests. Please wait a moment and try again.';
    }

    // 5xx — server error
    if (error.response?.status >= 500) {
      error.userMessage = 'Something went wrong on our end. Please try again.';
    }

    return Promise.reject(error);
  }
);

export default apiClient;
