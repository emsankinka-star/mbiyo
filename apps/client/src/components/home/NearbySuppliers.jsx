'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useLocationStore } from '@/stores/locationStore';
import Link from 'next/link';
import { FiStar, FiClock, FiMapPin } from 'react-icons/fi';

export default function NearbySuppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const { latitude, longitude } = useLocationStore();

  useEffect(() => {
    fetchSuppliers();
  }, [latitude, longitude]);

  async function fetchSuppliers() {
    try {
      setLoading(true);
      const params = latitude && longitude
        ? { lat: latitude, lng: longitude, radius: 10 }
        : {};
      const res = await api.get('/suppliers/nearby', { params });
      setSuppliers(res.data.data || []);
    } catch (error) {
      // Fallback: liste classique
      try {
        const res = await api.get('/suppliers', { params: { limit: 10 } });
        setSuppliers(res.data.data?.suppliers || []);
      } catch { }
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="skeleton h-28 w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  if (suppliers.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-2xl mb-2">🏪</p>
        <p className="text-gray-500 text-sm">Aucun fournisseur à proximité pour le moment.</p>
        <p className="text-gray-400 text-xs mt-1">Activez votre localisation pour de meilleurs résultats.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {suppliers.map((supplier) => (
        <Link
          key={supplier.id}
          href={`/supplier/${supplier.id}`}
          className="block bg-white rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition-shadow"
        >
          <div className="flex">
            {/* Image */}
            <div className="w-28 h-28 bg-gray-200 flex-shrink-0">
              {supplier.logo_url ? (
                <img
                  src={supplier.logo_url}
                  alt={supplier.business_name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl bg-primary-50">
                  {supplier.business_type === 'restaurant' ? '🍽️' :
                    supplier.business_type === 'pharmacy' ? '💊' :
                      supplier.business_type === 'fuel' ? '⛽' :
                        supplier.business_type === 'supermarket' ? '🛒' :
                          supplier.business_type === 'butcher' ? '🥩' :
                            supplier.business_type === 'bakery' ? '🍞' :
                              supplier.business_type === 'bar' ? '🍺' :
                                supplier.business_type === 'electronics' ? '📱' : '🏪'}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 p-3 flex flex-col justify-between">
              <div>
                <h3 className="font-semibold text-dark-800 text-sm">
                  {supplier.business_name}
                </h3>
                <p className="text-xs text-gray-500 capitalize mt-0.5">
                  {{
                    restaurant: 'Restaurant', supermarket: 'Supermarché', pharmacy: 'Pharmacie',
                    fuel: 'Station', shop: 'Boutique', bakery: 'Boulangerie', butcher: 'Boucherie',
                    bar: 'Bar', cafe: 'Café', hotel: 'Hôtel', electronics: 'Électronique',
                    clothing: 'Vêtements', beauty_salon: 'Beauté', other: 'Autre',
                  }[supplier.business_type] || supplier.business_type}
                </p>
              </div>

              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <FiStar className="text-yellow-500" size={12} />
                  {parseFloat(supplier.rating).toFixed(1)}
                </span>
                <span className="flex items-center gap-1">
                  <FiClock size={12} />
                  {supplier.preparation_time || 30} min
                </span>
                {supplier.distance_km && (
                  <span className="flex items-center gap-1">
                    <FiMapPin size={12} />
                    {parseFloat(supplier.distance_km).toFixed(1)} km
                  </span>
                )}
              </div>

              <span className={`text-xs font-medium ${supplier.is_open ? 'text-green-500' : 'text-red-500'}`}>
                {supplier.is_open ? 'Ouvert' : 'Fermé'}
              </span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
