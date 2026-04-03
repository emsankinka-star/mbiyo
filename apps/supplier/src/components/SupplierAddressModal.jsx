'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { FiX, FiMapPin, FiNavigation, FiSearch, FiCheck } from 'react-icons/fi';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
const DEFAULT_CENTER = { lng: 28.8608, lat: -2.5083 }; // Bukavu

export default function SupplierAddressModal({ isOpen, onClose, initialData, onSave }) {
  // Form fields
  const [commune, setCommune] = useState('');
  const [quartier, setQuartier] = useState('');
  const [avenue, setAvenue] = useState('');
  const [numero, setNumero] = useState('');
  const [reference, setReference] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [saving, setSaving] = useState(false);

  // Map state
  const mapContainer = useRef(null);
  const map = useRef(null);
  const marker = useRef(null);
  const [mapCenter, setMapCenter] = useState({
    lng: initialData?.longitude || DEFAULT_CENTER.lng,
    lat: initialData?.latitude || DEFAULT_CENTER.lat,
  });
  const [activeTab, setActiveTab] = useState('address');

  // Load existing data on open
  useEffect(() => {
    if (isOpen) {
      const d = initialData?.address_details;
      setCommune(d?.commune || '');
      setQuartier(d?.quartier || '');
      setAvenue(d?.avenue || '');
      setNumero(d?.numero || '');
      setReference(d?.reference || '');
      if (initialData?.latitude && initialData?.longitude) {
        setMapCenter({
          lat: parseFloat(initialData.latitude),
          lng: parseFloat(initialData.longitude),
        });
      }
    }
  }, [isOpen]);

  // Cleanup map on close
  useEffect(() => {
    if (!isOpen && map.current) {
      map.current.remove();
      map.current = null;
    }
  }, [isOpen]);

  // Init map when switching to map tab
  useEffect(() => {
    if (!isOpen || activeTab !== 'map' || !mapContainer.current || !MAPBOX_TOKEN) return;

    if (map.current) {
      map.current.remove();
      map.current = null;
    }

    mapboxgl.accessToken = MAPBOX_TOKEN;

    const m = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [mapCenter.lng, mapCenter.lat],
      zoom: 15,
      attributionControl: false,
    });

    m.addControl(new mapboxgl.NavigationControl(), 'bottom-right');

    const el = document.createElement('div');
    el.className = 'custom-marker';
    el.innerHTML = `<svg width="36" height="48" viewBox="0 0 24 32" fill="none">
      <path d="M12 0C5.373 0 0 5.373 0 12c0 9 12 20 12 20s12-11 12-20C24 5.373 18.627 0 12 0z" fill="#16a34a"/>
      <circle cx="12" cy="12" r="5" fill="white"/>
    </svg>`;

    marker.current = new mapboxgl.Marker({ element: el, draggable: true })
      .setLngLat([mapCenter.lng, mapCenter.lat])
      .addTo(m);

    marker.current.on('dragend', () => {
      const { lng, lat } = marker.current.getLngLat();
      setMapCenter({ lng, lat });
      reverseGeocode(lat, lng);
    });

    m.on('click', (e) => {
      const { lng, lat } = e.lngLat;
      marker.current.setLngLat([lng, lat]);
      setMapCenter({ lng, lat });
      reverseGeocode(lat, lng);
    });

    map.current = m;

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [isOpen, activeTab]);

  // Reverse geocode
  const reverseGeocode = useCallback(async (lat, lng) => {
    if (!MAPBOX_TOKEN) return;
    try {
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}&language=fr&types=address,neighborhood,locality,place`
      );
      const data = await res.json();
      if (data.features?.length > 0) {
        const ctx = data.features[0].context || [];
        const getCtx = (type) => ctx.find((c) => c.id?.startsWith(type))?.text || '';
        const neighborhood = getCtx('neighborhood') || getCtx('locality');
        const place = getCtx('place');
        if (neighborhood && !quartier) setQuartier(neighborhood);
        if (place && !commune) setCommune(place);
      }
    } catch { /* ignore */ }
  }, [quartier, commune]);

  // Forward geocode search
  const handleSearch = useCallback(async (q) => {
    setSearchQuery(q);
    if (!q || q.length < 3 || !MAPBOX_TOKEN) {
      setSearchResults([]);
      return;
    }
    try {
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json?access_token=${MAPBOX_TOKEN}&language=fr&country=CD&proximity=${mapCenter.lng},${mapCenter.lat}&limit=5`
      );
      const data = await res.json();
      setSearchResults(data.features || []);
    } catch {
      setSearchResults([]);
    }
  }, [mapCenter]);

  // Select a search result
  const selectSearchResult = (feat) => {
    const [lng, lat] = feat.center;
    setMapCenter({ lng, lat });
    setSearchQuery(feat.place_name);
    setSearchResults([]);

    if (map.current && marker.current) {
      map.current.flyTo({ center: [lng, lat], zoom: 16 });
      marker.current.setLngLat([lng, lat]);
    }

    const ctx = feat.context || [];
    const getCtx = (type) => ctx.find((c) => c.id?.startsWith(type))?.text || '';
    const neighborhood = getCtx('neighborhood') || getCtx('locality');
    const place = getCtx('place');
    if (neighborhood) setQuartier(neighborhood);
    if (place) setCommune(place);
  };

  // Use GPS
  const handleUseGPS = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude: lat, longitude: lng } = position.coords;
        setMapCenter({ lat, lng });
        if (map.current && marker.current) {
          map.current.flyTo({ center: [lng, lat], zoom: 16 });
          marker.current.setLngLat([lng, lat]);
        }
        reverseGeocode(lat, lng);
      },
      () => {},
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Build address string
  const buildAddressString = () => {
    const parts = [];
    if (numero) parts.push(`N°${numero}`);
    if (avenue) parts.push(`Av. ${avenue}`);
    if (quartier) parts.push(`Q/ ${quartier}`);
    if (commune) parts.push(`C/ ${commune}`);
    if (parts.length === 0) return initialData?.address || 'Non définie';
    return parts.join(', ');
  };

  // Save
  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        address: buildAddressString(),
        latitude: mapCenter.lat,
        longitude: mapCenter.lng,
        address_details: { commune, quartier, avenue, numero, reference },
      });
      onClose();
    } catch {
      /* handled by caller */
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[92vh] flex flex-col overflow-hidden animate-slide-up"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Adresse du commerce</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition">
            <FiX size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100">
          <button
            onClick={() => setActiveTab('address')}
            className={`flex-1 py-3 text-sm font-medium transition ${
              activeTab === 'address' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500'
            }`}
          >
            <FiMapPin className="inline mr-1.5 mb-0.5" size={14} />
            Adresse manuelle
          </button>
          <button
            onClick={() => setActiveTab('map')}
            className={`flex-1 py-3 text-sm font-medium transition ${
              activeTab === 'map' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500'
            }`}
          >
            <FiNavigation className="inline mr-1.5 mb-0.5" size={14} />
            Pointer sur la carte
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'address' ? (
            <div className="p-4 space-y-3">
              <p className="text-xs text-gray-400">
                Renseignez l'adresse exacte de votre commerce pour que les livreurs vous trouvent facilement.
              </p>

              <button
                onClick={handleUseGPS}
                className="w-full flex items-center gap-3 px-4 py-3 bg-green-50 text-green-700 rounded-xl text-sm font-medium hover:bg-green-100 transition"
              >
                <FiNavigation size={18} />
                <span>Utiliser ma position actuelle</span>
              </button>

              <div className="grid grid-cols-2 gap-3 mt-2">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Commune / Ville *</label>
                  <input
                    type="text"
                    value={commune}
                    onChange={(e) => setCommune(e.target.value)}
                    placeholder="Ex: Ibanda, Kadutu, Bagira..."
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-300 focus:border-transparent"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Quartier *</label>
                  <input
                    type="text"
                    value={quartier}
                    onChange={(e) => setQuartier(e.target.value)}
                    placeholder="Ex: Nyalukemba, Panzi, Essence..."
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-300 focus:border-transparent"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Avenue / Rue</label>
                  <input
                    type="text"
                    value={avenue}
                    onChange={(e) => setAvenue(e.target.value)}
                    placeholder="Ex: Av. Patrice Lumumba"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-300 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">N° Parcelle</label>
                  <input
                    type="text"
                    value={numero}
                    onChange={(e) => setNumero(e.target.value)}
                    placeholder="Ex: 25"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-300 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Repère</label>
                  <input
                    type="text"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder="Ex: Face station Total"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-300 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Address preview */}
              <div className="mt-3 bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-500 mb-1">Adresse qui sera affichée :</p>
                <p className="text-sm font-medium text-gray-800">{buildAddressString()}</p>
                {reference && <p className="text-xs text-gray-400 mt-1">Repère : {reference}</p>}
              </div>
            </div>
          ) : (
            /* ========== MAP TAB ========== */
            <div className="relative">
              {MAPBOX_TOKEN && (
                <div className="absolute top-3 left-3 right-3 z-10">
                  <div className="relative">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => handleSearch(e.target.value)}
                      placeholder="Rechercher un lieu..."
                      className="w-full pl-9 pr-4 py-2.5 bg-white rounded-xl shadow-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
                    />
                  </div>

                  {searchResults.length > 0 && (
                    <div className="mt-1 bg-white rounded-xl shadow-lg overflow-hidden">
                      {searchResults.map((r) => (
                        <button
                          key={r.id}
                          onClick={() => selectSearchResult(r)}
                          className="w-full text-left px-4 py-2.5 hover:bg-gray-50 border-b border-gray-50 last:border-0"
                        >
                          <p className="text-sm font-medium text-gray-800 truncate">{r.text}</p>
                          <p className="text-xs text-gray-400 truncate">{r.place_name}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={handleUseGPS}
                className="absolute bottom-4 left-3 z-10 bg-white shadow-lg p-3 rounded-full hover:bg-gray-50 transition"
                title="Ma position"
              >
                <FiNavigation size={18} className="text-green-600" />
              </button>

              <div ref={mapContainer} className="h-[350px] w-full" />

              {!MAPBOX_TOKEN && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100 h-[350px]">
                  <div className="text-center p-6">
                    <FiMapPin size={40} className="mx-auto text-gray-300 mb-3" />
                    <p className="text-sm text-gray-500">Carte non disponible.<br />Configurez NEXT_PUBLIC_MAPBOX_TOKEN</p>
                  </div>
                </div>
              )}

              <div className="p-4 space-y-3">
                <p className="text-xs text-gray-500">
                  Déplacez le marqueur sur votre commerce, puis complétez les détails :
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <input type="text" value={commune} onChange={(e) => setCommune(e.target.value)} placeholder="Commune / Ville"
                    className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-300" />
                  <input type="text" value={quartier} onChange={(e) => setQuartier(e.target.value)} placeholder="Quartier"
                    className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-300" />
                  <input type="text" value={avenue} onChange={(e) => setAvenue(e.target.value)} placeholder="Avenue / Rue"
                    className="col-span-2 px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-300" />
                  <input type="text" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Repère (face à, à côté de...)"
                    className="col-span-2 px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-300" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Save button */}
        <div className="p-4 border-t border-gray-100">
          <button
            onClick={handleSave}
            disabled={saving || (!commune && !quartier)}
            className="w-full py-3.5 bg-green-600 text-white rounded-2xl font-semibold text-sm hover:bg-green-700 transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <FiCheck size={18} />
            {saving ? 'Enregistrement...' : 'Enregistrer l\'adresse'}
          </button>
        </div>
      </div>
    </div>
  );
}
