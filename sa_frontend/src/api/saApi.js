import axios from 'axios';

const API_BASE_URL = 'http://localhost:5002/api/v1';

const saApi = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

saApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('sa_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const saAuthApi = {
  login: (email, password) => saApi.post('/sa/auth/login', { email, password }),
};

export const saTenantApi = {
  getDashboardSummary: () => saApi.get('/sa/tenants/dashboard-summary'),
  listTenants: () => saApi.get('/sa/tenants'),
  provisionTenant: (data) => saApi.post('/sa/tenants/provision', data),
  toggleTenantStatus: (tenantId) => saApi.patch(`/sa/tenants/${tenantId}/status`),
  updateTenantPlan: (tenantId, plan) => saApi.patch(`/sa/tenants/${tenantId}/plan`, { plan }),
  getPlatformStats: () => saApi.get('/sa/tenants/stats'),
};

export default saApi;
