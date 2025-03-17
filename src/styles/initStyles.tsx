import React, { useEffect } from 'react';
import './animations.css';
import './global-ui-enhancements.css';

/**
 * Composant pour initialiser les styles globaux
 * Ce composant ne rend rien visuellement mais s'assure que
 * tous les fichiers CSS nécessaires sont importés dans l'application
 */
export const StylesInitializer: React.FC = () => {
  useEffect(() => {
    // Détection du mode sombre au démarrage
    const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Écouteur pour les changements de préférence de thème
    const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleDarkModeChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };

    darkModeMediaQuery.addEventListener('change', handleDarkModeChange);

    // Nettoyage de l'écouteur lors du démontage du composant
    return () => {
      darkModeMediaQuery.removeEventListener('change', handleDarkModeChange);
    };
  }, []);

  return null;
};

export default StylesInitializer;
