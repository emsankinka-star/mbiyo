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
      const { data } = await api.get('/suppliers/me/orders', { params });
      set({ orders: data.data || [] });
    } finally { set({ loading: false }); }
  },

  acceptOrder: async (orderId) => {
    const { data } = await api.patch(`/orders/${orderId}/accept`);
    return data.data;
  },

  rejectOrder: async (orderId, reason) => {
    const { data } = await api.patch(`/orders/${orderId}/reject`, { reason });
    return data.data;
  },

  markPreparing: async (orderId) => {
    const { data } = await api.patch(`/orders/${orderId}/preparing`);
    return data.data;
  },

  markReady: async (orderId) => {
    const { data } = await api.patch(`/orders/${orderId}/ready`);
    return data.data;
  },

  fetchProducts: async () => {
    set({ loading: true });
    try {
      const { data } = await api.get('/suppliers/me/products');
      set({ products: data.data || [] });
    } finally { set({ loading: false }); }
  },

  createProduct: async (productData) => {
    const { data } = await api.post('/products', productData);
    return data.data;
  },

  updateProduct: async (id, productData) => {
    const { data } = await api.put(`/products/${id}`, productData);
    return data.data;
  },

  uploadProductImage: async (id, file) => {
    const formData = new FormData();
    formData.append('image', file);
    const { data } = await api.put(`/products/${id}/image`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data.data;
  },

  deleteProduct: async (id) => {
    await api.delete(`/products/${id}`);
  },

  toggleProductAvailability: async (id) => {
    const { data } = await api.patch(`/products/${id}/availability`);
    return data.data;
  },

  fetchStats: async () => {
    const { data } = await api.get('/suppliers/me/stats');
    set({ stats: data.data });
  },

  toggleOpen: async () => {
    const { data } = await api.put('/suppliers/me/status');
    return data.data;
  },
}));

export default useSupplierStore;
