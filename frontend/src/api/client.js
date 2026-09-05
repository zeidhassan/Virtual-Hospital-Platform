import axios from 'axios';

// Relative by default so this always goes through the Vite dev proxy (see
// vite.config.js) in development and same-origin in production, without
// needing VITE_API_BASE_URL set at build time. Override it only for a
// deployment where the API genuinely lives on a different origin.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    // Tells ngrok's free-tier edge to skip its "click to continue" browser
    // warning interstitial for this request. Without it, a visitor who
    // hasn't clicked through that page yet in their browser gets the
    // interstitial's HTML back instead of a real API response on every
    // call this client makes — harmless to leave on outside of ngrok.
    'ngrok-skip-browser-warning': 'true',
  },
});

// Token lives in memory, not localStorage, so it can't be read by an
// injected script that scrapes localStorage — but a page reload still needs
// something to restore the session from, so hxc_token is also written to
// localStorage on login (see AuthContext). That trade-off is real: anything
// with script execution on this origin can still reach the token via
// localStorage. The in-memory copy only helps a reader that isn't running
// script here at all (e.g. a browser extension or another tab's process
// inspecting memory), which is a narrower guarantee than "not in localStorage".
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
    // 401 — clear the session everywhere it's stored (in-memory token +
    // localStorage) and redirect to login. Clearing only the in-memory copy
    // left the localStorage token behind, so the next page load restored a
    // dead session that failed every request until the user manually
    // logged out.
    if (error.response?.status === 401 && !error.config._retry) {
      clearAccessToken();
      localStorage.removeItem('hxc_token');
      localStorage.removeItem('hxc_user');
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
