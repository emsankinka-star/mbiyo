'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import useAuthStore from '../../stores/authStore';
import useSupplierStore from '../../stores/supplierStore';
import toast from 'react-hot-toast';
import { FiClock, FiCheck, FiX, FiChefHat, FiPackage, FiChevronDown } from 'react-icons/fi';

const TABS = [
  { key: 'pending', label: 'En attente', color: 'orange' },
  { key: 'accepted', label: 'Acceptées', color: 'blue' },
  { key: 'preparing', label: 'En préparation', color: 'yellow' },
  { key: 'ready', label: 'Prêtes', color: 'green' },
];

export default function OrdersPage() {
  const router = useRouter();
  const { isAuthenticated, loadUser } = useAuthStore();
  const { orders, fetchOrders, acceptOrder, rejectOrder, markPreparing, markReady } = useSupplierStore();
  const [tab, setTab] = useState('pending');
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => { loadUser(); }, []);
  useEffect(() => { if (isAuthenticated) fetchOrders(tab); }, [isAuthenticated, tab]);

  const handleAction = async (orderId, action) => {
    setActionLoading(orderId);
    try {
      if (action === 'accept') { await acceptOrder(orderId); toast.success('Commande acceptée'); }
      else if (action === 'reject') { await rejectOrder(orderId, 'Refusée par le fournisseur'); toast.success('Commande refusée'); }
      else if (action === 'preparing') { await markPreparing(orderId); toast.success('En préparation'); }
      else if (action === 'ready') { await markReady(orderId); toast.success('Commande prête !'); }
      fetchOrders(tab);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur');
    } finally { setActionLoading(null); }
  };

  return (
    <div className="min-h-screen pb-24">
      <div className="bg-white border-b p-4">
        <h1 className="text-lg font-bold">Commandes</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-4 overflow-x-auto">
        {TABS.map(({ key, label, color }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${tab === key ? `bg-${color}-500 text-white` : 'bg-gray-100 text-gray-500'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Orders list */}
      <div className="px-4 space-y-3">
        {orders.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <FiPackage size={40} className="mx-auto mb-3" />
            <p>Aucune commande {TABS.find(t => t.key === tab)?.label.toLowerCase()}</p>
          </div>
        ) : (
          orders.map((order) => (
            <div key={order.id} className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <span className="font-semibold">#{order.order_number}</span>
                  <p className="text-xs text-gray-400">{order.client_name || 'Client'} · {new Date(order.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                <span className="font-bold text-green-600">{(order.total_amount || 0).toLocaleString()} CDF</span>
              </div>

              {/* Items */}
              <div className="bg-gray-50 rounded-xl p-3 mb-3 text-sm space-y-1">
                {(order.items || []).map((item, i) => (
                  <div key={i} className="flex justify-between">
                    <span className="text-gray-600">{item.quantity}x {item.product_name}</span>
                    <span className="text-gray-800 font-medium">{(item.subtotal || 0).toLocaleString()}</span>
                  </div>
                ))}
              </div>

              {order.delivery_notes && <p className="text-xs text-gray-400 mb-3 italic">Note: {order.delivery_notes}</p>}

              {/* Actions */}
              <div className="flex gap-2">
                {tab === 'pending' && (
                  <>
                    <button onClick={() => handleAction(order.id, 'reject')} disabled={actionLoading === order.id}
                      className="flex-1 py-2.5 rounded-xl border-2 border-red-200 text-red-500 text-sm font-medium flex items-center justify-center gap-1">
                      <FiX size={16} /> Refuser
                    </button>
                    <button onClick={() => handleAction(order.id, 'accept')} disabled={actionLoading === order.id}
                      className="flex-1 py-2.5 rounded-xl bg-green-600 text-white text-sm font-medium flex items-center justify-center gap-1">
                      <FiCheck size={16} /> Accepter
                    </button>
                  </>
                )}
                {tab === 'accepted' && (
                  <button onClick={() => handleAction(order.id, 'preparing')} disabled={actionLoading === order.id}
                    className="flex-1 py-2.5 rounded-xl bg-yellow-500 text-white text-sm font-medium">
                    Commencer la préparation
                  </button>
                )}
                {tab === 'preparing' && (
                  <button onClick={() => handleAction(order.id, 'ready')} disabled={actionLoading === order.id}
                    className="flex-1 py-2.5 rounded-xl bg-green-600 text-white text-sm font-medium">
                    Marquer comme prête ✓
                  </button>
                )}
                {tab === 'ready' && (
                  <div className="flex-1 py-2.5 text-center text-sm text-gray-400">
                    <FiClock className="inline mr-1" /> En attente du livreur
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
