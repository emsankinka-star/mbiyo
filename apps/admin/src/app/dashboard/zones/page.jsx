'use client';
import { useEffect, useState } from 'react';
import api from '../../../lib/api';
import toast from 'react-hot-toast';
import { FiPlus, FiEdit2, FiTrash2, FiMapPin } from 'react-icons/fi';

export default function ZonesPage() {
  const [zones, setZones] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  const fetchZones = async () => {
    try {
      const { data } = await api.get('/delivery-zones');
      setZones(data.data || []);
    } catch {}
  };

  useEffect(() => { fetchZones(); }, []);

  const handleDelete = async (id) => {
    if (!confirm('Supprimer cette zone ?')) return;
    try {
      await api.delete(`/admin/delivery-zones/${id}`);
      toast.success('Zone supprimée');
      fetchZones();
    } catch { toast.error('Erreur'); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Zones de livraison</h1>
          <p className="text-sm text-gray-400">{zones.length} zone(s) configurée(s)</p>
        </div>
        <button onClick={() => { setEditing(null); setShowForm(true); }}
          className="bg-primary-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 hover:bg-primary-700">
          <FiPlus /> Ajouter une zone
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {zones.map((zone) => (
          <div key={zone.id} className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
                  <FiMapPin className="text-primary-600" />
                </div>
                <div>
                  <h3 className="font-semibold">{zone.name}</h3>
                  <p className="text-xs text-gray-400">{zone.description || '—'}</p>
                </div>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs ${zone.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {zone.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="text-sm text-gray-500 space-y-1 mb-3">
              <p>Frais de base: <strong>{(zone.base_fee || 0).toLocaleString()} CDF</strong></p>
              <p>Par km: <strong>{(zone.fee_per_km || 0).toLocaleString()} CDF</strong></p>
              <p>Rayon: <strong>{zone.radius_km || '—'} km</strong></p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setEditing(zone); setShowForm(true); }}
                className="flex-1 py-2 text-sm text-primary-600 bg-primary-50 rounded-xl font-medium flex items-center justify-center gap-1">
                <FiEdit2 size={14} /> Modifier
              </button>
              <button onClick={() => handleDelete(zone.id)}
                className="py-2 px-3 text-sm text-red-500 bg-red-50 rounded-xl"><FiTrash2 size={14} /></button>
            </div>
          </div>
        ))}
      </div>

      {showForm && <ZoneFormModal zone={editing} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); fetchZones(); }} />}
    </div>
  );
}

function ZoneFormModal({ zone, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: zone?.name || '', description: zone?.description || '',
    base_fee: zone?.base_fee || 2000, fee_per_km: zone?.fee_per_km || 500,
    radius_km: zone?.radius_km || 10, latitude: zone?.latitude || -2.5083,
    longitude: zone?.longitude || 28.8608, is_active: zone?.is_active ?? true,
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (zone) await api.put(`/admin/delivery-zones/${zone.id}`, form);
      else await api.post('/admin/delivery-zones', form);
      toast.success(zone ? 'Zone modifiée' : 'Zone créée');
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur');
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">{zone ? 'Modifier la zone' : 'Nouvelle zone'}</h2>
          <button onClick={onClose} className="text-gray-400 text-2xl">×</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nom de la zone"
            className="w-full border rounded-xl px-3 py-3 text-sm outline-none focus:border-primary-500" required />
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description"
            className="w-full border rounded-xl px-3 py-3 text-sm outline-none focus:border-primary-500 h-16 resize-none" />
          <div className="grid grid-cols-2 gap-3">
            <input type="number" value={form.base_fee} onChange={(e) => setForm({ ...form, base_fee: +e.target.value })} placeholder="Frais de base (CDF)"
              className="border rounded-xl px-3 py-3 text-sm outline-none focus:border-primary-500" />
            <input type="number" value={form.fee_per_km} onChange={(e) => setForm({ ...form, fee_per_km: +e.target.value })} placeholder="Frais/km (CDF)"
              className="border rounded-xl px-3 py-3 text-sm outline-none focus:border-primary-500" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <input type="number" step="0.0001" value={form.latitude} onChange={(e) => setForm({ ...form, latitude: +e.target.value })} placeholder="Latitude"
              className="border rounded-xl px-3 py-3 text-sm outline-none focus:border-primary-500" />
            <input type="number" step="0.0001" value={form.longitude} onChange={(e) => setForm({ ...form, longitude: +e.target.value })} placeholder="Longitude"
              className="border rounded-xl px-3 py-3 text-sm outline-none focus:border-primary-500" />
            <input type="number" value={form.radius_km} onChange={(e) => setForm({ ...form, radius_km: +e.target.value })} placeholder="Rayon (km)"
              className="border rounded-xl px-3 py-3 text-sm outline-none focus:border-primary-500" />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="rounded" />
            Zone active
          </label>
          <button type="submit" disabled={loading}
            className="w-full bg-primary-600 text-white font-semibold py-3 rounded-xl disabled:opacity-50 hover:bg-primary-700">
            {loading ? 'Enregistrement...' : (zone ? 'Modifier' : 'Créer')}
          </button>
        </form>
      </div>
    </div>
  );
}
