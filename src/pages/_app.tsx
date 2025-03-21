import '@/styles/globals.css';
import '@/styles/card-fixes.css';
import '@/styles/editor-fixes.css'; // Importer les nouveaux styles d'éditeur
import '@/styles/icon-fixes.css'; // Ajout du nouveau fichier CSS pour les icônes

import type { AppProps } from 'next/app';
import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/toaster';
import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();

  // Ajout de la classe mobile pour les styles spécifiques
  useEffect(() => {
    if (window.innerWidth <= 640) {
      document.documentElement.classList.add('is-mobile');
    } else {
      document.documentElement.classList.remove('is-mobile');
    }

    const handleResize = () => {
      if (window.innerWidth <= 640) {
        document.documentElement.classList.add('is-mobile');
      } else {
        document.documentElement.classList.remove('is-mobile');
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <ThemeProvider attribute="data-theme" defaultTheme="system" enableSystem>
      <Component {...pageProps} />
      <Toaster />
    </ThemeProvider>
  );
}
