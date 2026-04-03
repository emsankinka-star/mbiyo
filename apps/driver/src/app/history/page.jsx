'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import useAuthStore from '../../stores/authStore';
import api from '../../lib/api';
import { FiArrowLeft, FiMapPin, FiClock, FiCheckCircle } from 'react-icons/fi';

export default function HistoryPage() {
  const router = useRouter();
  const { isAuthenticated, loadUser } = useAuthStore();
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadUser(); }, []);
  useEffect(() => {
    if (isAuthenticated) {
      api.get('/drivers/me/deliveries').then(({ data }) => setDeliveries(data.data || []))
        .catch(() => {}).finally(() => setLoading(false));
    }
  }, [isAuthenticated]);

  return (
    <div className="min-h-screen pb-24">
      <div className="bg-white border-b p-4 flex items-center gap-3">
        <button onClick={() => router.back()} className="p-1"><FiArrowLeft size={20} /></button>
        <h1 className="text-lg font-bold">Historique</h1>
      </div>

      <div className="p-4">
        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="bg-gray-200 animate-pulse h-24 rounded-2xl" />)}</div>
        ) : deliveries.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <FiClock size={40} className="mx-auto mb-3" />
            <p>Aucune livraison pour le moment</p>
          </div>
        ) : (
          <div className="space-y-3">
            {deliveries.map((d) => (
              <div key={d.id} className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-sm">#{d.order_number}</span>
                  <div className="flex items-center gap-1 text-green-600">
                    <FiCheckCircle size={14} />
                    <span className="text-xs font-medium">{(d.delivery_fee || 0).toLocaleString()} CDF</span>
                  </div>
                </div>
                <div className="text-sm text-gray-500 space-y-1">
                  <div className="flex items-center gap-2"><FiMapPin size={12} /><span className="truncate">{d.delivery_address || '—'}</span></div>
                  <div className="flex items-center gap-2"><FiClock size={12} /><span>{new Date(d.delivered_at || d.updated_at).toLocaleDateString('fr-FR')}</span></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
