import axios, { AxiosError } from 'axios';
import type { ApiFailure } from '@/types/api';

const apiBaseUrl = import.meta.env.VITE_API_URL || 'https://probe-backend-3v0d.onrender.com';

export const http = axios.create({
  baseURL: `${apiBaseUrl}/api`,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

http.interceptors.request.use((config) => {
  const token = localStorage.getItem('uho_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

http.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiFailure>) => {
    if (error.response?.status === 401 && !window.location.pathname.startsWith('/login')) {
      localStorage.removeItem('uho_token');
      localStorage.removeItem('uho_user');
    }
    const message = error.response?.data?.error?.message ?? error.message ?? 'Something went wrong';
    return Promise.reject(new Error(message));
  },
);
