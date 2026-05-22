import axios from 'axios';

// Backend server URL (Express) - Dynamically loaded from Vite environment variable or localhost fallback
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: Attach JWT token to requests if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor: Global error handler (e.g. handle 401 token expiration)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear auth tokens/state if unauthorized (e.g., token expired)
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Dispatch a custom event to notify App component to switch to auth view
      window.dispatchEvent(new Event('auth-expired'));
    }
    return Promise.reject(error);
  }
);
