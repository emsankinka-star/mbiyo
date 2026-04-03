'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import api from '@/lib/api';
import { FiArrowLeft, FiShoppingCart, FiPlus, FiMinus } from 'react-icons/fi';
import { useCartStore } from '@/stores/cartStore';
import toast from 'react-hot-toast';

export default function CategoryPage() {
  const router = useRouter();
  const { slug } = useParams();
  const [category, setCategory] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addItem, items } = useCartStore();

  useEffect(() => {
    const load = async () => {
      try {
        // Fetch categories to find the one matching slug
        const catRes = await api.get('/categories');
        const cats = catRes.data?.data || catRes.data || [];
        const cat = cats.find(c => c.slug === slug || c.id == slug);
        if (cat) {
          setCategory(cat);
          const prodRes = await api.get(`/products?category_id=${cat.id}`);
          setProducts(prodRes.data?.data || prodRes.data || []);
        }
      } catch { } finally { setLoading(false); }
    };
    load();
  }, [slug]);

  const handleAdd = (product) => {
    addItem(product);
    toast.success('Ajouté au panier');
  };

  const getQty = (id) => items.find(i => i.id === id)?.quantity || 0;

  const formatPrice = (p) => `${Number(p).toLocaleString()} FC`;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white px-4 pt-12 pb-4 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-1"><FiArrowLeft size={20} /></button>
          <h1 className="text-lg font-bold">{category?.name || 'Catégorie'}</h1>
        </div>
        {category?.description && (
          <p className="text-sm text-gray-500 mt-2">{category.description}</p>
        )}
      </header>

      <div className="px-4 mt-4">
        {loading ? (
          <div className="text-center py-12 text-gray-400">Chargement...</div>
        ) : products.length === 0 ? (
          <div className="text-center py-12 text-gray-400">Aucun produit dans cette catégorie</div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {products.filter(p => p.is_available !== false).map(p => (
              <div key={p.id} className="bg-white rounded-2xl overflow-hidden shadow-sm">
                <div className="aspect-square bg-gray-100 relative">
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl">📦</div>
                  )}
                  {p.stock_quantity === 0 && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <span className="text-white text-xs font-semibold bg-red-500 px-2 py-1 rounded-full">Rupture</span>
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <h3 className="text-sm font-semibold truncate">{p.name}</h3>
                  <p className="text-primary-500 font-bold text-sm mt-1">{formatPrice(p.price)}</p>
                  {p.stock_quantity !== 0 && (
                    <div className="mt-2">
                      {getQty(p.id) > 0 ? (
                        <div className="flex items-center justify-between bg-primary-50 rounded-lg px-2 py-1">
                          <button onClick={() => useCartStore.getState().removeItem(p.id)} className="text-primary-500"><FiMinus /></button>
                          <span className="text-sm font-semibold">{getQty(p.id)}</span>
                          <button onClick={() => handleAdd(p)} className="text-primary-500"><FiPlus /></button>
                        </div>
                      ) : (
                        <button onClick={() => handleAdd(p)}
                          className="w-full bg-primary-500 text-white py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1">
                          <FiShoppingCart size={14} /> Ajouter
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
