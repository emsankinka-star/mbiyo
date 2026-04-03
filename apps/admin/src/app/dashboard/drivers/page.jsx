'use client';
import { useEffect, useState } from 'react';
import api from '../../../lib/api';
import toast from 'react-hot-toast';
import { FiCheck, FiX, FiPhone, FiTruck, FiStar, FiEye } from 'react-icons/fi';

export default function DriversPage() {
  const [drivers, setDrivers] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  const fetchDrivers = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/users', { params: { role: 'driver' } });
      setDrivers(data.data.users || data.data || []);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchDrivers(); }, []);

  const handleValidate = async (driverId, approved) => {
    try {
      await api.put(`/admin/drivers/${driverId}/validate`, { approved });
      toast.success(approved ? 'Livreur validé !' : 'Livreur refusé');
      fetchDrivers();
    } catch { toast.error('Erreur'); }
  };

  const filtered = filter === 'all' ? drivers :
    filter === 'pending' ? drivers.filter(d => d.verification_status === 'pending') :
    filter === 'validated' ? drivers.filter(d => d.verification_status === 'approved') : drivers;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Livreurs</h1>
        <p className="text-sm text-gray-400">{drivers.length} livreur(s) inscrits</p>
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
        {filtered.map((driver) => (
          <div key={driver.id} className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-lg font-bold text-blue-600">
                  {driver.full_name?.charAt(0) || '?'}
                </div>
                <div>
                  <h3 className="font-semibold">{driver.full_name}</h3>
                  <p className="text-sm text-gray-400 flex items-center gap-1"><FiPhone size={12} /> {driver.phone}</p>
                </div>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                driver.verification_status === 'approved' ? 'bg-green-100 text-green-700' :
                driver.verification_status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                'bg-red-100 text-red-700'
              }`}>{driver.verification_status === 'approved' ? 'Validé' : driver.verification_status === 'pending' ? 'En attente' : 'Refusé'}</span>
            </div>

            <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
              <span className="flex items-center gap-1"><FiTruck size={14} /> {driver.vehicle_type || 'Moto'}</span>
              <span className="flex items-center gap-1"><FiStar size={14} className="text-yellow-500" /> {driver.rating || '—'}</span>
              <span>{driver.total_deliveries || 0} livraisons</span>
            </div>

            {driver.verification_status === 'pending' && (
              <div className="flex gap-2 mt-2">
                <button onClick={() => handleValidate(driver.id, false)}
                  className="flex-1 py-2 rounded-xl border-2 border-red-200 text-red-500 text-sm font-medium flex items-center justify-center gap-1">
                  <FiX size={16} /> Refuser
                </button>
                <button onClick={() => handleValidate(driver.id, true)}
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
