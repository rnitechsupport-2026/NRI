import axios from 'axios';

const isProduction = import.meta.env.PROD;
const apiBase = import.meta.env.VITE_API_URL || (isProduction ? 'https://rnibotmodel-1.onrender.com/api' : '/api');

const api = axios.create({
  baseURL: apiBase,
  headers: { 'Content-Type': 'application/json' },
});

export const TOKEN_KEY = 'rni_token';

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error.response?.status;
    if (status === 401 && localStorage.getItem(TOKEN_KEY)) {
      localStorage.removeItem(TOKEN_KEY);
      // Let the app re-render as a guest instead of dying on a stale token.
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login?expired=1';
      }
    }
    return Promise.reject(error);
  }
);

/** Pull a human-readable message out of any axios failure. */
export function errMsg(error, fallback = 'Something went wrong. Please try again.') {
  if (error?.response?.data?.message) return error.response.data.message;
  if (error?.code === 'ERR_NETWORK') return 'Cannot reach the server. Please check your internet connection.';
  return error?.message || fallback;
}

/** Field-level validation errors returned by the API (zod). */
export const errFields = (error) => error?.response?.data?.fields || {};

export default api;
