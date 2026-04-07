import { create } from 'zustand';
import api from '../lib/api';
import toast from 'react-hot-toast';

const useAuthStore = create((set) => ({
  user: null,
  isAuthenticated: false,
  loading: true,

  login: async (phone, password) => {
    const { data } = await api.post('/auth/login', { phone, password });
    // Accepter 'driver' ou 'client' (inscription en cours, profil pas encore créé)
    if (data.data.user.role !== 'driver' && data.data.user.role !== 'client') {
      throw new Error('Compte livreur requis');
    }
    localStorage.setItem('driver_token', data.data.accessToken);
    localStorage.setItem('driver_refresh_token', data.data.refreshToken);
    set({ user: data.data.user, isAuthenticated: true, loading: false });
    return data.data;
  },

  register: async (formData) => {
    const full_name = formData.get('full_name');
    const phone = formData.get('phone');
    const password = formData.get('password');

    let accessToken, refreshToken, user;

    // Step 1: Créer le compte utilisateur (rôle = 'client' par défaut)
    // Le rôle sera mis à jour vers 'driver' dans Step 2
    try {
      const registerRes = await api.post('/auth/register', {
        full_name,
        phone,
        password,
      });
      accessToken = registerRes.data.data.accessToken;
      refreshToken = registerRes.data.data.refreshToken;
      user = registerRes.data.data.user;
    } catch (err) {
      if (err.response?.status === 409) {
        // Numéro déjà utilisé — essayer de se connecter
        try {
          const loginRes = await api.post('/auth/login', { phone, password });
          accessToken = loginRes.data.data.accessToken;
          refreshToken = loginRes.data.data.refreshToken;
          user = loginRes.data.data.user;
        } catch (loginErr) {
          throw new Error('Ce numéro existe déjà. Vérifiez votre mot de passe ou connectez-vous.');
        }
      } else {
        throw err;
      }
    }

    localStorage.setItem('driver_token', accessToken);
    localStorage.setItem('driver_refresh_token', refreshToken);
    set({ user, isAuthenticated: true, loading: false });

    // Step 2: Créer le profil livreur avec les documents
    const driverFormData = new FormData();
    driverFormData.append('vehicle_type', formData.get('vehicle_type'));
    driverFormData.append('license_plate', formData.get('license_number') || '');
    if (formData.get('id_document')) driverFormData.append('id_document', formData.get('id_document'));
    if (formData.get('license')) driverFormData.append('license', formData.get('license'));
    if (formData.get('license_document')) driverFormData.append('license', formData.get('license_document'));
    if (formData.get('vehicle_photo')) driverFormData.append('vehicle_photo', formData.get('vehicle_photo'));

    try {
      const { data } = await api.post('/drivers/register', driverFormData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      // Le backend retourne des tokens frais avec role='driver'
      if (data.data.accessToken) {
        localStorage.setItem('driver_token', data.data.accessToken);
        localStorage.setItem('driver_refresh_token', data.data.refreshToken);
      }
      if (data.data.user) set({ user: data.data.user });
      toast.success('Inscription envoyée ! En attente de validation.');
      return data.data;
    } catch (err) {
      if (err.response?.status === 409) {
        // Profil livreur déjà existant — OK
        return err.response.data.data;
      }
      console.error('Driver profile creation failed:', err.response?.data?.message || err.message);
      return user;
    }
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
