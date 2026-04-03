'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import useAuthStore from '../../stores/authStore';
import useSupplierStore from '../../stores/supplierStore';
import toast from 'react-hot-toast';
import { FiPlus, FiEdit2, FiTrash2, FiToggleLeft, FiToggleRight, FiSearch, FiPackage, FiImage } from 'react-icons/fi';

export default function ProductsPage() {
  const router = useRouter();
  const { isAuthenticated, loadUser } = useAuthStore();
  const { products, fetchProducts, deleteProduct, toggleProductAvailability } = useSupplierStore();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  useEffect(() => { loadUser(); }, []);
  useEffect(() => { if (isAuthenticated) fetchProducts(); }, [isAuthenticated]);

  const filtered = products.filter(p => p.name?.toLowerCase().includes(search.toLowerCase()));

  const handleDelete = async (id) => {
    if (!confirm('Supprimer ce produit ?')) return;
    try {
      await deleteProduct(id);
      toast.success('Produit supprimé');
      fetchProducts();
    } catch { toast.error('Erreur'); }
  };

  const handleToggle = async (id) => {
    try {
      await toggleProductAvailability(id);
      fetchProducts();
    } catch { toast.error('Erreur'); }
  };

  return (
    <div className="min-h-screen pb-24">
      <div className="bg-white border-b p-4">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg font-bold">Mes produits</h1>
          <button onClick={() => { setEditingProduct(null); setShowForm(true); }}
            className="bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-1">
            <FiPlus size={16} /> Ajouter
          </button>
        </div>
        <div className="flex items-center bg-gray-100 rounded-xl px-3 py-2.5">
          <FiSearch className="text-gray-400 mr-2" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un produit..."
            className="flex-1 bg-transparent outline-none text-sm" />
        </div>
      </div>

      <div className="p-4">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <FiPackage size={40} className="mx-auto mb-3" />
            <p>Aucun produit</p>
            <button onClick={() => setShowForm(true)} className="text-green-600 text-sm mt-2">+ Ajouter votre premier produit</button>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((product) => (
              <div key={product.id} className={`bg-white rounded-2xl p-4 shadow-sm ${!product.is_available ? 'opacity-60' : ''}`}>
                <div className="flex gap-3">
                  <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <FiImage className="text-gray-300" size={24} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm truncate">{product.name}</h3>
                    <p className="text-green-600 font-bold text-sm">{(product.price || 0).toLocaleString()} CDF</p>
                    {product.description && <p className="text-xs text-gray-400 truncate mt-0.5">{product.description}</p>}
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${product.is_available ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-500'}`}>
                        {product.is_available ? 'Disponible' : 'Indisponible'}
                      </span>
                      {product.stock !== null && <span className="text-xs text-gray-400">Stock: {product.stock}</span>}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <button onClick={() => handleToggle(product.id)} className="p-2 text-gray-400 hover:text-green-600">
                      {product.is_available ? <FiToggleRight size={18} className="text-green-500" /> : <FiToggleLeft size={18} />}
                    </button>
                    <button onClick={() => { setEditingProduct(product); setShowForm(true); }} className="p-2 text-gray-400 hover:text-blue-600">
                      <FiEdit2 size={16} />
                    </button>
                    <button onClick={() => handleDelete(product.id)} className="p-2 text-gray-400 hover:text-red-600">
                      <FiTrash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Product Form Modal */}
      {showForm && <ProductFormModal product={editingProduct} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); fetchProducts(); }} />}
    </div>
  );
}

function ProductFormModal({ product, onClose, onSaved }) {
  const { createProduct, updateProduct } = useSupplierStore();
  const [form, setForm] = useState({
    name: product?.name || '', description: product?.description || '',
    price: product?.price || '', category_id: product?.category_id || '',
    stock: product?.stock || '', preparation_time: product?.preparation_time || '',
  });
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);

  const update = (k, v) => setForm({ ...form, [k]: v });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v); });
      if (image) fd.append('image', image);
      if (product) await updateProduct(product.id, fd);
      else await createProduct(fd);
      toast.success(product ? 'Produit modifié' : 'Produit ajouté');
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur');
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
      <div className="bg-white rounded-t-3xl w-full max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">{product ? 'Modifier' : 'Nouveau produit'}</h2>
          <button onClick={onClose} className="text-gray-400 text-2xl">×</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="Nom du produit"
            className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm outline-none focus:border-green-500" required />
          <textarea value={form.description} onChange={(e) => update('description', e.target.value)} placeholder="Description..."
            className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm outline-none focus:border-green-500 resize-none h-16" />
          <div className="grid grid-cols-2 gap-3">
            <input type="number" value={form.price} onChange={(e) => update('price', e.target.value)} placeholder="Prix (CDF)"
              className="border border-gray-200 rounded-xl px-3 py-3 text-sm outline-none focus:border-green-500" required />
            <input type="number" value={form.stock} onChange={(e) => update('stock', e.target.value)} placeholder="Stock"
              className="border border-gray-200 rounded-xl px-3 py-3 text-sm outline-none focus:border-green-500" />
          </div>
          <input type="number" value={form.preparation_time} onChange={(e) => update('preparation_time', e.target.value)} placeholder="Temps de préparation (min)"
            className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm outline-none focus:border-green-500" />
          <label className="flex items-center gap-3 border-2 border-dashed border-gray-200 rounded-xl p-4 cursor-pointer">
            <FiImage className="text-gray-400" />
            <span className="text-sm text-gray-500">{image ? image.name : 'Photo du produit'}</span>
            <input type="file" accept="image/*" className="hidden" onChange={(e) => setImage(e.target.files[0])} />
          </label>
          <button type="submit" disabled={loading}
            className="w-full bg-green-600 text-white font-semibold py-3.5 rounded-xl disabled:opacity-50">
            {loading ? 'Enregistrement...' : (product ? 'Modifier' : 'Ajouter')}
          </button>
        </form>
      </div>
    </div>
  );
}
