'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { useLocationStore } from '@/stores/locationStore';
import Link from 'next/link';
import { FiSearch, FiMapPin, FiShoppingCart, FiUser, FiHome, FiClock } from 'react-icons/fi';
import CategoryGrid from '@/components/home/CategoryGrid';
import NearbySuppliers from '@/components/home/NearbySuppliers';
import PromoBar from '@/components/home/PromoBar';

export default function HomePage() {
  const router = useRouter();
  const { user, token, loadUser } = useAuthStore();
  const { address, detectLocation } = useLocationStore();
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (token) loadUser();
    detectLocation();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="bg-primary-500 text-white px-4 pt-12 pb-6 rounded-b-3xl">
        <div className="max-w-lg mx-auto">
          {/* Location */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => router.push('/location')}
              className="flex items-center gap-2 text-sm"
            >
              <FiMapPin className="text-white/80" />
              <div>
                <p className="text-xs text-white/70">Livrer à</p>
                <p className="font-semibold text-sm truncate max-w-[200px]">
                  {address || 'Bukavu, RDC'}
                </p>
              </div>
            </button>
            <Link href={token ? '/profile' : '/auth/login'} className="p-2 bg-white/20 rounded-full">
              <FiUser size={20} />
            </Link>
          </div>

          {/* Welcome */}
          <h1 className="text-2xl font-bold mb-1">
            {user ? `Bonjour, ${user.full_name.split(' ')[0]}! 👋` : 'Bienvenue sur Mbiyo! 🚀'}
          </h1>
          <p className="text-white/80 text-sm mb-4">
            Tout ce dont vous avez besoin, livré chez vous.
          </p>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher produits, restaurants..."
              className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white text-dark-800 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-300 shadow-lg"
            />
          </form>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-lg mx-auto px-4 -mt-2">
        {/* Promo */}
        <PromoBar />

        {/* Catégories */}
        <section className="mt-6">
          <h2 className="text-lg font-bold text-dark-800 mb-3">Catégories</h2>
          <CategoryGrid />
        </section>

        {/* Fournisseurs à proximité */}
        <section className="mt-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-dark-800">Près de chez vous</h2>
            <Link href="/suppliers" className="text-primary-500 text-sm font-medium">
              Voir tout
            </Link>
          </div>
          <NearbySuppliers />
        </section>
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 safe-bottom z-50">
        <div className="max-w-lg mx-auto flex items-center justify-around py-2">
          <NavItem href="/" icon={<FiHome size={22} />} label="Accueil" active />
          <NavItem href="/search" icon={<FiSearch size={22} />} label="Recherche" />
          <NavItem href="/orders" icon={<FiClock size={22} />} label="Commandes" />
          <NavItem href="/cart" icon={<FiShoppingCart size={22} />} label="Panier" badge />
          <NavItem href="/profile" icon={<FiUser size={22} />} label="Profil" />
        </div>
      </nav>
    </div>
  );
}

function NavItem({ href, icon, label, active, badge }) {
  return (
    <Link href={href} className={`flex flex-col items-center gap-0.5 px-3 py-1 ${active ? 'text-primary-500' : 'text-gray-400'}`}>
      <div className="relative">
        {icon}
        {badge && (
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary-500 rounded-full" />
        )}
      </div>
      <span className="text-[10px] font-medium">{label}</span>
    </Link>
  );
}
