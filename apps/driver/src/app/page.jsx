'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import useAuthStore from '../stores/authStore';
import useDriverStore from '../stores/driverStore';
import { getSocket } from '../lib/socket';
import toast from 'react-hot-toast';
import { FiPower, FiMapPin, FiDollarSign, FiTruck, FiStar, FiClock, FiChevronRight, FiNavigation, FiUser, FiList } from 'react-icons/fi';

export default function DriverHome() {
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading, loadUser } = useAuthStore();
  const { isOnline, availableOrders, activeDelivery, earnings, toggleOnline, fetchAvailableOrders, fetchEarnings } = useDriverStore();
  const [toggling, setToggling] = useState(false);
  const gpsWatchRef = useRef(null);

  useEffect(() => { loadUser(); }, []);
  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.replace('/auth/login');
  }, [authLoading, isAuthenticated]);

  // GPS continu quand le livreur est en ligne
  useEffect(() => {
    if (isOnline && isAuthenticated && 'geolocation' in navigator) {
      // Envoi initial de la position
      navigator.geolocation.getCurrentPosition((pos) => {
        const socket = getSocket();
        if (socket) socket.emit('driver:location_update', {
          latitude: pos.coords.latitude, longitude: pos.coords.longitude,
        });
      }, null, { enableHighAccuracy: true });

      // Tracking continu toutes les ~10 secondes
      gpsWatchRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const socket = getSocket();
          if (socket) socket.emit('driver:location_update', {
            latitude: pos.coords.latitude, longitude: pos.coords.longitude,
          });
        },
        null,
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
      );
    }
    return () => {
      if (gpsWatchRef.current !== null) {
        navigator.geolocation.clearWatch(gpsWatchRef.current);
        gpsWatchRef.current = null;
      }
    };
  }, [isOnline, isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchEarnings();
      if (isOnline) fetchAvailableOrders();
      const socket = getSocket();
      if (socket) {
        socket.on('new_delivery_request', () => fetchAvailableOrders());
        socket.on('delivery_taken', (data) => {
          fetchAvailableOrders();
        });
        return () => { socket.off('new_delivery_request'); socket.off('delivery_taken'); };
      }
    }
  }, [isAuthenticated, isOnline]);

  const handleToggle = async () => {
    setToggling(true);
    try {
      const newStatus = await toggleOnline();
      toast.success(newStatus ? 'Vous êtes en ligne !' : 'Vous êtes hors ligne');
    } catch { toast.error('Erreur de connexion'); }
    finally { setToggling(false); }
  };

  if (authLoading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full" /></div>;

  return (
    <div className="pb-24">
      {/* Header */}
      <div className={`p-6 text-white transition-colors ${isOnline ? 'bg-gradient-to-br from-blue-500 to-blue-700' : 'bg-gray-600'}`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm opacity-80">Bonjour</p>
            <h1 className="text-xl font-bold">{user?.full_name || 'Livreur'}</h1>
          </div>
          <button onClick={handleToggle} disabled={toggling}
            className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl transition-all shadow-lg ${isOnline ? 'bg-white text-blue-600 animate-pulse' : 'bg-gray-700 text-gray-300'}`}>
            <FiPower />
          </button>
        </div>
        <div className="text-center py-2 rounded-lg bg-white/10">
          <p className="text-lg font-semibold">{isOnline ? '🟢 En ligne' : '🔴 Hors ligne'}</p>
          <p className="text-xs opacity-70">{isOnline ? 'Vous recevez des commandes' : 'Activez pour recevoir des commandes'}</p>
        </div>
      </div>

      {/* Gains du jour */}
      <div className="p-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="text-sm font-medium text-gray-500 mb-3">Gains du jour</h2>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-3xl font-bold text-blue-600">{(earnings.today || 0).toLocaleString()} <span className="text-sm">CDF</span></p>
              <p className="text-xs text-gray-400 mt-1">Semaine: {(earnings.week || 0).toLocaleString()} CDF</p>
            </div>
            <button onClick={() => router.push('/earnings')} className="text-blue-500 text-sm flex items-center gap-1">
              Détails <FiChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Active delivery */}
      {activeDelivery && (
        <div className="px-4 mb-4">
          <button onClick={() => router.push(`/delivery/${activeDelivery.id}`)}
            className="w-full bg-blue-600 text-white rounded-2xl p-4 text-left shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center"><FiNavigation size={24} /></div>
              <div className="flex-1">
                <p className="font-semibold">Livraison en cours</p>
                <p className="text-sm opacity-80">Commande #{activeDelivery.order_number}</p>
              </div>
              <FiChevronRight size={20} />
            </div>
          </button>
        </div>
      )}

      {/* Available Orders */}
      {isOnline && (
        <div className="px-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-800">Commandes disponibles</h2>
            <span className="bg-blue-100 text-blue-600 text-xs font-medium px-2 py-1 rounded-full">{availableOrders.length}</span>
          </div>
          {availableOrders.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
              <FiTruck size={40} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">Aucune commande disponible</p>
              <p className="text-xs text-gray-400 mt-1">Restez en ligne, de nouvelles commandes arrivent bientôt</p>
            </div>
          ) : (
            <div className="space-y-3">
              {availableOrders.map((order) => (
                <button key={order.id} onClick={() => router.push(`/delivery/${order.id}`)}
                  className="w-full bg-white rounded-2xl p-4 text-left shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-gray-800">#{order.order_number}</span>
                    <span className="text-blue-600 font-bold">{(order.delivery_fee || 0).toLocaleString()} CDF</span>
                  </div>
                  <div className="space-y-1 text-sm text-gray-500">
                    <div className="flex items-center gap-2"><FiMapPin size={14} className="text-green-500" /><span className="truncate">{order.business_name || order.supplier_name || 'Fournisseur'}</span></div>
                    <div className="flex items-center gap-2"><FiMapPin size={14} className="text-red-500" /><span className="truncate">{order.delivery_address || 'Adresse de livraison'}</span></div>
                    {order.client_name && <div className="flex items-center gap-2 text-xs text-gray-400"><span>Client : {order.client_name}</span></div>}
                    <div className="flex items-center gap-2"><FiClock size={14} /><span>{order.distance_to_pickup ? `${order.distance_to_pickup} km` : '—'}</span></div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 safe-bottom">
        <div className="max-w-lg mx-auto flex items-center justify-around py-2">
          {[
            { icon: FiTruck, label: 'Accueil', path: '/' },
            { icon: FiList, label: 'Historique', path: '/history' },
            { icon: FiDollarSign, label: 'Gains', path: '/earnings' },
            { icon: FiUser, label: 'Profil', path: '/profile' },
          ].map(({ icon: Icon, label, path }) => (
            <button key={path} onClick={() => router.push(path)}
              className={`flex flex-col items-center py-1 px-3 ${path === '/' ? 'text-blue-600' : 'text-gray-400'}`}>
              <Icon size={22} />
              <span className="text-[10px] mt-1">{label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
