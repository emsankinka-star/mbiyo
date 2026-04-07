'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import useAuthStore from '../../../stores/authStore';
import toast from 'react-hot-toast';
import { FiPhone, FiLock, FiArrowRight } from 'react-icons/fi';

export default function DriverLogin() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePhoneChange = (e) => {
    const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 9);
    setPhone(val);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (phone.length !== 9) return toast.error('Le numéro doit contenir 9 chiffres');
    setLoading(true);
    try {
      await login('+243' + phone, password);
      toast.success('Connexion réussie !');
      router.replace('/');
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Erreur de connexion');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <div className="bg-gradient-to-br from-blue-500 to-blue-700 px-6 pt-16 pb-10 text-white text-center">
        <h1 className="text-3xl font-bold mb-1">Mbiyo Livreur</h1>
        <p className="text-blue-100">Connectez-vous pour commencer à livrer</p>
      </div>
      <form onSubmit={handleSubmit} className="flex-1 p-6 -mt-4 bg-white rounded-t-3xl space-y-5">
        <div>
          <label className="text-sm font-medium text-gray-600 mb-1 block">Téléphone</label>
          <div className="flex items-center border border-gray-200 rounded-xl px-3 py-3 focus-within:border-blue-500">
            <FiPhone className="text-gray-400 mr-3" />
            <span className="text-sm font-medium text-gray-700 mr-1">+243</span>
            <input type="tel" value={phone} onChange={handlePhoneChange} placeholder="9XX XXX XXX" className="flex-1 outline-none text-sm" required maxLength={9} inputMode="numeric" />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-600 mb-1 block">Mot de passe</label>
          <div className="flex items-center border border-gray-200 rounded-xl px-3 py-3 focus-within:border-blue-500">
            <FiLock className="text-gray-400 mr-3" />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="flex-1 outline-none text-sm" required />
          </div>
        </div>
        <button type="submit" disabled={loading}
          className="w-full bg-blue-600 text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50">
          {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><span>Se connecter</span><FiArrowRight /></>}
        </button>
        <button type="button" onClick={() => router.push('/auth/register')} className="w-full text-center text-sm text-blue-600 py-2">
          Devenir livreur Mbiyo →
        </button>
      </form>
    </div>
  );
}
