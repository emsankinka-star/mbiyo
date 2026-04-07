'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { FiUser, FiPhone, FiMail, FiLock, FiArrowRight } from 'react-icons/fi';

export default function RegisterPage() {
  const router = useRouter();
  const { register, loading } = useAuthStore();
  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const handleChange = (e) => {
    if (e.target.name === 'phone') {
      const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 9);
      setForm({ ...form, phone: val });
      return;
    }
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }
    if (form.phone.length !== 9) {
      toast.error('Le numéro doit contenir 9 chiffres');
      return;
    }
    try {
      await register({
        full_name: form.full_name,
        phone: '+243' + form.phone,
        email: form.email || undefined,
        password: form.password,
      });
      toast.success('Inscription réussie! Bienvenue sur Mbiyo 🎉');
      router.push('/');
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="bg-primary-500 pt-12 pb-8 px-6 rounded-b-[40px]">
        <div className="max-w-sm mx-auto text-center text-white">
          <h1 className="text-3xl font-extrabold mb-1">Créer un compte</h1>
          <p className="text-white/80 text-sm">Rejoignez Mbiyo aujourd'hui</p>
        </div>
      </div>

      <div className="flex-1 px-6 pt-6 pb-8 max-w-sm mx-auto w-full">
        <form onSubmit={handleSubmit} className="space-y-3">
          <InputField icon={<FiUser />} name="full_name" placeholder="Nom complet" value={form.full_name} onChange={handleChange} required />
          <InputField icon={<FiPhone />} name="phone" type="tel" placeholder="9XX XXX XXX" value={form.phone} onChange={handleChange} required prefix="+243" maxLength={9} inputMode="numeric" />
          <InputField icon={<FiMail />} name="email" type="email" placeholder="Email (optionnel)" value={form.email} onChange={handleChange} />
          <InputField icon={<FiLock />} name="password" type="password" placeholder="Mot de passe (min 6 car.)" value={form.password} onChange={handleChange} required />
          <InputField icon={<FiLock />} name="confirmPassword" type="password" placeholder="Confirmer mot de passe" value={form.confirmPassword} onChange={handleChange} required />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary-500 text-white py-3.5 rounded-xl font-semibold text-sm hover:bg-primary-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
          >
            {loading ? 'Inscription...' : (<>S'inscrire <FiArrowRight /></>)}
          </button>
        </form>

        <p className="text-center mt-6 text-sm text-gray-500">
          Déjà un compte?{' '}
          <Link href="/auth/login" className="text-primary-500 font-semibold">Se connecter</Link>
        </p>
      </div>
    </div>
  );
}

function InputField({ icon, prefix, ...props }) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">{icon}</span>
      {prefix && <span className="absolute left-10 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-700">{prefix}</span>}
      <input
        {...props}
        className={`w-full ${prefix ? 'pl-[5.5rem]' : 'pl-10'} pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent`}
      />
    </div>
  );
}
