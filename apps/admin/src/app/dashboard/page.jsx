'use client';
import { useEffect, useState } from 'react';
import api from '../../lib/api';
import { FiUsers, FiTruck, FiShoppingBag, FiPackage, FiDollarSign, FiTrendingUp, FiArrowUp, FiArrowDown } from 'react-icons/fi';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/stats').then(({ data }) => setStats(data.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" /></div>;

  const cards = [
    { label: 'Utilisateurs', value: stats?.total_users || 0, icon: FiUsers, color: 'blue', change: '+12%' },
    { label: 'Livreurs', value: stats?.total_drivers || 0, icon: FiTruck, color: 'green', change: '+5%' },
    { label: 'Fournisseurs', value: stats?.total_suppliers || 0, icon: FiShoppingBag, color: 'orange', change: '+8%' },
    { label: 'Commandes', value: stats?.total_orders || 0, icon: FiPackage, color: 'purple', change: '+23%' },
    { label: "Revenus (CDF)", value: (stats?.total_revenue || 0).toLocaleString(), icon: FiDollarSign, color: 'emerald', change: '+18%' },
    { label: 'Commissions', value: (stats?.total_commission || 0).toLocaleString(), icon: FiTrendingUp, color: 'pink', change: '+15%' },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-400">Vue d'ensemble de la plateforme Mbiyo</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        {cards.map(({ label, value, icon: Icon, color, change }) => (
          <div key={label} className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-xl bg-${color}-100 flex items-center justify-center`}>
                <Icon className={`text-${color}-600`} size={18} />
              </div>
              <span className="text-xs text-green-500 flex items-center gap-0.5"><FiArrowUp size={10} />{change}</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-xs text-gray-400 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h3 className="font-semibold mb-4">Commandes (7 jours)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={stats?.daily_orders || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Area type="monotone" dataKey="count" stroke="#7C3AED" fill="#EDE9FE" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h3 className="font-semibold mb-4">Revenus (7 jours)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={stats?.daily_revenue || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="amount" fill="#7C3AED" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent orders */}
      <div className="bg-white rounded-2xl p-5 shadow-sm mt-6">
        <h3 className="font-semibold mb-4">Commandes récentes</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-3 px-2 text-gray-400 font-medium">N° Commande</th>
                <th className="text-left py-3 px-2 text-gray-400 font-medium">Client</th>
                <th className="text-left py-3 px-2 text-gray-400 font-medium">Montant</th>
                <th className="text-left py-3 px-2 text-gray-400 font-medium">Statut</th>
                <th className="text-left py-3 px-2 text-gray-400 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {(stats?.recent_orders || []).map((order) => (
                <tr key={order.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-3 px-2 font-medium">#{order.order_number}</td>
                  <td className="py-3 px-2 text-gray-500">{order.client_name}</td>
                  <td className="py-3 px-2 font-medium">{(order.total_amount || 0).toLocaleString()} CDF</td>
                  <td className="py-3 px-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      order.status === 'delivered' ? 'bg-green-100 text-green-700' :
                      order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>{order.status}</span>
                  </td>
                  <td className="py-3 px-2 text-gray-400">{new Date(order.created_at).toLocaleDateString('fr-FR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
