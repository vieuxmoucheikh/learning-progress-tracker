/**
 * Script critique de correction pour les affichages mobiles
 * Ce script est conçu pour être chargé le plus tôt possible afin de corriger
 * les problèmes visuels critiques sur mobile avant même le rendu complet.
 */

(function() {
  // Fonction d'initialisation principale
  function initCriticalFixes() {
    const isMobile = window.innerWidth <= 768;
    const isDarkTheme = document.documentElement.getAttribute('data-theme') === 'dark';
    
    // Appliquer uniquement sur mobile
    if (!isMobile) return;
    
    // Fixer les fonds et couleurs immédiatement
    fixBackgroundsAndColors(isDarkTheme);
    
    // Améliorer les éléments interactifs pour mobile
    enhanceTouchElements();
    
    // Observer les changements de thème
    observeThemeChanges();
    
    // Observer les changements de DOM pour appliquer les corrections aux nouveaux éléments
    observeDomChanges();
  }
  
  // Correction des fonds et couleurs
  function fixBackgroundsAndColors(isDarkTheme) {
    if (isDarkTheme) {
      // Corrections critiques pour le mode sombre
      document.body.style.backgroundColor = '#0f172a';
      document.documentElement.style.backgroundColor = '#0f172a';
      
      // Rechercher et corriger les éléments avec fond blanc
      const elementsWithLightBg = document.querySelectorAll('.bg-white, .bg-gray-50, .bg-gray-100');
      elementsWithLightBg.forEach(el => {
        el.style.backgroundColor = '#1e293b';
        el.style.color = '#f1f5f9';
      });
    } else {
      // Corrections critiques pour le mode clair
      document.body.style.backgroundColor = '#f8fafc';
      document.documentElement.style.backgroundColor = '#f8fafc';
      
      // Améliorer le contraste des textes si nécessaire
      const textElements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, span');
      textElements.forEach(el => {
        const computedStyle = window.getComputedStyle(el);
        const color = computedStyle.color;
        
        // Vérifier si la couleur est trop claire (ne fait rien si déjà sombre)
        if (isColorTooLight(color)) {
          el.style.color = '#334155';
        }
      });
    }
  }
  
  // Améliorer les éléments interactifs pour le toucher
  function enhanceTouchElements() {
    // Agrandir les cibles tactiles
    const buttons = document.querySelectorAll('button, [role="button"], .btn');
    buttons.forEach(btn => {
      const rect = btn.getBoundingClientRect();
      if (rect.height < 36) {
        btn.style.minHeight = '36px';
      }
      if (rect.width < 36) {
        btn.style.minWidth = '36px';
      }
      
      // Ajouter un peu d'espace entre les boutons
      btn.style.margin = '4px';
    });
    
    // Agrandir les champs de formulaire pour faciliter la saisie
    const inputs = document.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
      input.style.fontSize = '16px'; // Évite le zoom automatique sur iOS
      input.style.padding = '10px 12px';
    });
  }
  
  // Observer les changements de thème
  function observeThemeChanges() {
    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        if (mutation.attributeName === 'data-theme') {
          const isDarkTheme = document.documentElement.getAttribute('data-theme') === 'dark';
          fixBackgroundsAndColors(isDarkTheme);
        }
      });
    });
    
    observer.observe(document.documentElement, { attributes: true });
  }
  
  // Observer les changements de DOM
  function observeDomChanges() {
    const observer = new MutationObserver(mutations => {
      const isDarkTheme = document.documentElement.getAttribute('data-theme') === 'dark';
      
      mutations.forEach(mutation => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === 1) { // Element node
              if (isDarkTheme) {
                // Corriger les fonds blancs des nouveaux éléments
                const lightElements = node.querySelectorAll 
                  ? node.querySelectorAll('.bg-white, .bg-gray-50, .bg-gray-100')
                  : [];
                
                lightElements.forEach(el => {
                  el.style.backgroundColor = '#1e293b';
                  el.style.color = '#f1f5f9';
                });
              }
              
              // Améliorer les éléments interactifs ajoutés dynamiquement
              const newButtons = node.querySelectorAll
                ? node.querySelectorAll('button, [role="button"], .btn')
                : [];
              
              newButtons.forEach(btn => {
                const rect = btn.getBoundingClientRect();
                if (rect.height < 36) {
                  btn.style.minHeight = '36px';
                }
                if (rect.width < 36) {
                  btn.style.minWidth = '36px';
                }
                btn.style.margin = '4px';
              });
            }
          });
        }
      });
    });
    
    observer.observe(document.body, { childList: true, subtree: true });
  }
  
  // Utilitaire pour vérifier si une couleur est trop claire
  function isColorTooLight(colorStr) {
    // Extraire les composantes RVB
    const rgbMatch = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/);
    if (!rgbMatch) return false;
    
    const r = parseInt(rgbMatch[1], 10);
    const g = parseInt(rgbMatch[2], 10);
    const b = parseInt(rgbMatch[3], 10);
    
    // Calcul de la luminosité perçue
    // Formule: (0.299*R + 0.587*G + 0.114*B)
    const brightness = (0.299 * r + 0.587 * g + 0.114 * b);
    
    // Si la luminosité est > 180 (sur 255), la couleur est considérée comme claire
    return brightness > 180;
  }
  
  // Lancer l'initialisation immédiatement
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCriticalFixes);
  } else {
    initCriticalFixes();
  }
  
  // Réappliquer les corrections lors du chargement complet
  window.addEventListener('load', initCriticalFixes);
  
  // Et lors des changements de taille d'écran (rotations d'appareil)
  window.addEventListener('resize', initCriticalFixes);
})();
