import { create } from 'zustand';
import api from '../lib/api';

const useAuthStore = create((set) => ({
  user: null,
  isAuthenticated: false,
  loading: true,

  login: async (phone, password) => {
    const { data } = await api.post('/auth/login', { phone, password });
    if (data.data.user.role !== 'admin') throw new Error('Accès administrateur requis');
    localStorage.setItem('admin_token', data.data.token);
    localStorage.setItem('admin_refresh_token', data.data.refreshToken);
    set({ user: data.data.user, isAuthenticated: true });
    return data.data;
  },

  loadUser: async () => {
    try {
      const token = localStorage.getItem('admin_token');
      if (!token) { set({ loading: false }); return; }
      const { data } = await api.get('/auth/me');
      if (data.data.role !== 'admin') throw new Error();
      set({ user: data.data, isAuthenticated: true, loading: false });
    } catch {
      localStorage.removeItem('admin_token');
      set({ user: null, isAuthenticated: false, loading: false });
    }
  },

  logout: () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_refresh_token');
    set({ user: null, isAuthenticated: false });
  },
}));

export default useAuthStore;
