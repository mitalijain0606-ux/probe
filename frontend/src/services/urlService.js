import api from './api';

export const urlService = {
  async getUrls() {
    const res = await api.get('/urls');
    return res.data?.data || [];
  },

  async createUrl(data) {
    const res = await api.post('/urls', data);
    return res.data?.data;
  },

  async getUrlById(id) {
    const res = await api.get(`/urls/${id}`);
    return res.data?.data;
  },

  async deleteUrl(id) {
    const res = await api.delete(`/urls/${id}`);
    return res.data;
  },

  async manualCheck(id) {
    const res = await api.post(`/urls/${id}/check`);
    return res.data?.data;
  },

  async getUrlHistory(id, limit = 50) {
    const res = await api.get(`/urls/${id}/history?limit=${limit}`);
    return res.data?.data || [];
  },

  async importUrls(urls) {
    const res = await api.post('/urls/import', { urls });
    return res.data?.data;
  },

  async getDashboardStats() {
    const res = await api.get('/dashboard/stats');
    return res.data?.data;
  },
};
