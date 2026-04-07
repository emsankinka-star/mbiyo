'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import useAuthStore from '../../../stores/authStore';
import toast from 'react-hot-toast';
import { FiUser, FiPhone, FiLock, FiTruck, FiUpload, FiArrowRight } from 'react-icons/fi';

export default function DriverRegister() {
  const router = useRouter();
  const { register } = useAuthStore();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ full_name: '', phone: '', password: '', vehicle_type: 'moto', license_number: '' });
  const [files, setFiles] = useState({ id_document: null, license_document: null, vehicle_photo: null });
  const [loading, setLoading] = useState(false);

  const update = (k, v) => setForm({ ...form, [k]: v });

  const handlePhoneChange = (e) => {
    const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 9);
    update('phone', val);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (form.phone.length !== 9) { toast.error('Le numéro doit contenir 9 chiffres'); setLoading(false); return; }
      const fd = new FormData();
      Object.entries({ ...form, phone: '+243' + form.phone }).forEach(([k, v]) => fd.append(k, v));
      Object.entries(files).forEach(([k, v]) => { if (v) fd.append(k, v); });
      await register(fd);
      router.replace('/auth/login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors de l\'inscription');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <div className="bg-gradient-to-br from-blue-500 to-blue-700 px-6 pt-12 pb-8 text-white">
        <button onClick={() => step > 1 ? setStep(step - 1) : router.back()} className="text-sm mb-4 opacity-80">← Retour</button>
        <h1 className="text-2xl font-bold">Devenir livreur</h1>
        <p className="text-blue-100 text-sm mt-1">Étape {step}/2</p>
        <div className="flex gap-2 mt-3">
          <div className={`h-1 flex-1 rounded ${step >= 1 ? 'bg-white' : 'bg-white/30'}`} />
          <div className={`h-1 flex-1 rounded ${step >= 2 ? 'bg-white' : 'bg-white/30'}`} />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 p-6 -mt-3 bg-white rounded-t-3xl space-y-4">
        {step === 1 && (
          <>
            <div>
              <label className="text-sm font-medium text-gray-600 block mb-1">Nom complet</label>
              <div className="flex items-center border border-gray-200 rounded-xl px-3 py-3 focus-within:border-blue-500">
                <FiUser className="text-gray-400 mr-3" />
                <input value={form.full_name} onChange={(e) => update('full_name', e.target.value)} placeholder="Jean Mukeba" className="flex-1 outline-none text-sm" required />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600 block mb-1">Téléphone</label>
              <div className="flex items-center border border-gray-200 rounded-xl px-3 py-3 focus-within:border-blue-500">
                <FiPhone className="text-gray-400 mr-3" />
                <span className="text-sm font-medium text-gray-700 mr-1">+243</span>
                <input type="tel" value={form.phone} onChange={handlePhoneChange} placeholder="9XX XXX XXX" className="flex-1 outline-none text-sm" required maxLength={9} inputMode="numeric" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600 block mb-1">Mot de passe</label>
              <div className="flex items-center border border-gray-200 rounded-xl px-3 py-3 focus-within:border-blue-500">
                <FiLock className="text-gray-400 mr-3" />
                <input type="password" value={form.password} onChange={(e) => update('password', e.target.value)} placeholder="Min. 6 caractères" className="flex-1 outline-none text-sm" required />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600 block mb-1">Type de véhicule</label>
              <div className="grid grid-cols-3 gap-2">
                {['moto', 'velo', 'voiture'].map((t) => (
                  <button type="button" key={t} onClick={() => update('vehicle_type', t)}
                    className={`py-3 rounded-xl text-sm font-medium border-2 transition-colors capitalize ${form.vehicle_type === t ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-gray-200 text-gray-500'}`}>
                    {t === 'velo' ? 'Vélo' : t}
                  </button>
                ))}
              </div>
            </div>
            <button type="button" onClick={() => setStep(2)}
              className="w-full bg-blue-600 text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2">
              Continuer <FiArrowRight />
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <div>
              <label className="text-sm font-medium text-gray-600 block mb-1">N° permis / licence</label>
              <div className="flex items-center border border-gray-200 rounded-xl px-3 py-3 focus-within:border-blue-500">
                <FiTruck className="text-gray-400 mr-3" />
                <input value={form.license_number} onChange={(e) => update('license_number', e.target.value)} placeholder="Numéro de permis" className="flex-1 outline-none text-sm" />
              </div>
            </div>
            {['id_document', 'license_document', 'vehicle_photo'].map((field) => (
              <div key={field}>
                <label className="text-sm font-medium text-gray-600 block mb-1">
                  {field === 'id_document' ? 'Pièce d\'identité' : field === 'license_document' ? 'Permis de conduire' : 'Photo du véhicule'}
                </label>
                <label className="flex items-center gap-3 border-2 border-dashed border-gray-200 rounded-xl p-4 cursor-pointer hover:border-blue-400">
                  <FiUpload className="text-gray-400" />
                  <span className="text-sm text-gray-500">{files[field] ? files[field].name : 'Choisir un fichier'}</span>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => setFiles({ ...files, [field]: e.target.files[0] })} />
                </label>
              </div>
            ))}
            <button type="submit" disabled={loading}
              className="w-full bg-blue-600 text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50">
              {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Soumettre ma candidature'}
            </button>
          </>
        )}
      </form>
    </div>
  );
}
