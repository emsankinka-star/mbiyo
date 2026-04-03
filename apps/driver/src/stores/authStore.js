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
    // Extract user fields vs driver fields from FormData
    const full_name = formData.get('full_name');
    const phone = formData.get('phone');
    const password = formData.get('password');

    // Step 1: Create user account
    const registerRes = await api.post('/auth/register', {
      full_name,
      phone,
      password,
      role: 'driver',
    });
    const { accessToken, refreshToken } = registerRes.data.data;
    localStorage.setItem('driver_token', accessToken);
    localStorage.setItem('driver_refresh_token', refreshToken);
    set({ user: registerRes.data.data.user, isAuthenticated: true, loading: false });

    // Step 2: Create driver profile with documents
    const driverFormData = new FormData();
    driverFormData.append('vehicle_type', formData.get('vehicle_type'));
    driverFormData.append('license_plate', formData.get('license_number') || '');
    if (formData.get('id_document')) driverFormData.append('id_document', formData.get('id_document'));
    if (formData.get('license')) driverFormData.append('license', formData.get('license'));
    if (formData.get('license_document')) driverFormData.append('license', formData.get('license_document'));
    if (formData.get('vehicle_photo')) driverFormData.append('vehicle_photo', formData.get('vehicle_photo'));

    const { data } = await api.post('/drivers/register', driverFormData, {
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
