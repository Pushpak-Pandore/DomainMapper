import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      // Redirect to login if needed
    }
    return Promise.reject(error);
  }
);

export const scanService = {
  // Create new scan
  createScan: (scanData) => api.post('/api/scan', scanData),
  
  // Get scan status
  getScanStatus: (scanId) => api.get(`/api/scan/${scanId}`),
  
  // List all scans
  listScans: (params = {}) => api.get('/api/scans', { params }),
  
  // Delete scan
  deleteScan: (scanId) => api.delete(`/api/scan/${scanId}`),
  
  // Download report
  downloadReport: (scanId, format) => 
    api.get(`/api/scan/${scanId}/report/${format}`, { responseType: 'blob' }),
  
  // Get domains
  getDomains: () => api.get('/api/domains'),
  
  // Get statistics
  getStats: () => api.get('/api/stats'),
};

export const healthService = {
  // Check API health
  checkHealth: () => api.get('/'),
};

export default api;