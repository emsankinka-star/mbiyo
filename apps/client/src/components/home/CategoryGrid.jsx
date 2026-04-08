'use client';

import Link from 'next/link';
import { FiShoppingBag, FiCoffee } from 'react-icons/fi';

const categories = [
  { name: 'Restaurants', slug: 'restaurants', icon: '🍽️', color: 'bg-orange-100' },
  { name: 'Supermarchés', slug: 'supermarches', icon: '🛒', color: 'bg-green-100' },
  { name: 'Pharmacies', slug: 'pharmacies', icon: '💊', color: 'bg-blue-100' },
  { name: 'Stations', slug: 'carburant', icon: '⛽', color: 'bg-yellow-100' },
  { name: 'Boutiques', slug: 'boutiques', icon: '🏪', color: 'bg-purple-100' },
  { name: 'Boucheries', slug: 'boucheries', icon: '🥩', color: 'bg-red-100' },
  { name: 'Boulangeries', slug: 'boulangeries', icon: '🍞', color: 'bg-amber-100' },
  { name: 'Tout voir', slug: 'tous', icon: '📦', color: 'bg-gray-100' },
];

export default function CategoryGrid() {
  return (
    <div className="grid grid-cols-4 gap-3">
      {categories.map((cat) => (
        <Link
          key={cat.slug}
          href={`/category/${cat.slug}`}
          className="flex flex-col items-center gap-1.5"
        >
          <div className={`w-14 h-14 rounded-2xl ${cat.color} flex items-center justify-center text-2xl shadow-sm`}>
            {cat.icon}
          </div>
          <span className="text-[11px] font-medium text-dark-700 text-center leading-tight">
            {cat.name}
          </span>
        </Link>
      ))}
    </div>
  );
}
