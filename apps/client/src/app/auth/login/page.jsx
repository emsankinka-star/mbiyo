'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { FiPhone, FiLock, FiArrowRight } from 'react-icons/fi';

export default function LoginPage() {
  const router = useRouter();
  const { login, loading } = useAuthStore();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(phone, password);
      toast.success('Connexion réussie!');
      router.push('/');
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="bg-primary-500 pt-16 pb-12 px-6 rounded-b-[40px]">
        <div className="max-w-sm mx-auto text-center text-white">
          <h1 className="text-4xl font-extrabold mb-2">Mbiyo</h1>
          <p className="text-white/80 text-sm">Tout livré, partout à Bukavu 🚀</p>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 px-6 pt-8 max-w-sm mx-auto w-full">
        <h2 className="text-2xl font-bold text-dark-800 mb-1">Connexion</h2>
        <p className="text-gray-500 text-sm mb-8">Entrez vos identifiants pour continuer</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-dark-700 mb-1 block">Téléphone</label>
            <div className="relative">
              <FiPhone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+243 9XX XXX XXX"
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-dark-700 mb-1 block">Mot de passe</label>
            <div className="relative">
              <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary-500 text-white py-3.5 rounded-xl font-semibold text-sm hover:bg-primary-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? 'Connexion...' : (
              <>Se connecter <FiArrowRight /></>
            )}
          </button>
        </form>

        <p className="text-center mt-6 text-sm text-gray-500">
          Pas encore de compte?{' '}
          <Link href="/auth/register" className="text-primary-500 font-semibold">
            S'inscrire
          </Link>
        </p>

        <div className="mt-8 pt-6 border-t border-gray-100">
          <p className="text-center text-xs text-gray-400 mb-3">Vous êtes un professionnel ?</p>
          <div className="flex gap-3">
            <a href="https://mbiyo-driver.vercel.app" target="_blank" rel="noopener noreferrer"
              className="flex-1 border border-primary-200 bg-primary-50 text-primary-600 py-2.5 rounded-xl text-sm font-semibold text-center">
              🏍️ Devenir livreur
            </a>
            <a href="https://mbiyo-supplier.vercel.app" target="_blank" rel="noopener noreferrer"
              className="flex-1 border border-primary-200 bg-primary-50 text-primary-600 py-2.5 rounded-xl text-sm font-semibold text-center">
              🏪 Devenir fournisseur
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
