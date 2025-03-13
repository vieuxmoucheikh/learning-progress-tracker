import { useEffect } from 'react';

/**
 * Composant qui injecte des styles CSS critiques directement dans le DOM
 * Utilisé pour des corrections d'urgence quand les CSS normaux ne fonctionnent pas
 */
export function CriticalStylesFix() {
  useEffect(() => {
    // Créer l'élément style
    const styleEl = document.createElement('style');
    styleEl.id = 'critical-dashboard-icon-fixes';
    
    // Ajouter du CSS en ligne pour corriger les problèmes d'icônes
    styleEl.innerHTML = `
      /* Correctifs urgents pour les icônes en mode sombre */
      .dark .dashboard-container svg,
      .dark #dashboard-root svg,
      .dark [data-section="dashboard"] svg {
        fill: none !important;
        stroke-width: 2px !important;
        visibility: visible !important;
        opacity: 1 !important;
      }
      
      /* Icônes spécifiques */
      .dark .calendar-icon {
        color: #60a5fa !important;
        stroke: #60a5fa !important;
      }
      
      .dark .target-icon {
        color: #34d399 !important;
        stroke: #34d399 !important;
      }
      
      .dark .clock-icon {
        color: #60a5fa !important;
        stroke: #60a5fa !important;
      }
      
      .dark .tasks-icon {
        color: #34d399 !important;
        stroke: #34d399 !important;
      }
      
      .dark .book-icon {
        color: #a78bfa !important;
        stroke: #a78bfa !important;
      }
      
      .dark .trophy-icon {
        color: #fbbf24 !important;
        stroke: #fbbf24 !important;
      }
      
      /* Fond des icônes */
      .dark .bg-blue-100 {
        background-color: rgba(30, 58, 138, 0.8) !important;
      }
      
      .dark .bg-green-100 {
        background-color: rgba(6, 78, 59, 0.8) !important;
      }
      
      .dark .bg-purple-100 {
        background-color: rgba(76, 29, 149, 0.8) !important;
      }
      
      .dark .bg-amber-100 {
        background-color: rgba(120, 53, 15, 0.8) !important;
      }
    `;
    
    // Ajouter au DOM
    document.head.appendChild(styleEl);
    
    // Nettoyage au démontage
    return () => {
      const existingStyle = document.getElementById('critical-dashboard-icon-fixes');
      if (existingStyle) {
        existingStyle.remove();
      }
    };
  }, []);
  
  return null; // Ce composant ne rend rien visuellement
}
