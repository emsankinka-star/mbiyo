'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { FiArrowLeft, FiMapPin, FiStar, FiSearch, FiClock } from 'react-icons/fi';

export default function SuppliersPage() {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/suppliers').then(res => {
      const list = res.data?.data || res.data || [];
      setSuppliers(list);
      setFiltered(list);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!search.trim()) { setFiltered(suppliers); return; }
    const q = search.toLowerCase();
    setFiltered(suppliers.filter(s =>
      s.business_name?.toLowerCase().includes(q) ||
      s.business_type?.toLowerCase().includes(q) ||
      s.address?.toLowerCase().includes(q)
    ));
  }, [search, suppliers]);

  const typeLabels = { supermarket: 'Supermarché', pharmacy: 'Pharmacie', fuel: 'Station', shop: 'Boutique' };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white px-4 pt-12 pb-4 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => router.back()} className="p-1"><FiArrowLeft size={20} /></button>
          <h1 className="text-lg font-bold">Fournisseurs</h1>
        </div>
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un fournisseur..."
            className="w-full pl-10 pr-4 py-3 bg-gray-100 rounded-xl text-sm outline-none" />
        </div>
      </header>

      <div className="px-4 mt-4 space-y-3">
        {loading ? (
          <div className="text-center py-12 text-gray-400">Chargement...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">Aucun fournisseur trouvé</div>
        ) : filtered.map(s => (
          <div key={s.id} onClick={() => router.push(`/supplier/${s.id}`)}
            className="bg-white rounded-2xl p-4 shadow-sm flex gap-4 cursor-pointer active:scale-[0.98] transition-transform">
            <div className="w-16 h-16 bg-primary-50 rounded-xl flex items-center justify-center text-xl font-bold text-primary-500">
              {s.business_name?.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold truncate">{s.business_name}</h3>
              <p className="text-xs text-gray-500 mt-0.5">{typeLabels[s.business_type] || s.business_type}</p>
              {s.address && (
                <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                  <FiMapPin size={12} /> {s.address}
                </p>
              )}
              <div className="flex items-center gap-3 mt-1">
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
    </div>
  );
}
