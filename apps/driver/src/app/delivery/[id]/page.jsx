'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import useAuthStore from '../../stores/authStore';
import useDriverStore from '../../stores/driverStore';
import { getSocket } from '../../lib/socket';
import toast from 'react-hot-toast';
import api from '../../lib/api';
import { FiPhone, FiMapPin, FiNavigation, FiCheck, FiPackage, FiArrowLeft } from 'react-icons/fi';

const STATUS_STEPS = [
  { key: 'accepted_by_driver', label: 'Commande acceptée', icon: FiCheck },
  { key: 'picked_up', label: 'Récupérée', icon: FiPackage },
  { key: 'delivering', label: 'En route', icon: FiNavigation },
  { key: 'delivered', label: 'Livrée', icon: FiCheck },
];

export default function DeliveryPage() {
  const { id } = useParams();
  const router = useRouter();
  const { isAuthenticated, loadUser } = useAuthStore();
  const { updateDeliveryStatus, acceptDelivery } = useDriverStore();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const watchId = useRef(null);

  useEffect(() => { loadUser(); }, []);

  useEffect(() => {
    if (!id) return;
    const fetchOrder = async () => {
      try {
        const { data } = await api.get(`/orders/${id}`);
        setOrder(data.data);
      } catch { toast.error('Commande introuvable'); router.back(); }
      finally { setLoading(false); }
    };
    fetchOrder();
  }, [id]);

  // Live GPS tracking
  useEffect(() => {
    if (order && ['accepted_by_driver', 'picked_up', 'delivering'].includes(order.status)) {
      if ('geolocation' in navigator) {
        watchId.current = navigator.geolocation.watchPosition(
          (pos) => {
            const socket = getSocket();
            if (socket) socket.emit('driver:location_update', {
              latitude: pos.coords.latitude, longitude: pos.coords.longitude, orderId: id,
            });
          },
          null, { enableHighAccuracy: true, maximumAge: 5000 }
        );
      }
    }
    return () => { if (watchId.current) navigator.geolocation.clearWatch(watchId.current); };
  }, [order?.status]);

  const handleAction = async (action) => {
    setActionLoading(true);
    try {
      if (action === 'accept') {
        await acceptDelivery(id);
        const { data } = await api.get(`/orders/${id}`);
        setOrder(data.data);
        toast.success('Livraison acceptée !');
      } else {
        await updateDeliveryStatus(id, action);
        const { data } = await api.get(`/orders/${id}`);
        setOrder(data.data);
        if (action === 'delivered') {
          toast.success('Livraison terminée ! 🎉');
          setTimeout(() => router.replace('/'), 2000);
        } else {
          toast.success('Statut mis à jour');
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur');
    } finally { setActionLoading(false); }
  };

  const getNextAction = () => {
    if (!order) return null;
    switch (order.status) {
      case 'ready': return { action: 'accept', label: 'Accepter la livraison', color: 'bg-blue-600' };
      case 'accepted_by_driver': return { action: 'picked-up', label: 'Commande récupérée', color: 'bg-orange-500' };
      case 'picked_up': return { action: 'delivering', label: 'En route vers le client', color: 'bg-blue-600' };
      case 'delivering': return { action: 'delivered', label: 'Confirmer la livraison', color: 'bg-green-600' };
      default: return null;
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full" /></div>;

  const nextAction = getNextAction();
  const currentStepIdx = STATUS_STEPS.findIndex(s => s.key === order?.status);

  return (
    <div className="min-h-screen pb-28">
      {/* Header */}
      <div className="bg-blue-600 text-white p-4">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => router.back()} className="p-2"><FiArrowLeft size={20} /></button>
          <div>
            <h1 className="font-semibold">Livraison #{order?.order_number}</h1>
            <p className="text-sm opacity-80">{order?.status?.replace(/_/g, ' ')}</p>
          </div>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-1 mt-2">
          {STATUS_STEPS.map((step, i) => (
            <div key={step.key} className={`h-1 flex-1 rounded ${i <= currentStepIdx ? 'bg-white' : 'bg-white/30'}`} />
          ))}
        </div>
      </div>

      {/* Map placeholder */}
      <div className="h-48 bg-gray-200 flex items-center justify-center text-gray-400">
        <FiMapPin size={32} className="mr-2" /> Carte Mapbox
      </div>

      {/* Order details */}
      <div className="p-4 space-y-4">
        {/* Pickup */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mt-1"><FiMapPin className="text-green-600" /></div>
            <div className="flex-1">
              <p className="text-xs text-gray-400">RÉCUPÉRATION</p>
              <p className="font-semibold">{order?.supplier_name || 'Fournisseur'}</p>
              <p className="text-sm text-gray-500">{order?.supplier_address || 'Adresse du fournisseur'}</p>
            </div>
            {order?.supplier_phone && (
              <a href={`tel:${order.supplier_phone}`} className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <FiPhone className="text-blue-600" />
              </a>
            )}
          </div>
        </div>

        {/* Delivery */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center mt-1"><FiMapPin className="text-red-600" /></div>
            <div className="flex-1">
              <p className="text-xs text-gray-400">LIVRAISON</p>
              <p className="font-semibold">{order?.client_name || 'Client'}</p>
              <p className="text-sm text-gray-500">{order?.delivery_address || 'Adresse de livraison'}</p>
              {order?.delivery_notes && <p className="text-xs text-gray-400 mt-1">Note: {order.delivery_notes}</p>}
            </div>
            {order?.client_phone && (
              <a href={`tel:${order.client_phone}`} className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <FiPhone className="text-blue-600" />
              </a>
            )}
          </div>
        </div>

        {/* Order items summary */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="font-semibold mb-2">Détails de la commande</h3>
          <div className="flex justify-between text-sm text-gray-500">
            <span>{order?.items?.length || 0} article(s)</span>
            <span className="font-semibold text-gray-800">{(order?.total_amount || 0).toLocaleString()} CDF</span>
          </div>
          <div className="flex justify-between text-sm mt-1">
            <span className="text-gray-500">Frais de livraison</span>
            <span className="font-semibold text-blue-600">{(order?.delivery_fee || 0).toLocaleString()} CDF</span>
          </div>
        </div>
      </div>

      {/* Action button */}
      {nextAction && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t safe-bottom">
          <div className="max-w-lg mx-auto">
            <button onClick={() => handleAction(nextAction.action)} disabled={actionLoading}
              className={`w-full ${nextAction.color} text-white font-semibold py-4 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50`}>
              {actionLoading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : nextAction.label}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
