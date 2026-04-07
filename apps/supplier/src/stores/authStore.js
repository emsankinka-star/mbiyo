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
    const entries = typeof formData.entries === 'function' ? Object.fromEntries(formData.entries()) : formData;
    const { full_name, owner_name, phone, password, logo, ...supplierData } = entries;

    let accessToken, refreshToken, user;

    // Step 1: Create user account (or login if already exists)
    try {
      const registerRes = await api.post('/auth/register', {
        full_name: full_name || owner_name,
        phone,
        password,
        role: 'supplier',
      });
      accessToken = registerRes.data.data.accessToken;
      refreshToken = registerRes.data.data.refreshToken;
      user = registerRes.data.data.user;
    } catch (err) {
      // If 409: user already exists (previous failed attempt) → try login
      if (err.response?.status === 409) {
        try {
          const loginRes = await api.post('/auth/login', { phone, password });
          accessToken = loginRes.data.data.accessToken;
          refreshToken = loginRes.data.data.refreshToken;
          user = loginRes.data.data.user;
        } catch (loginErr) {
          throw new Error(loginErr.response?.data?.message || 'Ce numéro existe déjà et le mot de passe est incorrect');
        }
      } else {
        throw err;
      }
    }

    localStorage.setItem('supplier_token', accessToken);
    localStorage.setItem('supplier_refresh_token', refreshToken);
    set({ user, isAuthenticated: true, loading: false });

    // Step 2: Create supplier profile (skip if already exists)
    try {
      const supplierFd = new FormData();
      supplierFd.append('business_name', supplierData.business_name);
      supplierFd.append('business_type', supplierData.business_type);
      if (supplierData.address) supplierFd.append('address', supplierData.address);
      if (supplierData.description) supplierFd.append('description', supplierData.description);
      if (supplierData.rccm) supplierFd.append('rccm', supplierData.rccm);
      if (supplierData.email) supplierFd.append('email', supplierData.email);
      const logoFile = typeof formData.get === 'function' ? formData.get('logo') : null;
      if (logoFile && logoFile instanceof File) supplierFd.append('logo', logoFile);

      const { data } = await api.post('/suppliers/register', supplierFd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      set({ supplier: data.data });
      return data.data;
    } catch (err) {
      // 409 = supplier profile already exists → that's OK
      if (err.response?.status === 409) {
        set({ supplier: err.response.data.data });
        return err.response.data.data;
      }
      throw err;
    }
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

  uploadLogo: async (file) => {
    const fd = new FormData();
    fd.append('logo', file);
    const { data } = await api.put('/suppliers/me/logo', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
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
