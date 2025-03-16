/**
 * SCRIPT DE CORRECTION D'ICÔNES SVG POUR LES LEARNING ITEM CARDS
 * 
 * Ce script applique des corrections directement au DOM pour les icônes SVG
 * dans les cartes d'items d'apprentissage.
 */

export function fixSvgIcons() {
  function fixIcons() {
    // On ne s'exécute que si nous sommes en mode sombre
    if (document.documentElement.getAttribute('data-theme') !== 'dark') {
      return;
    }
    
    // Sélectionner toutes les icônes SVG dans les learning item cards
    const cardSvgs = document.querySelectorAll('.learning-item-card svg, .item-wrapper svg');
    
    // Appliquer les corrections à chaque SVG
    cardSvgs.forEach(svg => {
      // Réinitialiser les attributs de style de base
      svg.setAttribute('fill', 'none');
      svg.setAttribute('stroke', 'currentColor');
      svg.setAttribute('stroke-width', '2.5');
      svg.setAttribute('stroke-linecap', 'round');
      svg.setAttribute('stroke-linejoin', 'round');
      
      // Réinitialiser tous les chemins à l'intérieur du SVG
      const paths = svg.querySelectorAll('path, line, polyline, circle, rect, polygon');
      paths.forEach(path => {
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', 'inherit');
      });
      
      // Cas spécial pour l'icône Trophy
      if (svg.getAttribute('data-lucide') === 'Trophy') {
        paths.forEach(path => {
          if (path.getAttribute('fill') === 'currentColor') {
            path.setAttribute('fill', '#facc15');
          } else {
            path.setAttribute('fill', 'none');
          }
        });
      }
      
      // Forcer un repaint de l'icône
      const display = svg.style.display;
      svg.style.display = 'none';
      void svg.offsetHeight; // Force reflow
      svg.style.display = display;
    });
    
    // Corrections spécifiques pour les icônes avec des couleurs spéciales
    fixColoredIcons();
  }
  
  function fixColoredIcons() {
    // Identifier les boutons colorés et appliquer les bonnes couleurs
    const redButtons = document.querySelectorAll('.learning-item-card .text-red-500 svg, .learning-item-card .text-red-600 svg, .learning-item-card [class*="text-red-"] svg');
    redButtons.forEach(svg => {
      svg.setAttribute('stroke', '#ef4444');
      svg.setAttribute('fill', 'none');
    });
    
    const greenButtons = document.querySelectorAll('.learning-item-card .text-green-500 svg, .learning-item-card .text-green-600 svg, .learning-item-card [class*="text-green-"] svg');
    greenButtons.forEach(svg => {
      svg.setAttribute('stroke', '#22c55e');
      svg.setAttribute('fill', 'none');
    });
    
    const blueButtons = document.querySelectorAll('.learning-item-card .text-blue-500 svg, .learning-item-card .text-blue-600 svg, .learning-item-card [class*="text-blue-"] svg');
    blueButtons.forEach(svg => {
      svg.setAttribute('stroke', '#3b82f6');
      svg.setAttribute('fill', 'none');
    });
    
    const yellowButtons = document.querySelectorAll('.learning-item-card .text-yellow-500 svg, .learning-item-card .text-yellow-600 svg, .learning-item-card [class*="text-yellow-"] svg');
    yellowButtons.forEach(svg => {
      svg.setAttribute('stroke', '#facc15');
      svg.setAttribute('fill', 'none');
    });
    
    // Correction spécifique pour les trophées
    const trophyIcons = document.querySelectorAll('.learning-item-card svg[data-lucide="Trophy"]');
    trophyIcons.forEach(svg => {
      svg.setAttribute('stroke', '#facc15');
      const paths = svg.querySelectorAll('path');
      paths.forEach(path => {
        if (path.getAttribute('fill') === 'currentColor') {
          path.setAttribute('fill', '#facc15');
        } else {
          path.setAttribute('fill', 'none');
        }
      });
    });
  }
  
  // Application immédiate
  fixIcons();
  
  // Surveiller les modifications du DOM pour corriger les nouvelles icônes
  const observer = new MutationObserver(mutations => {
    let shouldFix = false;
    
    mutations.forEach(mutation => {
      if (mutation.addedNodes.length) {
        shouldFix = true;
      }
    });
    
    if (shouldFix) {
      fixIcons();
    }
  });
  
  // Observer tout le document
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  // Réappliquer périodiquement pour s'assurer que toutes les icônes sont corrigées
  const interval = setInterval(fixIcons, 1000);
  
  // Observer les changements de thème
  const themeObserver = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      if (mutation.attributeName === 'data-theme') {
        fixIcons();
      }
    });
  });
  
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme']
  });
  
  // Fournir une fonction de nettoyage
  return () => {
    observer.disconnect();
    themeObserver.disconnect();
    clearInterval(interval);
  };
}
