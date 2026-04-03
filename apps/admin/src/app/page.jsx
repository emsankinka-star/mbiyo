'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import useAuthStore from '../stores/authStore';

export default function AdminHome() {
  const router = useRouter();
  const { isAuthenticated, loading, loadUser } = useAuthStore();

  useEffect(() => { loadUser(); }, []);
  useEffect(() => {
    if (!loading) router.replace(isAuthenticated ? '/dashboard' : '/login');
  }, [loading, isAuthenticated]);

  return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full" /></div>;
}
