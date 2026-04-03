import './globals.css';
import ToastProvider from '../components/ToastProvider';

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
        <ToastProvider />
        <div className="min-h-screen max-w-4xl mx-auto">{children}</div>
      </body>
    </html>
  );
}
