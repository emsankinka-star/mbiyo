'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import useAuthStore from '../../stores/authStore';
import api from '../../lib/api';
import { FiArrowLeft, FiCalendar, FiTrendingUp, FiDollarSign } from 'react-icons/fi';

export default function EarningsPage() {
  const router = useRouter();
  const { isAuthenticated, loadUser } = useAuthStore();
  const [earnings, setEarnings] = useState(null);
  const [period, setPeriod] = useState('week');

  useEffect(() => { loadUser(); }, []);
  useEffect(() => {
    if (isAuthenticated) {
      api.get('/drivers/earnings').then(({ data }) => setEarnings(data.data)).catch(() => {});
    }
  }, [isAuthenticated]);

  return (
    <div className="min-h-screen pb-24">
      <div className="bg-gradient-to-br from-blue-500 to-blue-700 text-white p-6">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => router.back()} className="p-1"><FiArrowLeft size={20} /></button>
          <h1 className="text-lg font-bold">Mes gains</h1>
        </div>
        <div className="text-center py-4">
          <p className="text-sm opacity-80">Solde total</p>
          <p className="text-4xl font-bold mt-1">{(earnings?.total || 0).toLocaleString()} <span className="text-lg">CDF</span></p>
        </div>
      </div>

      <div className="p-4 space-y-4 -mt-4">
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Aujourd'hui", value: earnings?.today || 0, icon: FiDollarSign, color: 'blue' },
            { label: 'Semaine', value: earnings?.week || 0, icon: FiCalendar, color: 'green' },
            { label: 'Mois', value: earnings?.month || 0, icon: FiTrendingUp, color: 'purple' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-white rounded-2xl p-3 shadow-sm text-center">
              <div className={`w-8 h-8 mx-auto mb-2 rounded-full bg-${color}-100 flex items-center justify-center`}>
                <Icon className={`text-${color}-600`} size={16} />
              </div>
              <p className="text-lg font-bold">{value.toLocaleString()}</p>
              <p className="text-xs text-gray-400">{label}</p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="font-semibold mb-3">Statistiques</h3>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Livraisons aujourd'hui</span>
              <span className="font-medium">{earnings?.deliveries_today || 0}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Livraisons ce mois</span>
              <span className="font-medium">{earnings?.deliveries_month || 0}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Moyenne par livraison</span>
              <span className="font-medium">{(earnings?.avg_per_delivery || 0).toLocaleString()} CDF</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
