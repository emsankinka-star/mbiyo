'use client';
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import useAuthStore from '../../stores/authStore';
import { FiHome, FiUsers, FiTruck, FiShoppingBag, FiPackage, FiMap, FiSettings, FiLogOut, FiHeadphones, FiBarChart2 } from 'react-icons/fi';

const NAV = [
  { icon: FiHome, label: 'Dashboard', path: '/dashboard' },
  { icon: FiUsers, label: 'Utilisateurs', path: '/dashboard/users' },
  { icon: FiTruck, label: 'Livreurs', path: '/dashboard/drivers' },
  { icon: FiShoppingBag, label: 'Fournisseurs', path: '/dashboard/suppliers' },
  { icon: FiPackage, label: 'Commandes', path: '/dashboard/orders' },
  { icon: FiMap, label: 'Zones', path: '/dashboard/zones' },
  { icon: FiHeadphones, label: 'Support', path: '/dashboard/support' },
  { icon: FiBarChart2, label: 'Statistiques', path: '/dashboard/stats' },
];

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, loading, loadUser, logout } = useAuthStore();

  useEffect(() => { loadUser(); }, []);
  useEffect(() => {
    if (!loading && !isAuthenticated) router.replace('/login');
  }, [loading, isAuthenticated]);

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full" /></div>;

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col fixed left-0 top-0 bottom-0">
        <div className="p-6 border-b">
          <h1 className="text-xl font-bold text-primary-600">🚀 Mbiyo Admin</h1>
          <p className="text-xs text-gray-400 mt-1">{user?.full_name}</p>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {NAV.map(({ icon: Icon, label, path }) => (
            <button key={path} onClick={() => router.push(path)}
              className={`sidebar-link w-full ${pathname === path ? 'active' : ''}`}>
              <Icon size={18} /><span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="p-3 border-t">
          <button onClick={() => { logout(); router.replace('/login'); }}
            className="sidebar-link w-full text-red-500 hover:bg-red-50">
            <FiLogOut size={18} /><span>Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 ml-64 p-6">{children}</main>
    </div>
  );
}
