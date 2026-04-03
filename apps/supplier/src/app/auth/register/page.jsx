'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import useAuthStore from '../../../stores/authStore';
import toast from 'react-hot-toast';
import { FiUser, FiPhone, FiLock, FiMapPin, FiShoppingBag, FiArrowRight } from 'react-icons/fi';

const BUSINESS_TYPES = [
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'supermarche', label: 'Supermarché' },
  { value: 'pharmacie', label: 'Pharmacie' },
  { value: 'boulangerie', label: 'Boulangerie' },
  { value: 'boutique', label: 'Boutique' },
  { value: 'autre', label: 'Autre' },
];

export default function SupplierRegister() {
  const router = useRouter();
  const { register } = useAuthStore();
  const [form, setForm] = useState({
    owner_name: '', business_name: '', phone: '', password: '',
    business_type: 'restaurant', address: '', description: '',
  });
  const [logo, setLogo] = useState(null);
  const [loading, setLoading] = useState(false);

  const update = (k, v) => setForm({ ...form, [k]: v });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (logo) fd.append('logo', logo);
      await register(fd);
      toast.success('Inscription envoyée ! En attente de validation.');
      router.replace('/auth/login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <div className="bg-gradient-to-br from-green-500 to-green-700 px-6 pt-12 pb-8 text-white">
        <button onClick={() => router.back()} className="text-sm mb-4 opacity-80">← Retour</button>
        <h1 className="text-2xl font-bold">Inscrire mon commerce</h1>
        <p className="text-green-100 text-sm mt-1">Rejoignez la plateforme Mbiyo</p>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 p-6 -mt-3 bg-white rounded-t-3xl space-y-4">
        <div>
          <label className="text-sm font-medium text-gray-600 block mb-1">Nom du propriétaire</label>
          <div className="flex items-center border border-gray-200 rounded-xl px-3 py-3 focus-within:border-green-500">
            <FiUser className="text-gray-400 mr-3" />
            <input value={form.owner_name} onChange={(e) => update('owner_name', e.target.value)} placeholder="Jean Mukeba" className="flex-1 outline-none text-sm" required />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-600 block mb-1">Nom du commerce</label>
          <div className="flex items-center border border-gray-200 rounded-xl px-3 py-3 focus-within:border-green-500">
            <FiShoppingBag className="text-gray-400 mr-3" />
            <input value={form.business_name} onChange={(e) => update('business_name', e.target.value)} placeholder="Restaurant Chez Mama" className="flex-1 outline-none text-sm" required />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-600 block mb-1">Téléphone</label>
          <div className="flex items-center border border-gray-200 rounded-xl px-3 py-3 focus-within:border-green-500">
            <FiPhone className="text-gray-400 mr-3" />
            <input type="tel" value={form.phone} onChange={(e) => update('phone', e.target.value)} placeholder="+243..." className="flex-1 outline-none text-sm" required />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-600 block mb-1">Mot de passe</label>
          <div className="flex items-center border border-gray-200 rounded-xl px-3 py-3 focus-within:border-green-500">
            <FiLock className="text-gray-400 mr-3" />
            <input type="password" value={form.password} onChange={(e) => update('password', e.target.value)} placeholder="Min. 6 caractères" className="flex-1 outline-none text-sm" required />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-600 block mb-1">Type de commerce</label>
          <div className="grid grid-cols-3 gap-2">
            {BUSINESS_TYPES.map((t) => (
              <button type="button" key={t.value} onClick={() => update('business_type', t.value)}
                className={`py-2.5 rounded-xl text-xs font-medium border-2 transition-colors ${form.business_type === t.value ? 'border-green-500 bg-green-50 text-green-600' : 'border-gray-200 text-gray-500'}`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-600 block mb-1">Adresse</label>
          <div className="flex items-center border border-gray-200 rounded-xl px-3 py-3 focus-within:border-green-500">
            <FiMapPin className="text-gray-400 mr-3" />
            <input value={form.address} onChange={(e) => update('address', e.target.value)} placeholder="Quartier, Avenue..." className="flex-1 outline-none text-sm" required />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-600 block mb-1">Description (optionnel)</label>
          <textarea value={form.description} onChange={(e) => update('description', e.target.value)} placeholder="Décrivez votre commerce..."
            className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm outline-none focus:border-green-500 resize-none h-20" />
        </div>
        <button type="submit" disabled={loading}
          className="w-full bg-green-600 text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50">
          {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><span>Soumettre</span><FiArrowRight /></>}
        </button>
      </form>
    </div>
  );
}
