import { create } from 'zustand';
import api from '../lib/api';
import toast from 'react-hot-toast';

const useAuthStore = create((set) => ({
  user: null,
  isAuthenticated: false,
  loading: true,

  login: async (phone, password) => {
    const { data } = await api.post('/auth/login', { phone, password });
    if (data.data.user.role !== 'driver') throw new Error('Compte livreur requis');
    localStorage.setItem('driver_token', data.data.accessToken);
    localStorage.setItem('driver_refresh_token', data.data.refreshToken);
    set({ user: data.data.user, isAuthenticated: true, loading: false });
    return data.data;
  },

  register: async (formData) => {
    const { data } = await api.post('/drivers/register', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    toast.success('Inscription envoyée ! En attente de validation.');
    return data.data;
  },

  loadUser: async () => {
    try {
      const token = localStorage.getItem('driver_token');
      if (!token) { set({ loading: false }); return; }
      const { data } = await api.get('/auth/me');
      set({ user: data.data, isAuthenticated: true, loading: false });
    } catch {
      set({ user: null, isAuthenticated: false, loading: false });
    }
  },

  logout: () => {
    localStorage.removeItem('driver_token');
    localStorage.removeItem('driver_refresh_token');
    set({ user: null, isAuthenticated: false });
  },
}));

export default useAuthStore;
