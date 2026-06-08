import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ==================== Auth API ====================
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  getMe: () => api.get('/auth/me'),
};

// ==================== Users API ====================
export const usersAPI = {
  getAll: (params) => api.get('/users', { params }),
  getById: (id) => api.get(`/users/${id}`),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
};

// ==================== Products API ====================
export const productsAPI = {
  getAll: (params) => api.get('/products', { params }),
  getById: (id) => api.get(`/products/${id}`),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`),
};

// ==================== Orders API ====================
export const ordersAPI = {
  getAll: (params) => api.get('/orders', { params }),
  getById: (id) => api.get(`/orders/${id}`),
  create: (data) => api.post('/orders', data),
  update: (id, data) => api.put(`/orders/${id}`, data),
  delete: (id) => api.delete(`/orders/${id}`),
};

// ==================== Credit Customers API ====================
export const creditAPI = {
  getAll: (params) => api.get('/credit-customers', { params }),
  getById: (id) => api.get(`/credit-customers/${id}`),
  create: (data) => api.post('/credit-customers', data),
  update: (id, data) => api.put(`/credit-customers/${id}`, data),
  postPayment: (id, data) => api.put(`/credit-customers/${id}/payment`, data),
  delete: (id) => api.delete(`/credit-customers/${id}`),
};

// ==================== Cheques API ====================
export const chequesAPI = {
  getAll: (params) => api.get('/cheques', { params }),
  getById: (id) => api.get(`/cheques/${id}`),
  create: (data) => api.post('/cheques', data),
  updateStatus: (id, data) => api.put(`/cheques/${id}/status`, data),
  delete: (id) => api.delete(`/cheques/${id}`),
};

// ==================== Suppliers API ====================
export const suppliersAPI = {
  getAll: (params) => api.get('/suppliers', { params }),
  getById: (id) => api.get(`/suppliers/${id}`),
  create: (data) => api.post('/suppliers', data),
  update: (id, data) => api.put(`/suppliers/${id}`, data),
  delete: (id) => api.delete(`/suppliers/${id}`),
  createPO: (supplierId, data) => api.post(`/suppliers/${supplierId}/purchase-orders`, data),
};

// ==================== Purchase Orders API ====================
export const purchaseOrdersAPI = {
  getAll: (params) => api.get('/purchase-orders', { params }),
  update: (id, data) => api.put(`/purchase-orders/${id}`, data),
};

// ==================== AI Features API ====================
export const aiAPI = {
  forecastDemand: (data) => api.post('/ai/forecast', data),
  assessCreditRisk: (data) => api.post('/ai/credit-risk', data),
};

export default api;
