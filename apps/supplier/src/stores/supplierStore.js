import { create } from 'zustand';
import api from '../lib/api';

const useSupplierStore = create((set) => ({
  orders: [],
  products: [],
  stats: null,
  loading: false,

  fetchOrders: async (status) => {
    set({ loading: true });
    try {
      const params = status ? { status } : {};
      const { data } = await api.get('/suppliers/orders', { params });
      set({ orders: data.data || [] });
    } finally { set({ loading: false }); }
  },

  acceptOrder: async (orderId) => {
    const { data } = await api.put(`/orders/${orderId}/accept`);
    return data.data;
  },

  rejectOrder: async (orderId, reason) => {
    const { data } = await api.put(`/orders/${orderId}/reject`, { reason });
    return data.data;
  },

  markPreparing: async (orderId) => {
    const { data } = await api.put(`/orders/${orderId}/preparing`);
    return data.data;
  },

  markReady: async (orderId) => {
    const { data } = await api.put(`/orders/${orderId}/ready`);
    return data.data;
  },

  fetchProducts: async () => {
    set({ loading: true });
    try {
      const { data } = await api.get('/products', { params: { mine: true } });
      set({ products: data.data || [] });
    } finally { set({ loading: false }); }
  },

  createProduct: async (formData) => {
    const { data } = await api.post('/products', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data.data;
  },

  updateProduct: async (id, formData) => {
    const { data } = await api.put(`/products/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data.data;
  },

  deleteProduct: async (id) => {
    await api.delete(`/products/${id}`);
  },

  toggleProductAvailability: async (id) => {
    const { data } = await api.put(`/products/${id}/toggle-availability`);
    return data.data;
  },

  fetchStats: async () => {
    const { data } = await api.get('/suppliers/stats');
    set({ stats: data.data });
  },

  toggleOpen: async () => {
    const { data } = await api.put('/suppliers/toggle-open');
    return data.data;
  },
}));

export default useSupplierStore;
