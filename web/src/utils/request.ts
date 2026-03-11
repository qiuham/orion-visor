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

// 响应拦截：统一错误处理，自动解包 { code, msg, data } 格式
request.interceptors.response.use(
  (res) => {
    const body = res.data;
    // 如果后端返回统一格式 { code, msg, data }
    if (body && typeof body.code === 'number') {
      if (body.code === 200) {
        return body.data;
      }
      if (body.code === 401) {
        useAuthStore.getState().logout();
        window.location.href = '/login';
      }
      return Promise.reject(new Error(body.msg || '请求失败'));
    }
    return body;
  },
  (err) => {
    if (err.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(err);
  },
);

export default request;
