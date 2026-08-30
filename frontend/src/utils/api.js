import axios from 'axios';

const resolveBaseURL = () => {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL.replace(/\/+$/, '');
  }
  if (typeof window !== 'undefined') {
    const { protocol, hostname, port } = window.location;
    // Local development: route to port 5000 if running frontend on dev ports
    if (port === '5173' || port === '4173' || hostname === 'localhost' || hostname === '127.0.0.1') {
      const backendPort = import.meta.env.VITE_BACKEND_PORT || '5000';
      return `${protocol}//${hostname}:${backendPort}`;
    }
    return window.location.origin;
  }
  return '';
};

const api = axios.create({
  baseURL: resolveBaseURL(),
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');

  // Only attach the stored user token if no custom Authorization header is explicitly provided
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const msg = error.response.data?.message;
      if (
        msg === 'Your session has expired or been terminated' ||
        msg === 'Your session is invalid or expired' ||
        msg === 'Authentication is required'
      ) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    return Promise.reject(error);
  }
);

export { resolveBaseURL };
export default api;
