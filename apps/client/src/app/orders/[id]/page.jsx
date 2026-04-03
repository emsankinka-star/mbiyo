'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { getSocket, connectSocket } from '@/lib/socket';
import { useAuthStore } from '@/stores/authStore';
import { FiArrowLeft, FiPhone, FiMessageCircle } from 'react-icons/fi';

const statusSteps = [
  { key: 'pending', label: 'En attente', icon: '⏳' },
  { key: 'accepted', label: 'Acceptée', icon: '✅' },
  { key: 'preparing', label: 'En préparation', icon: '👨‍🍳' },
  { key: 'ready', label: 'Prête', icon: '📦' },
  { key: 'picked_up', label: 'Récupérée', icon: '🛵' },
  { key: 'delivering', label: 'En livraison', icon: '🚀' },
  { key: 'delivered', label: 'Livrée', icon: '🎉' },
];

export default function OrderTrackingPage() {
  const { id } = useParams();
  const router = useRouter();
  const { token } = useAuthStore();
  const [order, setOrder] = useState(null);
  const [driverLocation, setDriverLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchOrder();
    setupSocket();
    return () => {
      const socket = getSocket();
      if (socket) {
        socket.emit('order:untrack', { order_id: id });
        socket.off('chat:message');
      }
    };
  }, [id]);

  // Fetch unread chat count
  useEffect(() => {
    if (order?.driver) {
      api.get(`/chat/${id}/unread`).then(({ data }) => {
        setUnreadCount(data.data?.unread || 0);
      }).catch(() => {});
    }
  }, [order?.driver, id]);

  async function fetchOrder() {
    try {
      const res = await api.get(`/orders/${id}`);
      setOrder(res.data.data);
    } catch (error) {
      console.error('Erreur chargement commande:', error);
    } finally {
      setLoading(false);
    }
  }

  function setupSocket() {
    if (!token) return;
    const socket = connectSocket(token);

    socket.emit('order:track', { order_id: id });

    socket.on('order_update', (data) => {
      if (data.order_id === id) {
        setOrder((prev) => prev ? { ...prev, status: data.status, driver: data.driver || prev?.driver } : prev);
      }
    });

    socket.on('driver:location', (data) => {
      setDriverLocation({ lat: data.latitude, lng: data.longitude });
    });

    socket.on('chat:message', (data) => {
      if (data.order_id === id) {
        setUnreadCount((prev) => prev + 1);
      }
    });
  }

  const currentStepIndex = order ? statusSteps.findIndex((s) => s.key === order.status) : -1;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="skeleton h-8 w-48 mb-4" />
        <div className="skeleton h-64 w-full rounded-2xl mb-4" />
        <div className="skeleton h-32 w-full rounded-2xl" />
      </div>
    );
  }

  if (!order) return <div className="p-4 text-center">Commande non trouvée</div>;

  const isCancelled = order.status === 'cancelled';
  const isDelivered = order.status === 'delivered';

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* Header */}
      <header className="bg-white px-4 py-4 flex items-center gap-3 border-b border-gray-100">
        <Link href="/orders" className="p-2"><FiArrowLeft size={20} /></Link>
        <div>
          <h1 className="font-bold text-dark-800">Commande #{order.order_number}</h1>
          <p className="text-xs text-gray-500">
            {order.supplier?.business_name}
          </p>
        </div>
      </header>

      {/* Map placeholder (sera remplacé par Mapbox) */}
      <div className="mx-4 mt-4 bg-gray-200 rounded-2xl h-48 flex items-center justify-center relative overflow-hidden">
        <div className="text-center">
          <p className="text-3xl mb-1">🗺️</p>
          <p className="text-xs text-gray-500">
            {driverLocation ? `Livreur: ${driverLocation.lat.toFixed(4)}, ${driverLocation.lng.toFixed(4)}` : 'Carte en temps réel'}
          </p>
        </div>
      </div>

      {/* Status Progress */}
      <div className="mx-4 mt-4 bg-white rounded-2xl p-4 shadow-sm">
        <h2 className="font-bold text-sm mb-4">
          {isCancelled ? '❌ Commande annulée' : isDelivered ? '🎉 Commande livrée!' : 'Suivi de commande'}
        </h2>

        {!isCancelled && (
          <div className="space-y-4">
            {statusSteps.map((step, index) => {
              const isActive = index <= currentStepIndex;
              const isCurrent = index === currentStepIndex;
              return (
                <div key={step.key} className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm
                    ${isCurrent ? 'bg-primary-500 text-white shadow-lg scale-110' :
                      isActive ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
                    {step.icon}
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm ${isCurrent ? 'font-bold text-dark-800' : isActive ? 'font-medium text-dark-700' : 'text-gray-400'}`}>
                      {step.label}
                    </p>
                  </div>
                  {isActive && <span className="text-green-500 text-xs">✓</span>}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Driver info */}
      {order.driver && (
        <div className="mx-4 mt-4 bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="font-bold text-sm mb-3">Votre livreur</h3>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary-50 flex items-center justify-center text-xl">
                🛵
              </div>
              <div>
                <p className="font-semibold text-sm">{order.driver.full_name || 'Livreur'}</p>
                <p className="text-xs text-gray-500">{order.driver.vehicle_type} - {order.driver.license_plate}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <a href={`tel:${order.driver.phone}`} className="p-2 bg-green-50 rounded-full text-green-600">
                <FiPhone size={18} />
              </a>
              <button onClick={() => router.push(`/chat/${id}`)} className="p-2 bg-blue-50 rounded-full text-blue-600 relative">
                <FiMessageCircle size={18} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order details */}
      <div className="mx-4 mt-4 bg-white rounded-2xl p-4 shadow-sm">
        <h3 className="font-bold text-sm mb-3">Détail de la commande</h3>
        {order.items?.map((item) => (
          <div key={item.id} className="flex justify-between py-2 border-b border-gray-50 last:border-0">
            <span className="text-sm text-gray-600">{item.quantity}x {item.product_name}</span>
            <span className="text-sm font-medium">{Math.round(parseFloat(item.total_price))} CDF</span>
          </div>
        ))}
        <div className="mt-3 pt-2 border-t space-y-1 text-sm">
          <div className="flex justify-between"><span className="text-gray-500">Sous-total</span><span>{Math.round(parseFloat(order.subtotal))} CDF</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Livraison</span><span>{Math.round(parseFloat(order.delivery_fee))} CDF</span></div>
          <div className="flex justify-between font-bold text-base mt-1 pt-1 border-t">
            <span>Total</span><span className="text-primary-500">{Math.round(parseFloat(order.total))} CDF</span>
          </div>
        </div>
      </div>

      {/* Rating (si livré) */}
      {isDelivered && (
        <div className="mx-4 mt-4 bg-white rounded-2xl p-4 shadow-sm text-center">
          <p className="font-bold mb-2">Notez votre expérience</p>
          <div className="flex justify-center gap-2 text-3xl mb-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button key={star} className="hover:scale-110 transition-transform">⭐</button>
            ))}
          </div>
          <Link href={`/review/${id}`} className="text-primary-500 text-sm font-medium">
            Laisser un avis détaillé →
          </Link>
        </div>
      )}
    </div>
  );
}
