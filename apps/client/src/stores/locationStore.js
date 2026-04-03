import { create } from 'zustand';

export const useLocationStore = create((set, get) => ({
  latitude: null,
  longitude: null,
  address: '',
  loading: false,
  error: null,

  setLocation(latitude, longitude, address) {
    set({ latitude, longitude, address });
  },

  async detectLocation() {
    if (!navigator.geolocation) {
      set({ error: 'Géolocalisation non supportée' });
      // Fallback Bukavu
      set({ latitude: -2.5083, longitude: 28.8608, address: 'Bukavu, RDC' });
      return;
    }

    set({ loading: true });
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        set({ latitude, longitude, loading: false });

        // Reverse geocoding (optionnel via Mapbox)
        try {
          const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
          if (token) {
            const res = await fetch(
              `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${token}&language=fr`
            );
            const data = await res.json();
            if (data.features?.length > 0) {
              set({ address: data.features[0].place_name });
            }
          } else {
            set({ address: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}` });
          }
        } catch {
          set({ address: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}` });
        }
      },
      (err) => {
        set({
          loading: false,
          error: err.message,
          latitude: -2.5083,
          longitude: 28.8608,
          address: 'Bukavu, RDC',
        });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  },
}));
