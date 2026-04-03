'use client';
import { useEffect, useState } from 'react';
import api from '../../../lib/api';
import { FiSearch, FiChevronLeft, FiChevronRight, FiEye } from 'react-icons/fi';

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-700',
  accepted: 'bg-blue-100 text-blue-700',
  preparing: 'bg-orange-100 text-orange-700',
  ready: 'bg-cyan-100 text-cyan-700',
  picked_up: 'bg-indigo-100 text-indigo-700',
  delivering: 'bg-purple-100 text-purple-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/orders', { params: { search, status, page, limit: 20 } });
      setOrders(data.data.orders || data.data || []);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchOrders(); }, [search, status, page]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Commandes</h1>
        <p className="text-sm text-gray-400">Suivi de toutes les commandes</p>
      </div>

      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="flex-1 min-w-[200px] flex items-center bg-white border rounded-xl px-3 py-2.5">
          <FiSearch className="text-gray-400 mr-2" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="N° commande..." className="flex-1 outline-none text-sm" />
        </div>
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="bg-white border rounded-xl px-3 py-2.5 text-sm outline-none">
          <option value="">Tous les statuts</option>
          {Object.keys(STATUS_COLORS).map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="text-left py-3 px-4 font-medium text-gray-500">N°</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">Client</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">Fournisseur</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">Montant</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">Statut</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">Date</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="py-3 px-4 font-medium">#{order.order_number}</td>
                <td className="py-3 px-4 text-gray-500">{order.client_name || '—'}</td>
                <td className="py-3 px-4 text-gray-500">{order.supplier_name || '—'}</td>
                <td className="py-3 px-4 font-medium">{(order.total_amount || 0).toLocaleString()} CDF</td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[order.status] || 'bg-gray-100'}`}>
                    {order.status}
                  </span>
                </td>
                <td className="py-3 px-4 text-gray-400">{new Date(order.created_at).toLocaleDateString('fr-FR')}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex items-center justify-between p-4 border-t">
          <span className="text-sm text-gray-400">Page {page}</span>
          <div className="flex gap-2">
            <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}
              className="p-2 rounded-lg border disabled:opacity-30"><FiChevronLeft size={16} /></button>
            <button onClick={() => setPage(page + 1)} disabled={orders.length < 20}
              className="p-2 rounded-lg border disabled:opacity-30"><FiChevronRight size={16} /></button>
          </div>
        </div>
      </div>
    </div>
  );
}
