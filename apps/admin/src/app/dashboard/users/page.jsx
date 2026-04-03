'use client';
import { useEffect, useState } from 'react';
import api from '../../../lib/api';
import toast from 'react-hot-toast';
import { FiSearch, FiMoreVertical, FiUserCheck, FiUserX, FiChevronLeft, FiChevronRight } from 'react-icons/fi';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/users', { params: { search, role, page, limit: 20 } });
      setUsers(data.data.users || data.data || []);
      setTotal(data.data.total || 0);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchUsers(); }, [search, role, page]);

  const toggleStatus = async (userId) => {
    try {
      await api.put(`/admin/users/${userId}/toggle-status`);
      toast.success('Statut mis à jour');
      fetchUsers();
    } catch { toast.error('Erreur'); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Utilisateurs</h1>
          <p className="text-sm text-gray-400">{total} utilisateur(s) au total</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <div className="flex-1 flex items-center bg-white border rounded-xl px-3 py-2.5">
          <FiSearch className="text-gray-400 mr-2" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Rechercher par nom ou téléphone..." className="flex-1 outline-none text-sm" />
        </div>
        <select value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }}
          className="bg-white border rounded-xl px-3 py-2.5 text-sm outline-none">
          <option value="">Tous les rôles</option>
          <option value="client">Clients</option>
          <option value="driver">Livreurs</option>
          <option value="supplier">Fournisseurs</option>
          <option value="admin">Admins</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="text-left py-3 px-4 font-medium text-gray-500">Nom</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">Téléphone</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">Rôle</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">Statut</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">Inscription</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-xs font-bold text-primary-600">
                      {u.full_name?.charAt(0) || '?'}
                    </div>
                    <span className="font-medium">{u.full_name}</span>
                  </div>
                </td>
                <td className="py-3 px-4 text-gray-500">{u.phone}</td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    u.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                    u.role === 'driver' ? 'bg-blue-100 text-blue-700' :
                    u.role === 'supplier' ? 'bg-green-100 text-green-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>{u.role}</span>
                </td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-1 rounded-full text-xs ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {u.is_active ? 'Actif' : 'Inactif'}
                  </span>
                </td>
                <td className="py-3 px-4 text-gray-400">{new Date(u.created_at).toLocaleDateString('fr-FR')}</td>
                <td className="py-3 px-4">
                  <button onClick={() => toggleStatus(u.id)} className="p-2 hover:bg-gray-100 rounded-lg" title="Activer/Désactiver">
                    {u.is_active ? <FiUserX size={16} className="text-red-500" /> : <FiUserCheck size={16} className="text-green-500" />}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {/* Pagination */}
        <div className="flex items-center justify-between p-4 border-t">
          <span className="text-sm text-gray-400">Page {page}</span>
          <div className="flex gap-2">
            <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}
              className="p-2 rounded-lg border disabled:opacity-30"><FiChevronLeft size={16} /></button>
            <button onClick={() => setPage(page + 1)} disabled={users.length < 20}
              className="p-2 rounded-lg border disabled:opacity-30"><FiChevronRight size={16} /></button>
          </div>
        </div>
      </div>
    </div>
  );
}
