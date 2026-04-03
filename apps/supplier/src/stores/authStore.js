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
    localStorage.setItem('supplier_token', data.data.accessToken);
    localStorage.setItem('supplier_refresh_token', data.data.refreshToken);
    set({ user: data.data.user, isAuthenticated: true, loading: false });
    return data.data;
  },

  register: async (formData) => {
    // Step 1: Create user account
    const { full_name, owner_name, phone, password, ...supplierData } = Object.fromEntries(
      typeof formData.entries === 'function' ? formData.entries() : Object.entries(formData)
    );
    const registerRes = await api.post('/auth/register', {
      full_name: full_name || owner_name,
      phone,
      password,
      role: 'supplier',
    });
    const { accessToken, refreshToken } = registerRes.data.data;
    localStorage.setItem('supplier_token', accessToken);
    localStorage.setItem('supplier_refresh_token', refreshToken);
    set({ user: registerRes.data.data.user, isAuthenticated: true, loading: false });

    // Step 2: Create supplier profile
    const { data } = await api.post('/suppliers/register', {
      business_name: supplierData.business_name,
      business_type: supplierData.business_type,
      address: supplierData.address,
      description: supplierData.description,
    });
    set({ supplier: data.data });
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
      const { data } = await api.get('/suppliers/me');
      set({ supplier: data.data });
      return data.data;
    } catch {}
  },

  updateSupplierProfile: async (profileData) => {
    const { data } = await api.put('/suppliers/me', profileData);
    set({ supplier: data.data });
    return data.data;
  },

  logout: () => {
    localStorage.removeItem('supplier_token');
    localStorage.removeItem('supplier_refresh_token');
    set({ user: null, supplier: null, isAuthenticated: false });
  },
}));

export default useAuthStore;
