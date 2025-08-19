import axios from 'axios';
import config from '../config/config';

// API Configuration
// Automatically detects environment and uses appropriate URL
const API = axios.create({
  baseURL: config.apiBaseURL,
});

console.log('🚀 [API Service] Initialized with baseURL:', config.apiBaseURL);

// Add request interceptor
API.interceptors.request.use(config => {
  const token = localStorage.getItem('token') || localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  console.log('🌐 [API Service] Request:', {
    method: config.method?.toUpperCase(),
    url: config.url,
    baseURL: config.baseURL,
    fullURL: `${config.baseURL}${config.url}`,
    hasToken: !!token,
    headers: config.headers
  });
  
  return config;
});

// Add response interceptor
API.interceptors.response.use(
  response => {
    console.log('✅ [API Service] Response:', {
      status: response.status,
      url: response.config.url,
      data: response.data
    });
    return response;
  },
  error => {
    console.error('❌ [API Service] Error:', {
      status: error.response?.status,
      url: error.config?.url,
      message: error.response?.data?.message || error.message,
      data: error.response?.data
    });
    
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('access_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default API;