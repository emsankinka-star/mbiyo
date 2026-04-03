'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import useAuthStore from '../../stores/authStore';
import toast from 'react-hot-toast';
import { FiArrowLeft, FiUser, FiPhone, FiMail, FiTruck, FiStar, FiLogOut, FiEdit } from 'react-icons/fi';

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
      <div className="bg-gradient-to-br from-blue-500 to-blue-700 text-white p-6 pb-16">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.back()} className="p-1"><FiArrowLeft size={20} /></button>
          <h1 className="text-lg font-bold">Mon profil</h1>
        </div>
        <div className="text-center">
          <div className="w-20 h-20 bg-white/20 rounded-full mx-auto flex items-center justify-center text-3xl font-bold">
            {user.full_name?.charAt(0) || 'L'}
          </div>
          <h2 className="text-xl font-bold mt-3">{user.full_name}</h2>
          <div className="flex items-center justify-center gap-1 mt-1 text-blue-200">
            <FiStar size={14} />
            <span className="text-sm">{user.rating || '5.0'} · {user.total_deliveries || 0} livraisons</span>
          </div>
        </div>
      </div>

      <div className="p-4 -mt-8 space-y-3">
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
          <div className="flex items-center gap-3 text-sm">
            <FiPhone className="text-gray-400" /><span className="text-gray-600">{user.phone}</span>
          </div>
          {user.email && (
            <div className="flex items-center gap-3 text-sm">
              <FiMail className="text-gray-400" /><span className="text-gray-600">{user.email}</span>
            </div>
          )}
          <div className="flex items-center gap-3 text-sm">
            <FiTruck className="text-gray-400" /><span className="text-gray-600 capitalize">{user.vehicle_type || 'Moto'}</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {[
            { label: 'Modifier le profil', icon: FiEdit, action: () => toast('Bientôt disponible') },
          ].map(({ label, icon: Icon, action }) => (
            <button key={label} onClick={action} className="w-full flex items-center gap-3 p-4 text-sm text-gray-700 hover:bg-gray-50">
              <Icon className="text-gray-400" /><span>{label}</span>
            </button>
          ))}
        </div>

        <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 p-4 bg-white rounded-2xl shadow-sm text-red-500 font-medium text-sm">
          <FiLogOut /><span>Se déconnecter</span>
        </button>
      </div>
    </div>
  );
}
