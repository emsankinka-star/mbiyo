import './globals.css';
import { Toaster } from 'react-hot-toast';

export const metadata = {
  title: 'Mbiyo Fournisseur',
  description: 'Gérez votre commerce sur Mbiyo',
  themeColor: '#10B981',
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <head><meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" /></head>
      <body className="bg-gray-50 text-gray-900 antialiased">
        <Toaster position="top-center" toastOptions={{ duration: 3000, style: { borderRadius: '12px', padding: '12px 16px', fontSize: '14px' } }} />
        <div className="min-h-screen max-w-4xl mx-auto">{children}</div>
      </body>
    </html>
  );
}
