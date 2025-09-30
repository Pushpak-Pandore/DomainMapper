import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for logging
apiClient.interceptors.request.use(
  (config) => {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('API Response Error:', error.response?.data || error.message);
    
    // Handle common errors
    if (error.response?.status === 404) {
      throw new Error('Resource not found');
    } else if (error.response?.status === 500) {
      throw new Error('Server error occurred');
    } else if (error.code === 'ECONNABORTED') {
      throw new Error('Request timeout');
    }
    
    throw error;
  }
);

export const apiService = {
  // Legacy endpoints
  async helloWorld() {
    try {
      const response = await apiClient.get('/');
      return response.data;
    } catch (error) {
      throw new Error(`Hello world API failed: ${error.message}`);
    }
  },

  async createStatusCheck(data) {
    try {
      const response = await apiClient.post('/status', data);
      return response.data;
    } catch (error) {
      throw new Error(`Create status check failed: ${error.message}`);
    }
  },

  async getStatusChecks() {
    try {
      const response = await apiClient.get('/status');
      return response.data;
    } catch (error) {
      throw new Error(`Get status checks failed: ${error.message}`);
    }
  },

  // Enumeration Job APIs
  async createJob(jobData) {
    try {
      const response = await apiClient.post('/jobs', jobData);
      return response.data;
    } catch (error) {
      throw new Error(`Create job failed: ${error.message}`);
    }
  },

  async getJobs(limit = 50, skip = 0) {
    try {
      const response = await apiClient.get(`/jobs?limit=${limit}&skip=${skip}`);
      return response.data;
    } catch (error) {
      throw new Error(`Get jobs failed: ${error.message}`);
    }
  },

  async getJob(jobId) {
    try {
      const response = await apiClient.get(`/jobs/${jobId}`);
      return response.data;
    } catch (error) {
      throw new Error(`Get job failed: ${error.message}`);
    }
  },

  async cancelJob(jobId) {
    try {
      const response = await apiClient.delete(`/jobs/${jobId}`);
      return response.data;
    } catch (error) {
      throw new Error(`Cancel job failed: ${error.message}`);
    }
  },

  async getJobSubdomains(jobId, limit = 100, skip = 0) {
    try {
      const response = await apiClient.get(`/jobs/${jobId}/subdomains?limit=${limit}&skip=${skip}`);
      return response.data;
    } catch (error) {
      throw new Error(`Get job subdomains failed: ${error.message}`);
    }
  },

  async getJobProgress(jobId) {
    try {
      const response = await apiClient.get(`/jobs/${jobId}/progress`);
      return response.data;
    } catch (error) {
      throw new Error(`Get job progress failed: ${error.message}`);
    }
  },

  // Analytics APIs
  async getDashboardStats() {
    try {
      const response = await apiClient.get('/analytics/dashboard');
      return response.data;
    } catch (error) {
      throw new Error(`Get dashboard stats failed: ${error.message}`);
    }
  },

  async getTrends(days = 7) {
    try {
      const response = await apiClient.get(`/analytics/trends?days=${days}`);
      return response.data;
    } catch (error) {
      throw new Error(`Get trends failed: ${error.message}`);
    }
  },

  async trackEvent(eventData) {
    try {
      const response = await apiClient.post('/analytics/events', eventData);
      return response.data;
    } catch (error) {
      console.warn('Event tracking failed:', error.message);
      // Don't throw error for analytics tracking failures
      return null;
    }
  },

  async getUserActivity(sessionId = null, limit = 100) {
    try {
      const params = new URLSearchParams();
      if (sessionId) params.append('session_id', sessionId);
      params.append('limit', limit.toString());
      
      const response = await apiClient.get(`/analytics/user-activity?${params}`);
      return response.data;
    } catch (error) {
      throw new Error(`Get user activity failed: ${error.message}`);
    }
  },

  // Real-time updates (for future WebSocket implementation)
  async subscribeToJobUpdates(jobId, onUpdate) {
    // This would implement WebSocket connection for real-time updates
    // For now, we'll use polling via React Query
    console.log(`Subscribing to updates for job ${jobId}`);
    return () => console.log(`Unsubscribed from job ${jobId}`);
  }
};

export default apiService;