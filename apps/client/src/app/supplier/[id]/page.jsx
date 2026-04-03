'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import api from '@/lib/api';
import { useCartStore } from '@/stores/cartStore';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { FiArrowLeft, FiStar, FiClock, FiMapPin, FiPlus, FiMinus, FiShoppingCart } from 'react-icons/fi';

export default function SupplierPage() {
  const { id } = useParams();
  const [supplier, setSupplier] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addItem, items } = useCartStore();

  useEffect(() => {
    fetchData();
  }, [id]);

  async function fetchData() {
    try {
      const [supRes, prodRes] = await Promise.all([
        api.get(`/suppliers/${id}`),
        api.get(`/suppliers/${id}/products`),
      ]);
      setSupplier(supRes.data.data);
      setProducts(prodRes.data.data || []);
    } catch (error) {
      toast.error('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }

  const handleAddToCart = (product) => {
    addItem({
      ...product,
      supplier_id: id,
      supplier_name: supplier?.business_name,
    });
    toast.success(`${product.name} ajouté au panier`);
  };

  const getCartQuantity = (productId) => {
    const item = items.find((i) => i.id === productId);
    return item ? item.quantity : 0;
  };

  const cartTotal = items.reduce((sum, i) => sum + (parseFloat(i.promo_price || i.price) * i.quantity), 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="skeleton h-48 w-full rounded-2xl mb-4" />
        <div className="skeleton h-6 w-48 mb-2" />
        <div className="skeleton h-4 w-32 mb-6" />
        {[1, 2, 3].map((i) => <div key={i} className="skeleton h-24 w-full rounded-xl mb-3" />)}
      </div>
    );
  }

  if (!supplier) return <div className="p-4 text-center">Fournisseur non trouvé</div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="relative h-48 bg-gray-300">
        {supplier.cover_url && (
          <img src={supplier.cover_url} alt="" className="w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <Link href="/" className="absolute top-4 left-4 p-2 bg-white/90 rounded-full">
          <FiArrowLeft size={20} />
        </Link>
      </div>

      {/* Info */}
      <div className="bg-white -mt-6 relative rounded-t-3xl px-4 pt-5 pb-4">
        <div className="flex items-start gap-3">
          <div className="w-16 h-16 rounded-2xl bg-primary-50 flex items-center justify-center text-2xl flex-shrink-0 shadow-sm">
            {supplier.logo_url ? (
              <img src={supplier.logo_url} alt="" className="w-full h-full rounded-2xl object-cover" />
            ) : '🏪'}
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-dark-800">{supplier.business_name}</h1>
            <p className="text-sm text-gray-500 capitalize">{supplier.business_type}</p>
            <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <FiStar className="text-yellow-500" /> {parseFloat(supplier.rating).toFixed(1)}
              </span>
              <span className="flex items-center gap-1">
                <FiClock /> {supplier.preparation_time || 30} min
              </span>
              {supplier.address && (
                <span className="flex items-center gap-1"><FiMapPin /> {supplier.address}</span>
              )}
            </div>
          </div>
        </div>
        {supplier.description && (
          <p className="text-xs text-gray-500 mt-3">{supplier.description}</p>
        )}
      </div>

      {/* Products */}
      <div className="px-4 mt-4">
        <h2 className="font-bold text-dark-800 mb-3">Menu / Produits</h2>
        {products.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-8">Aucun produit disponible</p>
        ) : (
          <div className="space-y-3">
            {products.map((product) => (
              <div key={product.id} className="bg-white rounded-2xl p-3 flex gap-3 shadow-sm">
                <div className="w-20 h-20 bg-gray-100 rounded-xl flex-shrink-0 overflow-hidden">
                  {product.image_url ? (
                    <img src={product.image_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl">🍔</div>
                  )}
                </div>
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-semibold text-sm text-dark-800">{product.name}</h3>
                    {product.description && (
                      <p className="text-xs text-gray-400 line-clamp-2 mt-0.5">{product.description}</p>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <div>
                      {product.promo_price ? (
                        <div className="flex items-center gap-1">
                          <span className="font-bold text-primary-500 text-sm">{parseInt(product.promo_price)} CDF</span>
                          <span className="text-xs text-gray-400 line-through">{parseInt(product.price)} CDF</span>
                        </div>
                      ) : (
                        <span className="font-bold text-dark-800 text-sm">{parseInt(product.price)} CDF</span>
                      )}
                    </div>

                    {getCartQuantity(product.id) > 0 ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => useCartStore.getState().updateQuantity(product.id, getCartQuantity(product.id) - 1)}
                          className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center"
                        >
                          <FiMinus size={14} />
                        </button>
                        <span className="text-sm font-semibold w-5 text-center">{getCartQuantity(product.id)}</span>
                        <button
                          onClick={() => handleAddToCart(product)}
                          className="w-7 h-7 rounded-full bg-primary-500 text-white flex items-center justify-center"
                        >
                          <FiPlus size={14} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleAddToCart(product)}
                        className="px-3 py-1.5 bg-primary-500 text-white rounded-full text-xs font-medium flex items-center gap-1"
                      >
                        <FiPlus size={12} /> Ajouter
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cart bar */}
      {items.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 safe-bottom">
          <Link
            href="/cart"
            className="block bg-primary-500 text-white rounded-2xl py-3.5 px-5 flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <FiShoppingCart size={18} />
              <span className="font-semibold text-sm">{items.length} article(s)</span>
            </div>
            <span className="font-bold">{Math.round(cartTotal)} CDF</span>
          </Link>
        </div>
      )}
    </div>
  );
}
