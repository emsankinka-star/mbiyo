import { create } from 'zustand';
import api from '../lib/api';
import { getSocket } from '../lib/socket';

const useDriverStore = create((set, get) => ({
  isOnline: false,
  availableOrders: [],
  activeDelivery: null,
  earnings: { today: 0, week: 0, month: 0, total: 0 },
  stats: {},
  loading: false,

  toggleOnline: async () => {
    const newStatus = !get().isOnline;
    const { data } = await api.put('/drivers/me/status', { is_online: newStatus });
    const online = data.data.is_online;
    set({ isOnline: online });
    const socket = getSocket();
    if (socket) socket.emit('driver:status', { isOnline: online });
    if (online) get().fetchAvailableOrders();
    return online;
  },

  fetchAvailableOrders: async () => {
    set({ loading: true });
    try {
      const { data } = await api.get('/drivers/available-orders');
      set({ availableOrders: data.data || [] });
    } finally {
      set({ loading: false });
    }
  },

  acceptDelivery: async (orderId) => {
    const { data } = await api.post(`/orders/${orderId}/accept-delivery`);
    set({ activeDelivery: data.data });
    get().fetchAvailableOrders();
    return data.data;
  },

  updateDeliveryStatus: async (orderId, status) => {
    const endpoint = `/orders/${orderId}/${status}`;
    const { data } = await api.patch(endpoint);
    if (status === 'delivered') {
      set({ activeDelivery: null });
    } else {
      set({ activeDelivery: data.data });
    }
    return data.data;
  },

  fetchEarnings: async () => {
    const { data } = await api.get('/drivers/me/earnings');
    set({ earnings: data.data });
  },

  fetchStats: async () => {
    const { data } = await api.get('/drivers/me/stats');
    set({ stats: data.data });
  },

  updateLocation: async (lat, lng) => {
    await api.put('/drivers/me/location', { latitude: lat, longitude: lng });
    const socket = getSocket();
    if (socket) socket.emit('driver:location_update', { latitude: lat, longitude: lng });
  },
}));

export default useDriverStore;
