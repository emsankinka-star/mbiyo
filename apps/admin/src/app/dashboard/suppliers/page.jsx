'use client';
import { useEffect, useState } from 'react';
import api from '../../../lib/api';
import toast from 'react-hot-toast';
import { FiCheck, FiX, FiMapPin, FiPhone, FiStar } from 'react-icons/fi';

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/users', { params: { role: 'supplier' } });
      setSuppliers(data.data.users || data.data || []);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchSuppliers(); }, []);

  const handleValidate = async (supplierId, approved) => {
    try {
      await api.put(`/admin/suppliers/${supplierId}/validate`, { approved });
      toast.success(approved ? 'Fournisseur validé !' : 'Fournisseur refusé');
      fetchSuppliers();
    } catch { toast.error('Erreur'); }
  };

  const filtered = filter === 'all' ? suppliers :
    filter === 'pending' ? suppliers.filter(s => s.verification_status === 'pending') :
    suppliers.filter(s => s.verification_status === 'approved');

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Fournisseurs</h1>
        <p className="text-sm text-gray-400">{suppliers.length} fournisseur(s)</p>
      </div>

      <div className="flex gap-2 mb-4">
        {['all', 'pending', 'validated'].map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-medium ${filter === f ? 'bg-primary-600 text-white' : 'bg-white text-gray-500 border'}`}>
            {f === 'all' ? 'Tous' : f === 'pending' ? 'En attente' : 'Validés'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((supplier) => (
          <div key={supplier.id} className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-lg font-bold text-green-600">
                  {supplier.business_name?.charAt(0) || supplier.full_name?.charAt(0) || '?'}
                </div>
                <div>
                  <h3 className="font-semibold">{supplier.business_name || supplier.full_name}</h3>
                  <p className="text-xs text-gray-400 capitalize">{supplier.business_type || '—'}</p>
                </div>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                supplier.verification_status === 'approved' ? 'bg-green-100 text-green-700' :
                supplier.verification_status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                'bg-red-100 text-red-700'
              }`}>{supplier.verification_status === 'approved' ? 'Validé' : supplier.verification_status === 'pending' ? 'En attente' : 'Refusé'}</span>
            </div>

            <div className="space-y-1 text-sm text-gray-500 mb-3">
              <div className="flex items-center gap-1"><FiPhone size={12} /> {supplier.phone}</div>
              <div className="flex items-center gap-1"><FiMapPin size={12} /> {supplier.address || 'Non renseigné'}</div>
              <div className="flex items-center gap-1"><FiStar size={12} className="text-yellow-500" /> {supplier.rating || '—'}</div>
            </div>

            {supplier.verification_status === 'pending' && (
              <div className="flex gap-2">
                <button onClick={() => handleValidate(supplier.id, false)}
                  className="flex-1 py-2 rounded-xl border-2 border-red-200 text-red-500 text-sm font-medium flex items-center justify-center gap-1">
                  <FiX size={16} /> Refuser
                </button>
                <button onClick={() => handleValidate(supplier.id, true)}
                  className="flex-1 py-2 rounded-xl bg-green-600 text-white text-sm font-medium flex items-center justify-center gap-1">
                  <FiCheck size={16} /> Valider
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
