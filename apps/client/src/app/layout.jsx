import './globals.css';
import ToastProvider from '../components/ToastProvider';

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
        <ToastProvider />
        {children}
      </body>
    </html>
  );
}
