'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import toast from 'react-hot-toast';
import { FiArrowLeft, FiUser, FiPhone, FiMail, FiLogOut, FiEdit2 } from 'react-icons/fi';

export default function ProfilePage() {
  const router = useRouter();
  const { user, token, loadUser, updateProfile, logout } = useAuthStore();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ full_name: '', phone: '', email: '' });

  useEffect(() => {
    if (!token) { router.replace('/auth/login'); return; }
    loadUser();
  }, []);

  useEffect(() => {
    if (user) setForm({ full_name: user.full_name || '', phone: user.phone || '', email: user.email || '' });
  }, [user]);

  const handleSave = async () => {
    try {
      await updateProfile(form);
      toast.success('Profil mis à jour');
      setEditing(false);
    } catch { toast.error('Erreur'); }
  };

  const handleLogout = () => {
    logout();
    router.replace('/auth/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-primary-500 text-white px-4 pt-12 pb-8 rounded-b-3xl">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => router.back()} className="p-1"><FiArrowLeft size={20} /></button>
          <h1 className="text-lg font-bold">Mon profil</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-2xl font-bold">
            {user?.full_name?.charAt(0) || '?'}
          </div>
          <div>
            <h2 className="text-xl font-bold">{user?.full_name || 'Utilisateur'}</h2>
            <p className="text-sm text-white/80">{user?.phone}</p>
          </div>
        </div>
      </header>

      <div className="px-4 mt-6 space-y-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Informations</h3>
            <button onClick={() => setEditing(!editing)} className="text-primary-500 text-sm flex items-center gap-1">
              <FiEdit2 size={14} /> {editing ? 'Annuler' : 'Modifier'}
            </button>
          </div>
          {editing ? (
            <div className="space-y-3">
              <div className="flex items-center border rounded-xl px-3 py-3">
                <FiUser className="text-gray-400 mr-3" />
                <input value={form.full_name} onChange={(e) => setForm({...form, full_name: e.target.value})} className="flex-1 outline-none text-sm" />
              </div>
              <div className="flex items-center border rounded-xl px-3 py-3">
                <FiPhone className="text-gray-400 mr-3" />
                <input value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})} className="flex-1 outline-none text-sm" />
              </div>
              <div className="flex items-center border rounded-xl px-3 py-3">
                <FiMail className="text-gray-400 mr-3" />
                <input value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} placeholder="Email (optionnel)" className="flex-1 outline-none text-sm" />
              </div>
              <button onClick={handleSave} className="w-full bg-primary-500 text-white py-3 rounded-xl font-semibold text-sm">
                Enregistrer
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <FiUser className="text-gray-400" /><span>{user?.full_name}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <FiPhone className="text-gray-400" /><span>{user?.phone}</span>
              </div>
              {user?.email && (
                <div className="flex items-center gap-3 text-sm">
                  <FiMail className="text-gray-400" /><span>{user?.email}</span>
                </div>
              )}
            </div>
          )}
        </div>

        <button onClick={handleLogout}
          className="w-full bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3 text-red-500 font-medium">
          <FiLogOut size={20} /> Se déconnecter
        </button>
      </div>
    </div>
  );
}
