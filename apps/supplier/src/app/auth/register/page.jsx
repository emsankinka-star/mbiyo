'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import useAuthStore from '../../../stores/authStore';
import toast from 'react-hot-toast';
import { FiUser, FiPhone, FiLock, FiMapPin, FiShoppingBag, FiArrowRight, FiMail, FiFileText, FiCamera, FiAlignLeft } from 'react-icons/fi';

const BUSINESS_TYPES = [
  { value: 'restaurant', label: 'Restaurant', icon: '🍽️' },
  { value: 'supermarket', label: 'Supermarché', icon: '🛒' },
  { value: 'pharmacy', label: 'Pharmacie', icon: '💊' },
  { value: 'fuel', label: 'Station', icon: '⛽' },
  { value: 'shop', label: 'Boutique', icon: '🏪' },
  { value: 'bakery', label: 'Boulangerie', icon: '🥖' },
  { value: 'butcher', label: 'Boucherie', icon: '🥩' },
  { value: 'bar', label: 'Bar', icon: '🍺' },
  { value: 'cafe', label: 'Café', icon: '☕' },
  { value: 'hotel', label: 'Hôtel', icon: '🏨' },
  { value: 'laundry', label: 'Pressing', icon: '👔' },
  { value: 'beauty_salon', label: 'Salon de beauté', icon: '💇' },
  { value: 'gym', label: 'Salle de sport', icon: '🏋️' },
  { value: 'electronics', label: 'Électronique', icon: '📱' },
  { value: 'clothing', label: 'Prêt-à-porter', icon: '👗' },
  { value: 'bookstore', label: 'Librairie', icon: '📚' },
  { value: 'hardware', label: 'Quincaillerie', icon: '🔧' },
  { value: 'florist', label: 'Fleuriste', icon: '💐' },
  { value: 'other', label: 'Autre', icon: '📦' },
];

export default function SupplierRegister() {
  const router = useRouter();
  const { register } = useAuthStore();
  const [form, setForm] = useState({
    owner_name: '', business_name: '', phone: '', password: '',
    business_type: 'restaurant', address: '', description: '',
    rccm: '', email: '',
  });
  const [logo, setLogo] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [loading, setLoading] = useState(false);

  const update = (k, v) => setForm({ ...form, [k]: v });

  const handlePhoneChange = (e) => {
    const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 9);
    update('phone', val);
  };

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogo(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (form.phone.length !== 9) { toast.error('Le numéro doit contenir 9 chiffres'); setLoading(false); return; }
      const fd = new FormData();
      Object.entries({ ...form, phone: '+243' + form.phone }).forEach(([k, v]) => fd.append(k, v));
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
        {/* Logo */}
        <div className="flex flex-col items-center">
          <label className="text-sm font-medium text-gray-600 block mb-2">Logo du commerce (optionnel)</label>
          <label className="cursor-pointer">
            <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden hover:border-green-500 transition-colors">
              {logoPreview ? (
                <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <div className="text-center">
                  <FiCamera className="text-gray-400 mx-auto text-xl" />
                  <span className="text-xs text-gray-400 mt-1">Photo</span>
                </div>
              )}
            </div>
            <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
          </label>
        </div>

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
            <span className="text-sm font-medium text-gray-700 mr-1">+243</span>
            <input type="tel" value={form.phone} onChange={handlePhoneChange} placeholder="9XX XXX XXX" className="flex-1 outline-none text-sm" required maxLength={9} inputMode="numeric" />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-600 block mb-1">Adresse email (optionnel)</label>
          <div className="flex items-center border border-gray-200 rounded-xl px-3 py-3 focus-within:border-green-500">
            <FiMail className="text-gray-400 mr-3" />
            <input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} placeholder="contact@moncommerce.com" className="flex-1 outline-none text-sm" />
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
          <label className="text-sm font-medium text-gray-600 block mb-1">Numéro RCCM (optionnel)</label>
          <div className="flex items-center border border-gray-200 rounded-xl px-3 py-3 focus-within:border-green-500">
            <FiFileText className="text-gray-400 mr-3" />
            <input value={form.rccm} onChange={(e) => update('rccm', e.target.value)} placeholder="CD/BKV/RCCM/..." className="flex-1 outline-none text-sm" />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-600 block mb-1">Type de commerce</label>
          <div className="grid grid-cols-3 gap-2">
            {BUSINESS_TYPES.map((t) => (
              <button type="button" key={t.value} onClick={() => update('business_type', t.value)}
                className={`py-2 px-1 rounded-xl text-xs font-medium border-2 transition-colors flex flex-col items-center gap-0.5 ${form.business_type === t.value ? 'border-green-500 bg-green-50 text-green-600' : 'border-gray-200 text-gray-500'}`}>
                <span className="text-base">{t.icon}</span>
                <span>{t.label}</span>
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
