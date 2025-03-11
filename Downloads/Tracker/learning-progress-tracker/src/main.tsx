import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// CORRECTION D'URGENCE POUR LES ICÔNES SVG DU DASHBOARD
// Cette fonction sera exécutée immédiatement avant même que React ne commence à rendre
(function() {
  // Créer un élément style avec la plus haute priorité possible
  const emergencyStyle = document.createElement('style');
  emergencyStyle.setAttribute('id', 'emergency-svg-dark-mode-fixes');
  emergencyStyle.innerHTML = `
    /* Force les icônes SVG à avoir un affichage correct */
    .dark svg {
      fill: none !important;
      stroke-width: 2px !important;
    }
    
    /* Couleurs spécifiques par type d'icône */
    .dark svg.lucide-calendar,
    .dark svg.lucide-clock,
    .dark .from-blue-50 svg,
    .dark .bg-blue-100 svg {
      color: #60a5fa !important;
      stroke: #60a5fa !important;
    }
    
    .dark svg.lucide-target,
    .dark svg.lucide-check-circle,
    .dark svg.lucide-check-circle-2,
    .dark .from-green-50 svg,
    .dark .bg-green-100 svg {
      color: #34d399 !important;
      stroke: #34d399 !important;
    }
    
    .dark svg.lucide-book-open,
    .dark .from-purple-50 svg,
    .dark .bg-purple-100 svg {
      color: #a78bfa !important;
      stroke: #a78bfa !important;
    }
    
    .dark svg.lucide-trophy,
    .dark .from-amber-50 svg,
    .dark .bg-amber-100 svg {
      color: #fbbf24 !important;
      stroke: #fbbf24 !important;
    }
    
    /* Fonds colorés */
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
  
  // Ajouter le style au document
  document.head.appendChild(emergencyStyle);
  
  // Fonction pour corriger les SVG
  function fixSVGs() {
    if (document.documentElement.classList.contains('dark')) {
      // Cibler tous les SVG dans le dashboard
      document.querySelectorAll('[class*="dashboard"] svg, [id*="dashboard"] svg, [data-section="dashboard"] svg').forEach(svg => {
        svg.style.fill = 'none';
        svg.style.strokeWidth = '2px';
        
        // Tous les éléments à l'intérieur du SVG
        svg.querySelectorAll('*').forEach(el => {
          el.style.fill = 'none';
        });
      });
    }
  }
  
  // Exécuter la correction toutes les 200ms
  setInterval(fixSVGs, 200);
  
  // Créer un observateur de mutations pour surveiller les changements du DOM
  const observer = new MutationObserver(mutations => {
    fixSVGs();
  });
  
  // Observer le document dès qu'il est prêt
  document.addEventListener('DOMContentLoaded', () => {
    observer.observe(document.body, { 
      childList: true, 
      subtree: true 
    });
  });
})();

// Rendre l'application React
ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
