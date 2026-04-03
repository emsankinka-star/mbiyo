'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import useAuthStore from '../../stores/authStore';
import toast from 'react-hot-toast';
import SupplierAddressModal from '../../components/SupplierAddressModal';
import {
  FiArrowLeft, FiUser, FiPhone, FiMapPin, FiClock, FiLogOut,
  FiEdit, FiStar, FiShoppingBag, FiNavigation, FiSave, FiX
} from 'react-icons/fi';

export default function ProfilePage() {
  const router = useRouter();
  const { user, supplier, loadUser, loadSupplierProfile, updateSupplierProfile, logout } = useAuthStore();

  const [showAddressModal, setShowAddressModal] = useState(false);
  const [editingInfo, setEditingInfo] = useState(false);
  const [editForm, setEditForm] = useState({ business_name: '', description: '', preparation_time: '' });

  useEffect(() => {
    loadUser();
    loadSupplierProfile();
  }, []);

  // Sync form when supplier data loads
  useEffect(() => {
    if (supplier) {
      setEditForm({
        business_name: supplier.business_name || '',
        description: supplier.description || '',
        preparation_time: supplier.preparation_time || '30',
      });
    }
  }, [supplier]);

  const handleLogout = () => {
    logout();
    toast.success('Déconnecté');
    router.replace('/auth/login');
  };

  const handleSaveInfo = async () => {
    try {
      await updateSupplierProfile({
        business_name: editForm.business_name,
        description: editForm.description,
        preparation_time: parseInt(editForm.preparation_time) || 30,
      });
      setEditingInfo(false);
      toast.success('Profil mis à jour');
    } catch {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const handleSaveAddress = async (addressData) => {
    try {
      await updateSupplierProfile(addressData);
      toast.success('Adresse mise à jour');
    } catch {
      toast.error('Erreur lors de la mise à jour');
      throw new Error('failed');
    }
  };

  const display = supplier || user;
  if (!user) return null;

  const addressDetails = supplier?.address_details;

  return (
    <div className="min-h-screen pb-24 bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-green-500 to-green-700 text-white p-6 pb-16">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.back()} className="p-1"><FiArrowLeft size={20} /></button>
          <h1 className="text-lg font-bold">Mon profil</h1>
        </div>
        <div className="text-center">
          <div className="w-20 h-20 bg-white/20 rounded-full mx-auto flex items-center justify-center text-3xl font-bold">
            {display?.business_name?.charAt(0) || user.full_name?.charAt(0) || 'F'}
          </div>
          <h2 className="text-xl font-bold mt-3">{display?.business_name || user.full_name}</h2>
          <div className="flex items-center justify-center gap-1 mt-1 text-green-200">
            <FiStar size={14} />
            <span className="text-sm">{display?.rating || '5.0'}</span>
          </div>
        </div>
      </div>

      <div className="p-4 -mt-8 space-y-3">
        {/* Informations card */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-800">Informations</h3>
            {!editingInfo ? (
              <button onClick={() => setEditingInfo(true)} className="text-green-600 text-xs font-medium flex items-center gap-1">
                <FiEdit size={12} /> Modifier
              </button>
            ) : (
              <div className="flex gap-2">
                <button onClick={() => setEditingInfo(false)} className="text-gray-400 text-xs flex items-center gap-1">
                  <FiX size={12} /> Annuler
                </button>
                <button onClick={handleSaveInfo} className="text-green-600 text-xs font-medium flex items-center gap-1">
                  <FiSave size={12} /> Sauver
                </button>
              </div>
            )}
          </div>

          {!editingInfo ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <FiShoppingBag className="text-gray-400 shrink-0" />
                <span className="text-gray-700 font-medium">{display?.business_name || '—'}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <FiUser className="text-gray-400 shrink-0" />
                <span className="text-gray-600">{user.full_name}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <FiPhone className="text-gray-400 shrink-0" />
                <span className="text-gray-600">{user.phone}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <FiClock className="text-gray-400 shrink-0" />
                <span className="text-gray-600">Préparation : {display?.preparation_time || 30} min</span>
              </div>
              {display?.description && (
                <p className="text-xs text-gray-400 mt-1 pl-8">{display.description}</p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Nom du commerce</label>
                <input
                  type="text" value={editForm.business_name}
                  onChange={(e) => setEditForm({ ...editForm, business_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Description</label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-300 resize-none"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Temps de préparation (min)</label>
                <input
                  type="number" value={editForm.preparation_time}
                  onChange={(e) => setEditForm({ ...editForm, preparation_time: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
                />
              </div>
            </div>
          )}
        </div>

        {/* Adresse card */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-800">Adresse du commerce</h3>
            <button onClick={() => setShowAddressModal(true)} className="text-green-600 text-xs font-medium flex items-center gap-1">
              <FiNavigation size={12} /> {supplier?.address ? 'Modifier' : 'Définir'}
            </button>
          </div>

          {supplier?.address ? (
            <div className="space-y-2">
              <div className="flex items-start gap-3">
                <FiMapPin className="text-green-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm text-gray-700 font-medium">{supplier.address}</p>
                  {addressDetails?.reference && (
                    <p className="text-xs text-gray-400 mt-0.5">Repère : {addressDetails.reference}</p>
                  )}
                </div>
              </div>
              {supplier.latitude && supplier.longitude && (
                <p className="text-xs text-gray-300 pl-8">
                  GPS : {parseFloat(supplier.latitude).toFixed(5)}, {parseFloat(supplier.longitude).toFixed(5)}
                </p>
              )}
            </div>
          ) : (
            <button onClick={() => setShowAddressModal(true)} className="w-full flex items-center gap-3 p-3 bg-orange-50 rounded-xl">
              <FiMapPin className="text-orange-500" />
              <div className="text-left">
                <p className="text-sm font-medium text-orange-700">Adresse non définie</p>
                <p className="text-xs text-orange-500">Ajoutez votre adresse pour que les livreurs vous trouvent</p>
              </div>
            </button>
          )}
        </div>

        {/* Horaires */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <button onClick={() => toast('Bientôt disponible')} className="w-full flex items-center gap-3 p-4 text-sm text-gray-700 hover:bg-gray-50">
            <FiClock className="text-gray-400" /><span>Horaires d'ouverture</span>
          </button>
        </div>

        {/* Logout */}
        <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 p-4 bg-white rounded-2xl shadow-sm text-red-500 font-medium text-sm">
          <FiLogOut /><span>Se déconnecter</span>
        </button>
      </div>

      {/* Address Modal */}
      <SupplierAddressModal
        isOpen={showAddressModal}
        onClose={() => setShowAddressModal(false)}
        initialData={supplier}
        onSave={handleSaveAddress}
      />
    </div>
  );
}
