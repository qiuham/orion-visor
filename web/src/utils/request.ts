import axios from 'axios';
import { useAuthStore } from '@/store/auth';

const request = axios.create({
  baseURL: '/api',
  timeout: 15000,
});

// 请求拦截：自动附加 JWT token
request.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 响应拦截：统一错误处理
request.interceptors.response.use(
  (res) => res.data,
  (err) => {
    if (err.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(err);
  },
);

export default request;
