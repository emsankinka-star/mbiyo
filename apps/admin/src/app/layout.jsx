import './globals.css';
import { Toaster } from 'react-hot-toast';

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
        <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
        {children}
      </body>
    </html>
  );
}
