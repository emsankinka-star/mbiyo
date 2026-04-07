import { create } from 'zustand';
import api from '@/lib/api';
import { connectSocket, disconnectSocket } from '@/lib/socket';

export const useAuthStore = create((set, get) => ({
  user: null,
  token: typeof window !== 'undefined' ? localStorage.getItem('mbiyo_token') : null,
  loading: false,
  error: null,

  setToken(token, refreshToken) {
    localStorage.setItem('mbiyo_token', token);
    if (refreshToken) localStorage.setItem('mbiyo_refresh_token', refreshToken);
    set({ token });
    connectSocket(token);
  },

  async register(data) {
    set({ loading: true, error: null });
    try {
      const res = await api.post('/auth/register', data);
      const { user, accessToken, refreshToken } = res.data.data;
      get().setToken(accessToken, refreshToken);
      set({ user, loading: false });
      return user;
    } catch (error) {
      const msg = error.response?.data?.message || 'Erreur d\'inscription';
      set({ loading: false, error: msg });
      throw new Error(msg);
    }
  },

  async login(phone, password) {
    set({ loading: true, error: null });
    try {
      const res = await api.post('/auth/login', { phone, password });
      const { user, accessToken, refreshToken } = res.data.data;
      // Seuls les clients peuvent se connecter via l'app client
      if (user.role !== 'client') {
        throw new Error('Ce compte n\'est pas un compte client. Utilisez l\'application correspondante.');
      }
      get().setToken(accessToken, refreshToken);
      set({ user, loading: false });
      return user;
    } catch (error) {
      const msg = error.response?.data?.message || 'Identifiants incorrects';
      set({ loading: false, error: msg });
      throw new Error(msg);
    }
  },

  async loadUser() {
    if (!get().token) return;
    try {
      const res = await api.get('/auth/me');
      set({ user: res.data.data });
      connectSocket(get().token);
    } catch (error) {
      get().logout();
    }
  },

  async updateProfile(data) {
    const res = await api.put('/auth/me', data);
    set({ user: { ...get().user, ...res.data.data } });
  },

  logout() {
    localStorage.removeItem('mbiyo_token');
    localStorage.removeItem('mbiyo_refresh_token');
    disconnectSocket();
    set({ user: null, token: null });
    try { api.post('/auth/logout'); } catch (e) { /* ignore */ }
  },
}));
