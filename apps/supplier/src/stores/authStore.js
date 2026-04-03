import { create } from 'zustand';
import api from '../lib/api';

const useAuthStore = create((set) => ({
  user: null,
  supplier: null,
  isAuthenticated: false,
  loading: true,

  login: async (phone, password) => {
    const { data } = await api.post('/auth/login', { phone, password });
    if (data.data.user.role !== 'supplier') throw new Error('Compte fournisseur requis');
    localStorage.setItem('supplier_token', data.data.token);
    localStorage.setItem('supplier_refresh_token', data.data.refreshToken);
    set({ user: data.data.user, isAuthenticated: true });
    return data.data;
  },

  register: async (formData) => {
    const { data } = await api.post('/suppliers/register', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data.data;
  },

  loadUser: async () => {
    try {
      const token = localStorage.getItem('supplier_token');
      if (!token) { set({ loading: false }); return; }
      const { data } = await api.get('/auth/me');
      set({ user: data.data, isAuthenticated: true, loading: false });
    } catch {
      set({ user: null, isAuthenticated: false, loading: false });
    }
  },

  loadSupplierProfile: async () => {
    try {
      const { data } = await api.get('/suppliers/profile');
      set({ supplier: data.data });
    } catch {}
  },

  logout: () => {
    localStorage.removeItem('supplier_token');
    localStorage.removeItem('supplier_refresh_token');
    set({ user: null, supplier: null, isAuthenticated: false });
  },
}));

export default useAuthStore;
