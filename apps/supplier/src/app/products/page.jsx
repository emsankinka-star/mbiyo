'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import useAuthStore from '../../stores/authStore';
import useSupplierStore from '../../stores/supplierStore';
import toast from 'react-hot-toast';
import { FiPlus, FiEdit2, FiTrash2, FiToggleLeft, FiToggleRight, FiSearch, FiPackage, FiImage, FiBox } from 'react-icons/fi';

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
                    <p className="text-green-600 font-bold text-sm">
                      {Math.round(product.price || 0).toLocaleString()} CDF{product.unit && product.unit !== 'piece' ? `/${UNIT_SHORT[product.unit] || product.unit}` : ''}
                    </p>
                    {product.description && <p className="text-xs text-gray-400 truncate mt-0.5">{product.description}</p>}
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${product.is_available ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-500'}`}>
                        {product.is_available ? 'Disponible' : 'Indisponible'}
                      </span>
                      {product.stock_quantity != null && (
                        <span className="text-xs text-gray-400">
                          Stock: {product.stock_quantity === -1 ? '∞' : product.stock_quantity}
                        </span>
                      )}
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

const UNIT_LABELS = { piece: 'Pièce', kg: 'Kilogramme', g: 'Gramme', L: 'Litre', mL: 'Millilitre', m: 'Mètre', pack: 'Paquet' };
const UNIT_SHORT = { piece: 'pce', kg: 'kg', g: 'g', L: 'L', mL: 'mL', m: 'm', pack: 'paq' };
const UNIT_DEFAULTS = {
  piece: { min_quantity: 1, step: 1 },
  kg:    { min_quantity: 0.1, step: 0.1 },
  g:     { min_quantity: 100, step: 100 },
  L:     { min_quantity: 0.5, step: 0.5 },
  mL:    { min_quantity: 100, step: 100 },
  m:     { min_quantity: 0.5, step: 0.5 },
  pack:  { min_quantity: 1, step: 1 },
};

function ProductFormModal({ product, onClose, onSaved }) {
  const { createProduct, updateProduct, uploadProductImage } = useSupplierStore();
  const [form, setForm] = useState({
    name: product?.name || '',
    description: product?.description || '',
    price: product?.price || '',
    promo_price: product?.promo_price || '',
    category_id: product?.category_id || '',
    stock_quantity: product?.stock_quantity === -1 ? '' : (product?.stock_quantity ?? ''),
    unit: product?.unit || 'piece',
    min_quantity: product?.min_quantity || '',
    step: product?.step || '',
  });
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [unlimitedStock, setUnlimitedStock] = useState(product ? product.stock_quantity === -1 : true);

  const update = (k, v) => {
    const next = { ...form, [k]: v };
    // Auto-fill min_quantity and step when unit changes
    if (k === 'unit' && UNIT_DEFAULTS[v]) {
      next.min_quantity = UNIT_DEFAULTS[v].min_quantity;
      next.step = UNIT_DEFAULTS[v].step;
    }
    setForm(next);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        name: form.name,
        description: form.description,
        price: parseFloat(form.price),
        unit: form.unit,
        min_quantity: parseFloat(form.min_quantity) || UNIT_DEFAULTS[form.unit].min_quantity,
        step: parseFloat(form.step) || UNIT_DEFAULTS[form.unit].step,
        stock_quantity: unlimitedStock ? -1 : (parseInt(form.stock_quantity) || 0),
      };
      if (form.promo_price) payload.promo_price = parseFloat(form.promo_price);
      if (form.category_id) payload.category_id = form.category_id;
      if (form.description) payload.description = form.description;

      let saved;
      if (product) {
        saved = await updateProduct(product.id, payload);
      } else {
        saved = await createProduct(payload);
      }

      // Upload image séparément (non-bloquant pour la création)
      if (image && saved?.id) {
        try {
          await uploadProductImage(saved.id, image);
        } catch (imgErr) {
          console.error('Erreur upload image:', imgErr);
          toast.error('Produit créé mais l\'image n\'a pas pu être uploadée');
        }
      }

      toast.success(product ? 'Produit modifié' : 'Produit ajouté');
      onSaved();
    } catch (err) {
      console.error('Erreur produit:', err.response?.data || err.message);
      toast.error(err.response?.data?.message || err.message || 'Erreur lors de l\'enregistrement');
    } finally { setLoading(false); }
  };

  const isPieceUnit = form.unit === 'piece' || form.unit === 'pack';

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
      <div className="bg-white rounded-t-3xl w-full max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">{product ? 'Modifier' : 'Nouveau produit'}</h2>
          <button onClick={onClose} className="text-gray-400 text-2xl">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="Nom du produit"
            className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm outline-none focus:border-green-500" required />
          <textarea value={form.description} onChange={(e) => update('description', e.target.value)} placeholder="Description..."
            className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm outline-none focus:border-green-500 resize-none h-16" />

          {/* Unité de mesure */}
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Unité de vente</label>
            <div className="grid grid-cols-4 gap-2">
              {Object.entries(UNIT_LABELS).map(([key, label]) => (
                <button key={key} type="button" onClick={() => update('unit', key)}
                  className={`py-2 px-1 rounded-xl text-xs font-medium border transition-colors ${
                    form.unit === key 
                      ? 'bg-green-600 text-white border-green-600' 
                      : 'bg-white text-gray-600 border-gray-200 hover:border-green-300'
                  }`}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Prix */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">
                Prix {!isPieceUnit ? `par ${UNIT_SHORT[form.unit]}` : ''} (CDF)
              </label>
              <input type="number" step="any" value={form.price} onChange={(e) => update('price', e.target.value)}
                placeholder={`Ex: ${form.unit === 'kg' ? '5000' : '500'}`}
                className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm outline-none focus:border-green-500" required />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Prix promo (optionnel)</label>
              <input type="number" step="any" value={form.promo_price} onChange={(e) => update('promo_price', e.target.value)}
                placeholder="Prix réduit"
                className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm outline-none focus:border-green-500" />
            </div>
          </div>

          {/* Quantités min et incrément pour les unités non-pièce */}
          {!isPieceUnit && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Quantité min ({UNIT_SHORT[form.unit]})</label>
                <input type="number" step="any" value={form.min_quantity} onChange={(e) => update('min_quantity', e.target.value)}
                  placeholder={`${UNIT_DEFAULTS[form.unit]?.min_quantity}`}
                  className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm outline-none focus:border-green-500" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Incrément ({UNIT_SHORT[form.unit]})</label>
                <input type="number" step="any" value={form.step} onChange={(e) => update('step', e.target.value)}
                  placeholder={`${UNIT_DEFAULTS[form.unit]?.step}`}
                  className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm outline-none focus:border-green-500" />
              </div>
            </div>
          )}

          {/* Stock */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-gray-500">Stock</label>
              <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer">
                <input type="checkbox" checked={unlimitedStock} onChange={(e) => setUnlimitedStock(e.target.checked)}
                  className="rounded border-gray-300" /> Illimité
              </label>
            </div>
            {!unlimitedStock && (
              <input type="number" step="any" value={form.stock_quantity} onChange={(e) => update('stock_quantity', e.target.value)}
                placeholder={`Stock disponible (${UNIT_SHORT[form.unit]})`}
                className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm outline-none focus:border-green-500" />
            )}
          </div>

          {/* Image */}
          <label className="flex items-center gap-3 border-2 border-dashed border-gray-200 rounded-xl p-4 cursor-pointer">
            <FiImage className="text-gray-400" />
            <span className="text-sm text-gray-500">{image ? image.name : (product?.image_url ? 'Changer la photo' : 'Photo du produit')}</span>
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
