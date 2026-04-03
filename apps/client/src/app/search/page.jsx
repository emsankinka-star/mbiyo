'use client';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import Link from 'next/link';
import { FiSearch, FiArrowLeft } from 'react-icons/fi';

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
      </div>
    }>
      <SearchContent />
    </Suspense>
  );
}

function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);

  const doSearch = async (q) => {
    if (!q.trim()) return;
    setLoading(true);
    try {
      const { data } = await api.get('/products/search', { params: { q, limit: 30 } });
      setProducts(data.data?.products || data.data || []);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => {
    const q = searchParams.get('q');
    if (q) { setQuery(q); doSearch(q); }
  }, [searchParams]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) doSearch(query);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white px-4 py-4 flex items-center gap-3 border-b border-gray-100">
        <button onClick={() => router.back()} className="p-2"><FiArrowLeft size={20} /></button>
        <form onSubmit={handleSubmit} className="flex-1 relative">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher produits..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-100 text-sm outline-none" autoFocus />
        </form>
      </header>

      <div className="px-4 mt-4">
        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="bg-gray-200 animate-pulse h-20 rounded-2xl" />)}</div>
        ) : products.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <FiSearch size={40} className="mx-auto mb-3" />
            <p>{query ? 'Aucun résultat' : 'Tapez pour rechercher'}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {products.map((p) => (
              <Link key={p.id} href={`/supplier/${p.supplier_id}`}
                className="bg-white rounded-2xl p-3 flex gap-3 shadow-sm block">
                <div className="w-16 h-16 bg-gray-100 rounded-xl flex-shrink-0 overflow-hidden">
                  {p.image_url ? <img src={p.image_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xl">🍽️</div>}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-sm">{p.name}</h3>
                  <p className="text-xs text-gray-400">{p.supplier_name}</p>
                  <p className="text-primary-500 font-bold text-sm mt-1">{(p.promo_price || p.price || 0).toLocaleString()} CDF</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
