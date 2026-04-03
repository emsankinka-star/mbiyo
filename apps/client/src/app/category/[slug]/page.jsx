'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import api from '@/lib/api';
import { FiArrowLeft, FiMapPin, FiStar, FiClock, FiPackage } from 'react-icons/fi';

// Map URL slugs to business_type values and display labels
const SLUG_MAP = {
  restaurants:   { type: 'restaurant',  label: 'Restaurants',   icon: '🍽️' },
  supermarches:  { type: 'supermarket', label: 'Supermarchés',  icon: '🛒' },
  pharmacies:    { type: 'pharmacy',    label: 'Pharmacies',    icon: '💊' },
  carburant:     { type: 'fuel',        label: 'Carburant',     icon: '⛽' },
  boutiques:     { type: 'shop',        label: 'Boutiques',     icon: '🏪' },
  boissons:      { type: 'shop',        label: 'Boissons',      icon: '🥤' },
  boulangeries:  { type: 'shop',        label: 'Boulangeries',  icon: '🍞' },
  electronique:  { type: 'shop',        label: 'Électronique',  icon: '📱' },
};

export default function CategoryPage() {
  const router = useRouter();
  const { slug } = useParams();
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);

  const meta = SLUG_MAP[slug] || { type: slug, label: slug, icon: '📦' };

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/suppliers');
        const list = res.data?.data || res.data || [];
        // Filter suppliers by matching business_type
        const filtered = list.filter(s => s.business_type === meta.type);
        setSuppliers(filtered);
      } catch { } finally { setLoading(false); }
    };
    load();
  }, [slug, meta.type]);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white px-4 pt-12 pb-4 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-1"><FiArrowLeft size={20} /></button>
          <span className="text-2xl">{meta.icon}</span>
          <h1 className="text-lg font-bold">{meta.label}</h1>
        </div>
      </header>

      <div className="px-4 mt-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
            <p className="text-sm text-gray-400 mt-3">Chargement...</p>
          </div>
        ) : suppliers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <FiPackage size={32} className="text-gray-300" />
            </div>
            <h2 className="text-lg font-semibold text-gray-600">Aucun commerce disponible</h2>
            <p className="text-sm text-gray-400 mt-2 max-w-xs">
              Il n&apos;y a pas encore de commerce enregistré dans la catégorie <strong>{meta.label}</strong>. Revenez bientôt !
            </p>
            <button onClick={() => router.back()}
              className="mt-6 px-6 py-3 bg-primary-500 text-white rounded-xl text-sm font-semibold">
              Retour
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {suppliers.map(s => (
              <div key={s.id} onClick={() => router.push(`/supplier/${s.id}`)}
                className="bg-white rounded-2xl p-4 shadow-sm flex gap-4 cursor-pointer active:scale-[0.98] transition-transform">
                {s.logo_url ? (
                  <img src={s.logo_url} alt={s.business_name} className="w-16 h-16 rounded-xl object-cover" />
                ) : (
                  <div className="w-16 h-16 bg-primary-50 rounded-xl flex items-center justify-center text-xl font-bold text-primary-500">
                    {s.business_name?.charAt(0)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">{s.business_name}</h3>
                  {s.address && (
                    <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                      <FiMapPin size={12} /> {s.address}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-1.5">
                    {s.average_rating && (
                      <span className="text-xs text-amber-500 flex items-center gap-1">
                        <FiStar size={12} /> {Number(s.average_rating).toFixed(1)}
                      </span>
                    )}
                    <span className={`text-xs flex items-center gap-1 ${s.is_open ? 'text-green-500' : 'text-red-400'}`}>
                      <FiClock size={12} /> {s.is_open ? 'Ouvert' : 'Fermé'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
