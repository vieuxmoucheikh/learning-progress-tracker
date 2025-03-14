/**
 * Script pour corriger les problèmes de mode clair sur mobile
 */
(function() {
  function fixLightMode() {
    // Détecter si on est en mode clair
    const isLightMode = document.documentElement.getAttribute('data-theme') === 'light';
    const isMobile = window.innerWidth <= 768;
    
    if (isLightMode && isMobile) {
      // Forcer le fond en clair
      document.body.style.backgroundColor = '#f8fafc'; // slate-50
      document.documentElement.style.backgroundColor = '#f8fafc';
      
      // Assurer que les cartes ont un fond blanc - VERSION RENFORCÉE
      // Sélecteurs très larges pour attraper toutes les cartes possibles
      const cardSelectors = [
        '.card', 
        '[class*="Card"]', 
        '[class*="-card"]',
        '[class*="card"]',
        '.mastered-card',
        '.rounded-xl',
        '.border-l-4',
        '.dark\\:bg-gray-800',
        '[class*="learning-item-card"]',
        '[class*="mastered"]',
        '.bg-card',
        '[class*="border-blue-"]',
        '[class*="border-emerald-"]'
      ];
      
      // Sélectionner toutes les cartes
      const cards = document.querySelectorAll(cardSelectors.join(','));
      
      console.log('Applying light mode fixes to', cards.length, 'cards');
      
      // Appliquer les styles à chaque carte
      cards.forEach(card => {
        card.style.backgroundColor = '#ffffff';
        card.style.background = '#ffffff';
        card.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.05)';
        
        // Traiter également les enfants directs qui peuvent avoir des backgrounds
        const children = card.children;
        for (let i = 0; i < children.length; i++) {
          children[i].style.backgroundColor = '#ffffff';
          children[i].style.background = '#ffffff';
          
          // Si c'est un élément avec une classe contenant "gradient"
          if (children[i].className.includes('gradient')) {
            children[i].style.backgroundImage = 'none';
          }
        }
      });
      
      // Ajouter une classe spécifique pour activer les corrections CSS
      document.documentElement.classList.add('mobile-light-theme-active');
      
      // Forcer aussi les éléments avec la classe dark:bg-* à avoir un fond blanc
      const darkBgElements = document.querySelectorAll('[class*="dark:bg"]');
      darkBgElements.forEach(el => {
        if (el.closest('.card') || el.closest('[class*="card"]')) {
          el.style.backgroundColor = '#ffffff';
          el.style.background = '#ffffff';
        }
      });

      // PRÉSERVER LES COULEURS DES ICÔNES ET BOUTONS
      // Trouver tous les éléments SVG et Lucide icons
      const coloredIcons = document.querySelectorAll('svg, [class*="lucide-"], [class*="icon"]');
      coloredIcons.forEach(icon => {
        // Supprimer les styles forcés qui pourraient affecter la couleur
        icon.style.removeProperty('color');
        icon.style.removeProperty('fill');
      });

      // Préserver les couleurs des badges
      const coloredBadges = document.querySelectorAll('[class*="bg-blue-"], [class*="bg-green-"], [class*="bg-red-"], [class*="bg-yellow-"]');
      coloredBadges.forEach(badge => {
        if (badge.style.color) {
          badge.dataset.originalColor = badge.style.color;
        }
        badge.style.removeProperty('color');
      });

      // Force l'ajout d'une balise style pour corriger tous les cas difficiles
      let styleElement = document.getElementById('emergency-card-fix');
      if (!styleElement) {
        styleElement = document.createElement('style');
        styleElement.id = 'emergency-card-fix';
        styleElement.textContent = `
          @media (max-width: 768px) {
            html[data-theme="light"] .card,
            html[data-theme="light"] [class*="Card"],
            html[data-theme="light"] [class*="-card"],
            html[data-theme="light"] [class*="card"],
            html[data-theme="light"] .mastered-card,
            html[data-theme="light"] .rounded-xl,
            html[data-theme="light"] .dark\\:bg-gray-800,
            html[data-theme="light"] [class*="learning-item-card"] {
              background-color: #ffffff !important;
              background: #ffffff !important;
            }
            
            html[data-theme="light"] .card > div,
            html[data-theme="light"] [class*="card"] > div {
              background-color: #ffffff !important;
              background: #ffffff !important;
              background-image: none !important;
            }
            
            /* Préserver les couleurs des icônes et badges */
            html[data-theme="light"] svg,
            html[data-theme="light"] [class*="lucide-"],
            html[data-theme="light"] [class*="icon"] {
              color: currentColor !important;
            }
            
            html[data-theme="light"] [class*="bg-blue-"].text-white,
            html[data-theme="light"] [class*="bg-green-"].text-white,
            html[data-theme="light"] [class*="bg-red-"].text-white,
            html[data-theme="light"] [class*="bg-yellow-"].text-white {
              color: #ffffff !important;
            }
          }
        `;
        document.head.appendChild(styleElement);
      }
    } else if (!isLightMode && isMobile) {
      // Mode sombre sur mobile - s'assurer qu'il est correctement appliqué
      document.documentElement.classList.remove('mobile-light-theme-active');
      document.body.style.removeProperty('background-color');
      document.documentElement.style.removeProperty('background-color');
      
      // Restaurer les couleurs d'origine pour les badges
      const coloredBadges = document.querySelectorAll('[data-original-color]');
      coloredBadges.forEach(badge => {
        if (badge.dataset.originalColor) {
          badge.style.color = badge.dataset.originalColor;
          delete badge.dataset.originalColor;
        }
      });
      
      // Supprimer le style d'urgence
      const styleElement = document.getElementById('emergency-card-fix');
      if (styleElement) styleElement.remove();
    }
  }
  
  // Exécuter immédiatement
  fixLightMode();
  
  // Écouter les changements de taille de fenêtre
  window.addEventListener('resize', fixLightMode);
  
  // Observer les changements d'attribut sur le html pour détecter les changements de thème
  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
        fixLightMode();
      }
    });
  });
  
  observer.observe(document.documentElement, { attributes: true });
  
  // Réappliquer périodiquement pour s'assurer que les corrections sont maintenues
  setInterval(fixLightMode, 1000);

  // Ajouter un écouteur pour le chargement du contenu dynamique
  window.addEventListener('DOMContentLoaded', fixLightMode);
  
  // Réappliquer après un court délai pour attraper le contenu dynamique chargé après le DOM initial
  setTimeout(fixLightMode, 500);
  setTimeout(fixLightMode, 1500);
  setTimeout(fixLightMode, 3000);
})();
