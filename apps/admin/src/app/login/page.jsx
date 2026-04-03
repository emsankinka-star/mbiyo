'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import useAuthStore from '../stores/authStore';
import toast from 'react-hot-toast';
import { FiLock, FiPhone, FiArrowRight } from 'react-icons/fi';

export default function AdminLogin() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(phone, password);
      toast.success('Bienvenue, administrateur !');
      router.replace('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Accès refusé');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-500 to-primary-800">
      <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">🚀 Mbiyo Admin</h1>
          <p className="text-sm text-gray-400 mt-1">Panneau d'administration</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-600 mb-1 block">Téléphone</label>
            <div className="flex items-center border border-gray-200 rounded-xl px-3 py-3 focus-within:border-primary-500">
              <FiPhone className="text-gray-400 mr-3" />
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+243..." className="flex-1 outline-none text-sm" required />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600 mb-1 block">Mot de passe</label>
            <div className="flex items-center border border-gray-200 rounded-xl px-3 py-3 focus-within:border-primary-500">
              <FiLock className="text-gray-400 mr-3" />
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="flex-1 outline-none text-sm" required />
            </div>
          </div>
          <button type="submit" disabled={loading}
            className="w-full bg-primary-600 text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-primary-700 transition-colors">
            {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><span>Connexion</span><FiArrowRight /></>}
          </button>
        </form>
      </div>
    </div>
  );
}
