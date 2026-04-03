import './globals.css';
import ToastProvider from '../components/ToastProvider';

export const metadata = {
  title: 'Mbiyo Admin',
  description: 'Dashboard administrateur Mbiyo',
  themeColor: '#7C3AED',
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <head><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
      <body className="bg-gray-50 text-gray-900 antialiased">
        <ToastProvider />
        {children}
      </body>
    </html>
  );
}
