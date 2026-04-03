'use client';

import { useCartStore } from '@/stores/cartStore';
import { useLocationStore } from '@/stores/locationStore';
import { useAuthStore } from '@/stores/authStore';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { useState, useEffect } from 'react';
import { FiArrowLeft, FiPlus, FiMinus, FiTrash2, FiMapPin, FiEdit2 } from 'react-icons/fi';
import AddressModal from '@/components/AddressModal';

const UNIT_SHORT = { piece: 'pce', kg: 'kg', g: 'g', L: 'L', mL: 'mL', m: 'm', pack: 'paq' };
const formatQty = (qty, unit) => {
  if (!unit || unit === 'piece' || unit === 'pack') return Math.round(qty).toString();
  return qty % 1 === 0 ? qty.toString() : qty.toFixed(1);
};

export default function CartPage() {
  const router = useRouter();
  const { items, supplierId, supplierName, removeItem, clearCart, incrementItem, decrementItem } = useCartStore();
  const { latitude, longitude, address, details } = useLocationStore();
  const { token } = useAuthStore();
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [deliveryFee, setDeliveryFee] = useState(null);

  const subtotal = items.reduce((sum, item) => sum + (parseFloat(item.promo_price || item.price) * item.quantity), 0);
  const total = subtotal + (deliveryFee || 0);

  const estimateDelivery = async () => {
    if (!latitude || !longitude || !supplierId) return;
    try {
      const res = await api.post('/orders/estimate', {
        supplier_id: supplierId,
        delivery_lat: latitude,
        delivery_lng: longitude,
      });
      setDeliveryFee(res.data.data.delivery_fee);
    } catch { }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { estimateDelivery(); }, [latitude, longitude, supplierId]);

  const handleOrder = async () => {
    if (!token) {
      toast.error('Connectez-vous pour commander');
      router.push('/auth/login');
      return;
    }
    if (!latitude || !longitude) {
      toast.error('Activez votre localisation');
      return;
    }

    setLoading(true);
    try {
      const orderData = {
        supplier_id: supplierId,
        items: items.map((item) => ({
          product_id: item.id,
          quantity: item.quantity,
          variants: item.selectedVariants || [],
          extras: item.selectedExtras || [],
        })),
        delivery_lat: latitude,
        delivery_lng: longitude,
        delivery_address: address || 'Repère GPS',
        delivery_details: details ? JSON.stringify(details) : null,
        notes,
      };

      const res = await api.post('/orders', orderData);
      clearCart();
      toast.success('Commande passée! 🎉');
      router.push(`/orders/${res.data.data.id}`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erreur lors de la commande');
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
        <p className="text-6xl mb-4">🛒</p>
        <h2 className="text-xl font-bold text-dark-800 mb-2">Votre panier est vide</h2>
        <p className="text-gray-500 text-sm mb-6">Ajoutez des articles pour commencer</p>
        <Link href="/" className="bg-primary-500 text-white px-6 py-3 rounded-xl font-semibold text-sm">
          Découvrir
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      {/* Header */}
      <header className="bg-white px-4 py-4 flex items-center gap-3 border-b border-gray-100">
        <button onClick={() => router.back()} className="p-2"><FiArrowLeft size={20} /></button>
        <div>
          <h1 className="font-bold text-dark-800">Mon panier</h1>
          <p className="text-xs text-gray-500">{supplierName}</p>
        </div>
      </header>

      {/* Items */}
      <div className="px-4 mt-4 space-y-3">
        {items.map((item) => (
          <div key={item.id} className="bg-white rounded-2xl p-3 flex gap-3 shadow-sm">
            <div className="w-16 h-16 bg-gray-100 rounded-xl flex-shrink-0">
              {item.image_url ? (
                <img src={item.image_url} alt="" className="w-full h-full object-cover rounded-xl" />
              ) : <div className="w-full h-full flex items-center justify-center text-xl">🍔</div>}
            </div>
            <div className="flex-1">
              <div className="flex justify-between">
                <h3 className="font-semibold text-sm">{item.name}</h3>
                <button onClick={() => removeItem(item.id)} className="text-red-400 p-1">
                  <FiTrash2 size={14} />
                </button>
              </div>
              <p className="text-primary-500 font-bold text-sm mt-1">
                {Math.round(parseFloat(item.promo_price || item.price) * item.quantity)} CDF
                {item.unit && item.unit !== 'piece' && (
                  <span className="text-xs text-gray-400 font-normal ml-1">
                    ({formatQty(item.quantity, item.unit)} {UNIT_SHORT[item.unit] || item.unit} × {parseInt(item.promo_price || item.price)} CDF/{UNIT_SHORT[item.unit]})
                  </span>
                )}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <button onClick={() => decrementItem(item.id)}
                  className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center">
                  {item.quantity <= (parseFloat(item.min_quantity) || parseFloat(item.step) || 1) 
                    ? <FiTrash2 size={13} className="text-red-400" />
                    : <FiMinus size={14} />}
                </button>
                <span className="text-sm font-semibold min-w-[2.5rem] text-center">
                  {formatQty(item.quantity, item.unit)}
                  {item.unit && item.unit !== 'piece' && <span className="text-[10px] text-gray-400 ml-0.5">{UNIT_SHORT[item.unit]}</span>}
                </span>
                <button onClick={() => incrementItem(item.id)}
                  className="w-7 h-7 rounded-full bg-primary-500 text-white flex items-center justify-center">
                  <FiPlus size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Delivery Address */}
      <div className="px-4 mt-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <FiMapPin className="text-primary-500" />
              <h3 className="font-semibold text-sm">Adresse de livraison</h3>
            </div>
            <button onClick={() => setShowAddressModal(true)} className="text-primary-500 p-1">
              <FiEdit2 size={16} />
            </button>
          </div>
          <p className="text-sm text-gray-800 font-medium">{address || 'Position GPS détectée'}</p>
          {details?.reference && (
            <p className="text-xs text-gray-400 mt-1">Repère : {details.reference}</p>
          )}
        </div>
      </div>

      {/* Notes */}
      <div className="px-4 mt-3">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Instructions spéciales (optionnel)"
          className="w-full p-3 bg-white rounded-2xl text-sm border border-gray-100 resize-none h-20 focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      {/* Summary & Order */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 pt-3 pb-4 safe-bottom">
        <div className="space-y-1 mb-3 text-sm">
          <div className="flex justify-between"><span className="text-gray-500">Sous-total</span><span>{Math.round(subtotal)} CDF</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Livraison</span><span>{deliveryFee ? `${Math.round(deliveryFee)} CDF` : 'Calcul...'}</span></div>
          <div className="flex justify-between font-bold text-lg border-t pt-1 mt-1">
            <span>Total</span><span className="text-primary-500">{Math.round(total)} CDF</span>
          </div>
        </div>
        <button
          onClick={handleOrder}
          disabled={loading}
          className="w-full bg-primary-500 text-white py-3.5 rounded-2xl font-bold text-sm disabled:opacity-50"
        >
          {loading ? 'Traitement...' : `Commander - ${Math.round(total)} CDF`}
        </button>
      </div>

      {/* Address Modal */}
      <AddressModal isOpen={showAddressModal} onClose={() => setShowAddressModal(false)} />
    </div>
  );
}
