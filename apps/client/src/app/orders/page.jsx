'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/api';
import { FiArrowLeft, FiClock, FiPackage, FiChevronRight } from 'react-icons/fi';

const STATUS_LABELS = {
  pending: 'En attente', accepted: 'Acceptée', preparing: 'En préparation',
  ready: 'Prête', assigned: 'Livreur en route', picked_up: 'Récupérée',
  delivering: 'En livraison', delivered: 'Livrée', cancelled: 'Annulée',
};
const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-700', accepted: 'bg-blue-100 text-blue-700',
  preparing: 'bg-orange-100 text-orange-700', ready: 'bg-indigo-100 text-indigo-700',
  assigned: 'bg-blue-100 text-blue-700', picked_up: 'bg-blue-100 text-blue-700',
  delivering: 'bg-purple-100 text-purple-700', delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

export default function OrdersPage() {
  const router = useRouter();
  const { token, loadUser } = useAuthStore();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => { if (token) loadUser(); }, []);
  useEffect(() => {
    if (!token) { router.replace('/auth/login'); return; }
    const params = filter ? { status: filter } : {};
    api.get('/orders/my', { params }).then(({ data }) => setOrders(data.data || [])).catch(() => {}).finally(() => setLoading(false));
  }, [token, filter]);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white px-4 py-4 flex items-center gap-3 border-b border-gray-100">
        <button onClick={() => router.back()} className="p-2"><FiArrowLeft size={20} /></button>
        <h1 className="font-bold text-lg">Mes commandes</h1>
      </header>

      <div className="px-4 mt-4 flex gap-2 overflow-x-auto pb-2">
        {['', 'pending', 'delivering', 'delivered', 'cancelled'].map((f) => (
          <button key={f} onClick={() => { setFilter(f); setLoading(true); }}
            className={`px-4 py-2 rounded-xl text-xs font-medium whitespace-nowrap ${filter === f ? 'bg-primary-500 text-white' : 'bg-white text-gray-500 border'}`}>
            {f === '' ? 'Toutes' : STATUS_LABELS[f]}
          </button>
        ))}
      </div>

      <div className="px-4 mt-4">
        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="bg-gray-200 animate-pulse h-24 rounded-2xl" />)}</div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <FiPackage size={40} className="mx-auto mb-3" />
            <p>Aucune commande</p>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <button key={order.id} onClick={() => router.push(`/orders/${order.id}`)}
                className="w-full bg-white rounded-2xl p-4 text-left shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-sm">#{order.order_number}</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-600'}`}>
                    {STATUS_LABELS[order.status] || order.status}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">{order.supplier?.business_name || 'Fournisseur'}</span>
                  <span className="font-bold text-primary-500">{(order.total || 0).toLocaleString()} CDF</span>
                </div>
                <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
                  <FiClock size={12} />
                  <span>{new Date(order.created_at).toLocaleDateString('fr-FR')}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
