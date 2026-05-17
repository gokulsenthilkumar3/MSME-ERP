import axios from 'axios';
import { useAuthStore } from '../store';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001/v1';

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT to every request
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 — clear auth
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ---- Auth ----
export const authApi = {
  sendOtp: (phone: string) => api.post('/auth/otp/send', { phone }),
  verifyOtp: (phone: string, otp: string) =>
    api.post('/auth/otp/verify', { phone, otp }),
  onboard: (data: object) => api.post('/auth/onboard', data),
  getMe: () => api.get('/auth/me'),
  updateTenant: (data: object) => api.patch('/auth/me/tenant', data),
};

// ---- Products ----
export const productsApi = {
  list: (params?: object) => api.get('/products', { params }),
  lowStock: () => api.get('/products/low-stock'),
  get: (id: string) => api.get(`/products/${id}`),
  create: (data: object) => api.post('/products', data),
  update: (id: string, data: object) => api.patch(`/products/${id}`, data),
  delete: (id: string) => api.delete(`/products/${id}`),
  adjustStock: (id: string, data: object) => api.post(`/products/${id}/stock`, data),
};

// ---- Customers ----
export const customersApi = {
  list: (params?: object) => api.get('/customers', { params }),
  get: (id: string) => api.get(`/customers/${id}`),
  getLedger: (id: string, params?: object) =>
    api.get(`/customers/${id}/ledger`, { params }),
  create: (data: object) => api.post('/customers', data),
  update: (id: string, data: object) => api.patch(`/customers/${id}`, data),
  recordPayment: (id: string, data: object) =>
    api.post(`/customers/${id}/payment`, data),
};

// ---- Invoices ----
export const invoicesApi = {
  list: (params?: object) => api.get('/invoices', { params }),
  get: (id: string) => api.get(`/invoices/${id}`),
  create: (data: object) => api.post('/invoices', data),
  updateStatus: (id: string, status: string) =>
    api.patch(`/invoices/${id}/status`, { status }),
  getPdf: (id: string) => api.get(`/invoices/${id}/pdf`),
  share: (id: string) => api.post(`/invoices/${id}/share`),
};

// ---- Dashboard ----
export const dashboardApi = {
  summary: () => api.get('/dashboard/summary'),
  topProducts: (days?: number) => api.get('/dashboard/top-products', { params: { days } }),
  topCustomers: () => api.get('/dashboard/top-customers'),
  salesTrend: () => api.get('/dashboard/sales-trend'),
};
