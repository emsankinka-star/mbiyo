'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import useAuthStore from '../stores/authStore';
import useSupplierStore from '../stores/supplierStore';
import { getSocket } from '../lib/socket';
import toast from 'react-hot-toast';
import { FiPower, FiShoppingBag, FiPackage, FiDollarSign, FiTrendingUp, FiGrid, FiUser, FiChevronRight, FiClock, FiCheck } from 'react-icons/fi';

export default function SupplierHome() {
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading, loadUser } = useAuthStore();
  const { orders, stats, fetchOrders, fetchStats, toggleOpen } = useSupplierStore();
  const [isOpen, setIsOpen] = useState(false);
  const [toggling, setToggling] = useState(false);

  useEffect(() => { loadUser(); }, []);
  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.replace('/auth/login');
  }, [authLoading, isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchOrders('pending');
      fetchStats();
      const socket = getSocket();
      if (socket) {
        socket.on('order:new', () => {
          toast('🔔 Nouvelle commande !', { icon: '📦' });
          fetchOrders('pending');
        });
        return () => socket.off('order:new');
      }
    }
  }, [isAuthenticated]);

  const handleToggleOpen = async () => {
    setToggling(true);
    try {
      const result = await toggleOpen();
      setIsOpen(result.is_open);
      toast.success(result.is_open ? 'Boutique ouverte' : 'Boutique fermée');
    } catch { toast.error('Erreur'); }
    finally { setToggling(false); }
  };

  if (authLoading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full" /></div>;

  const pendingOrders = orders.filter(o => o.status === 'pending');

  return (
    <div className="pb-24">
      {/* Header */}
      <div className={`p-6 text-white transition-colors ${isOpen ? 'bg-gradient-to-br from-green-500 to-green-700' : 'bg-gray-600'}`}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm opacity-80">Bienvenue</p>
            <h1 className="text-xl font-bold">{user?.full_name || 'Fournisseur'}</h1>
          </div>
          <button onClick={handleToggleOpen} disabled={toggling}
            className={`w-14 h-14 rounded-full flex items-center justify-center text-xl shadow-lg transition-all ${isOpen ? 'bg-white text-green-600' : 'bg-gray-700 text-gray-300'}`}>
            <FiPower />
          </button>
        </div>
        <div className="text-center py-2 rounded-lg bg-white/10 text-sm">
          {isOpen ? '🟢 Boutique ouverte — Vous recevez des commandes' : '🔴 Boutique fermée'}
        </div>
      </div>

      {/* Stats cards */}
      <div className="p-4 grid grid-cols-2 gap-3">
        {[
          { label: "Commandes aujourd'hui", value: stats?.orders_today || 0, icon: FiShoppingBag, color: 'green' },
          { label: 'Revenus du jour', value: `${(stats?.revenue_today || 0).toLocaleString()} CDF`, icon: FiDollarSign, color: 'blue' },
          { label: 'En attente', value: pendingOrders.length, icon: FiClock, color: 'orange' },
          { label: 'Note moyenne', value: stats?.avg_rating ? `${stats.avg_rating}/5` : '—', icon: FiTrendingUp, color: 'purple' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-2xl p-4 shadow-sm">
            <div className={`w-10 h-10 mb-2 rounded-xl bg-${color}-100 flex items-center justify-center`}>
              <Icon className={`text-${color}-600`} size={18} />
            </div>
            <p className="text-xl font-bold">{value}</p>
            <p className="text-xs text-gray-400">{label}</p>
          </div>
        ))}
      </div>

      {/* Pending orders */}
      <div className="px-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Commandes en attente</h2>
          <button onClick={() => router.push('/orders')} className="text-green-600 text-sm flex items-center gap-1">
            Tout voir <FiChevronRight size={14} />
          </button>
        </div>
        {pendingOrders.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
            <FiPackage size={36} className="mx-auto text-gray-300 mb-2" />
            <p className="text-gray-500 text-sm">Aucune commande en attente</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingOrders.slice(0, 5).map((order) => (
              <button key={order.id} onClick={() => router.push(`/orders/${order.id}`)}
                className="w-full bg-white rounded-2xl p-4 text-left shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold">#{order.order_number}</span>
                  <span className="text-green-600 font-bold text-sm">{(order.total_amount || 0).toLocaleString()} CDF</span>
                </div>
                <div className="text-sm text-gray-500">
                  <p>{order.items?.length || 0} article(s) · {order.client_name || 'Client'}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100">
        <div className="max-w-4xl mx-auto flex items-center justify-around py-2">
          {[
            { icon: FiShoppingBag, label: 'Accueil', path: '/' },
            { icon: FiPackage, label: 'Commandes', path: '/orders' },
            { icon: FiGrid, label: 'Produits', path: '/products' },
            { icon: FiUser, label: 'Profil', path: '/profile' },
          ].map(({ icon: Icon, label, path }) => (
            <button key={path} onClick={() => router.push(path)}
              className={`flex flex-col items-center py-1 px-3 ${path === '/' ? 'text-green-600' : 'text-gray-400'}`}>
              <Icon size={22} /><span className="text-[10px] mt-1">{label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
