'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import useAuthStore from '../../stores/authStore';
import toast from 'react-hot-toast';
import { FiArrowLeft, FiUser, FiPhone, FiMapPin, FiClock, FiLogOut, FiEdit, FiStar, FiShoppingBag } from 'react-icons/fi';

export default function ProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, loadUser, logout } = useAuthStore();

  useEffect(() => { loadUser(); }, []);

  const handleLogout = () => {
    logout();
    toast.success('Déconnecté');
    router.replace('/auth/login');
  };

  if (!user) return null;

  return (
    <div className="min-h-screen pb-24">
      <div className="bg-gradient-to-br from-green-500 to-green-700 text-white p-6 pb-16">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.back()} className="p-1"><FiArrowLeft size={20} /></button>
          <h1 className="text-lg font-bold">Mon profil</h1>
        </div>
        <div className="text-center">
          <div className="w-20 h-20 bg-white/20 rounded-full mx-auto flex items-center justify-center text-3xl font-bold">
            {user.business_name?.charAt(0) || user.full_name?.charAt(0) || 'F'}
          </div>
          <h2 className="text-xl font-bold mt-3">{user.business_name || user.full_name}</h2>
          <div className="flex items-center justify-center gap-1 mt-1 text-green-200">
            <FiStar size={14} />
            <span className="text-sm">{user.rating || '5.0'}</span>
          </div>
        </div>
      </div>

      <div className="p-4 -mt-8 space-y-3">
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
          <div className="flex items-center gap-3 text-sm">
            <FiUser className="text-gray-400" /><span className="text-gray-600">{user.full_name}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <FiPhone className="text-gray-400" /><span className="text-gray-600">{user.phone}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <FiShoppingBag className="text-gray-400" /><span className="text-gray-600 capitalize">{user.business_type || '—'}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <FiMapPin className="text-gray-400" /><span className="text-gray-600">{user.address || '—'}</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <button onClick={() => toast('Bientôt disponible')} className="w-full flex items-center gap-3 p-4 text-sm text-gray-700 hover:bg-gray-50 border-b">
            <FiEdit className="text-gray-400" /><span>Modifier le profil</span>
          </button>
          <button onClick={() => toast('Bientôt disponible')} className="w-full flex items-center gap-3 p-4 text-sm text-gray-700 hover:bg-gray-50">
            <FiClock className="text-gray-400" /><span>Horaires d'ouverture</span>
          </button>
        </div>

        <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 p-4 bg-white rounded-2xl shadow-sm text-red-500 font-medium text-sm">
          <FiLogOut /><span>Se déconnecter</span>
        </button>
      </div>
    </div>
  );
}
