import './globals.css';
import ToastProvider from '../components/ToastProvider';

export const metadata = {
  title: 'Mbiyo Livreur',
  description: 'Application livreur Mbiyo - Gagnez de l\'argent en livrant',
  manifest: '/manifest.json',
  themeColor: '#3B82F6',
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" />
        <link href="https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.css" rel="stylesheet" />
      </head>
      <body className="bg-gray-50 text-gray-900 antialiased">
        <ToastProvider />
        <main className="min-h-screen max-w-lg mx-auto">{children}</main>
      </body>
    </html>
  );
}
