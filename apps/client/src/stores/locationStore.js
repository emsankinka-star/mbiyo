import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useLocationStore = create(
  persist(
    (set, get) => ({
      latitude: null,
      longitude: null,
      address: '',
      details: null, // { commune, quartier, avenue, numero, reference }
      loading: false,
      error: null,

      setLocation(latitude, longitude, address) {
        set({ latitude, longitude, address });
      },

      setFullLocation(latitude, longitude, address, details) {
        set({ latitude, longitude, address, details });
      },

      async detectLocation() {
        if (!navigator.geolocation) {
          set({ error: 'Géolocalisation non supportée' });
          set({ latitude: -2.5083, longitude: 28.8608, address: 'Bukavu, RDC' });
          return;
        }

        set({ loading: true });
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            set({ latitude, longitude, loading: false });

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
    }),
    {
      name: 'mbiyo-location',
      partialize: (state) => ({
        latitude: state.latitude,
        longitude: state.longitude,
        address: state.address,
        details: state.details,
      }),
    }
  )
);
