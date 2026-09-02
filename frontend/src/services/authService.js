import api from './api';

export const authService = {
  async signup(email, password) {
    const res = await api.post('/auth/signup', { email, password });
    if (res.data?.data?.token) {
      localStorage.setItem('token', res.data.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.data.user));
    }
    return res.data;
  },

  async login(email, password) {
    const res = await api.post('/auth/login', { email, password });
    if (res.data?.data?.token) {
      localStorage.setItem('token', res.data.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.data.user));
    }
    return res.data;
  },

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  getCurrentUser() {
    const stored = localStorage.getItem('user');
    try {
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  },

  getToken() {
    return localStorage.getItem('token');
  },
};
