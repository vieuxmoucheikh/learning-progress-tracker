/**
 * COMPOSANT CORRECTEUR DE MODE SOMBRE
 * Ce composant s'initialise une seule fois et applique les correctifs
 * essentiels pour le mode sombre dès que possible.
 */

import { useEffect } from 'react';
// @ts-ignore - Ignorer l'erreur de type pour ce module
import { applyEmergencyDarkModeFixes } from '../lib/theme-force-fix';

export function InitDarkModeFix() {
  useEffect(() => {
    // Fonction pour appliquer les correctifs
    const applyCriticalFixes = () => {
      const theme = document.documentElement.getAttribute('data-theme');
      if (theme === 'dark') {
        // Appliquer immédiatement
        if (typeof applyEmergencyDarkModeFixes === 'function') {
          applyEmergencyDarkModeFixes();
        
          // Appliquer à nouveau après un court délai pour les éléments asynchrones
          setTimeout(applyEmergencyDarkModeFixes, 100);
        
          // Et encore une fois après un délai plus long pour les éléments chargés tardivement
          setTimeout(applyEmergencyDarkModeFixes, 500);
        }
      }
    };

    // Appliquer immédiatement
    applyCriticalFixes();

    // Observer les changements de thème
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'data-theme') {
          applyCriticalFixes();
        }
      });
    });

    // Démarrer l'observation
    observer.observe(document.documentElement, { attributes: true });

    // En supplément, exécuter périodiquement pour détecter tout problème
    const intervalId = setInterval(applyCriticalFixes, 2000);

    // Nettoyer
    return () => {
      observer.disconnect();
      clearInterval(intervalId);
    };
  }, []);

  // Ce composant ne rend rien visuellement
  return null;
}

export default InitDarkModeFix;
