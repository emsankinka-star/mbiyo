import './globals.css';
import { Toaster } from 'react-hot-toast';

export const metadata = {
  title: 'Mbiyo - Livraison rapide à Bukavu',
  description: 'Commandez nourriture, médicaments, carburant et plus. Livraison rapide à Bukavu, RDC.',
  manifest: '/manifest.json',
  themeColor: '#F97316',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body className="bg-gray-50 min-h-screen">
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 3000,
            style: { borderRadius: '12px', padding: '12px 16px', fontSize: '14px' },
          }}
        />
        {children}
      </body>
    </html>
  );
}
