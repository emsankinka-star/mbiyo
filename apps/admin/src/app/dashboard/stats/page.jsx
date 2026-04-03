'use client';
import { useEffect, useState } from 'react';
import api from '../../../lib/api';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#7C3AED', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#EC4899'];

export default function StatsPage() {
  const [stats, setStats] = useState(null);
  const [period, setPeriod] = useState('week');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/stats', { params: { period } }).then(({ data }) => setStats(data.data)).catch(() => {}).finally(() => setLoading(false));
  }, [period]);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" /></div>;

  const ordersByStatus = [
    { name: 'En attente', value: stats?.pending_orders || 0 },
    { name: 'En cours', value: stats?.active_orders || 0 },
    { name: 'Livrées', value: stats?.delivered_orders || 0 },
    { name: 'Annulées', value: stats?.cancelled_orders || 0 },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Statistiques</h1>
          <p className="text-sm text-gray-400">Analyses et rapports détaillés</p>
        </div>
        <select value={period} onChange={(e) => setPeriod(e.target.value)}
          className="bg-white border rounded-xl px-3 py-2.5 text-sm outline-none">
          <option value="week">7 jours</option>
          <option value="month">30 jours</option>
          <option value="year">12 mois</option>
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Orders trend */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h3 className="font-semibold mb-4">Évolution des commandes</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={stats?.daily_orders || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#7C3AED" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue trend */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h3 className="font-semibold mb-4">Revenus (CDF)</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={stats?.daily_revenue || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="amount" fill="#7C3AED" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Orders by status */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h3 className="font-semibold mb-4">Répartition des commandes</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={ordersByStatus} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {ordersByStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Top suppliers */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h3 className="font-semibold mb-4">Top fournisseurs</h3>
          <div className="space-y-3">
            {(stats?.top_suppliers || []).slice(0, 5).map((s, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-xs font-bold">{i + 1}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium">{s.name}</p>
                  <p className="text-xs text-gray-400">{s.orders_count} commandes</p>
                </div>
                <span className="font-semibold text-sm">{(s.revenue || 0).toLocaleString()} CDF</span>
              </div>
            ))}
            {(!stats?.top_suppliers || stats.top_suppliers.length === 0) && (
              <p className="text-sm text-gray-400 text-center py-8">Aucune donnée disponible</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
