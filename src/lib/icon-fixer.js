/**
 * SCRIPT DE CORRECTION D'URGENCE POUR LES ICÔNES SVG
 * 
 * Ce script applique des corrections directement au DOM pour toutes les icônes
 * avec une attention particulière pour les learning item cards.
 */

export function fixSvgIcons() {
  // Styles inline pour assurer la priorité maximale
  const emergencyStyles = `
    /* Styles inline d'urgence pour SVG */
    .learning-item-card svg, 
    .item-wrapper svg,
    .card svg,
    svg[data-lucide] {
      fill: none !important;
      stroke: currentColor !important;
      stroke-width: 2.5px !important;
      stroke-linecap: round !important;
      stroke-linejoin: round !important;
    }
    
    .learning-item-card svg *, 
    .item-wrapper svg *,
    .card svg *,
    svg[data-lucide] * {
      fill: none !important;
      stroke: inherit !important;
    }
    
    .text-red-500 svg, .text-red-600 svg, [class*="text-red-"] svg {
      stroke: #ef4444 !important;
    }
    
    .text-blue-500 svg, .text-blue-600 svg, [class*="text-blue-"] svg {
      stroke: #3b82f6 !important;
    }
    
    .text-green-500 svg, .text-green-600 svg, [class*="text-green-"] svg {
      stroke: #22c55e !important;
    }
    
    .text-yellow-500 svg, .text-yellow-600 svg, [class*="text-yellow-"] svg {
      stroke: #facc15 !important;
    }
    
    svg[data-lucide="Trophy"], .lucide-trophy {
      stroke: #facc15 !important;
    }
    
    svg[data-lucide="Trophy"] path[fill="currentColor"], 
    .lucide-trophy path[fill="currentColor"] {
      fill: #facc15 !important;
    }
  `;

  // Créer et injecter un élément style pour les styles d'urgence
  function injectEmergencyStyles() {
    // Supprimer tout style d'urgence existant
    const existingStyle = document.getElementById('svg-emergency-styles');
    if (existingStyle) {
      existingStyle.remove();
    }
    
    // Créer un nouveau style
    const style = document.createElement('style');
    style.id = 'svg-emergency-styles';
    style.innerHTML = emergencyStyles;
    document.head.appendChild(style);
  }

  function fixIcons() {
    // Cibler toutes les icônes SVG dans l'application
    const allSvgs = document.querySelectorAll('svg');
    
    allSvgs.forEach(svg => {
      // Ajouter un attribut pour marquer que nous avons traité cette icône
      svg.setAttribute('data-emergency-fix', 'true');
      
      // Fixer les attributs directement
      svg.style.fill = 'none';
      svg.style.stroke = 'currentColor';
      svg.style.strokeWidth = '2.5px';
      svg.style.strokeLinecap = 'round';
      svg.style.strokeLinejoin = 'round';
      
      // Fixer tous les éléments enfants
      const allPaths = svg.querySelectorAll('path, line, circle, rect, polyline, polygon');
      allPaths.forEach(path => {
        path.style.fill = 'none';
        path.style.stroke = 'inherit';
      });
      
      // Cas spécial pour Trophy
      if (svg.getAttribute('data-lucide') === 'Trophy') {
        svg.style.stroke = '#facc15';
        const paths = svg.querySelectorAll('path');
        paths.forEach(path => {
          if (path.getAttribute('fill') === 'currentColor') {
            path.style.fill = '#facc15';
          } else {
            path.style.fill = 'none';
          }
        });
      }
      
      // Forcer un repaint
      const display = svg.style.display;
      svg.style.display = 'none';
      void svg.offsetHeight; // force reflow
      svg.style.display = display;
    });
    
    // Appliquer des corrections spécifiques aux cards
    fixCardIcons();
  }
  
  function fixCardIcons() {
    // Cibler spécifiquement les SVG dans les learning item cards
    const cardIcons = document.querySelectorAll('.learning-item-card svg, .item-wrapper svg, .card svg');
    
    cardIcons.forEach(svg => {
      // Appliquer directement les styles via l'attribut style (priorité plus élevée)
      svg.setAttribute('style', 'fill: none !important; stroke: currentColor !important; stroke-width: 2.5px !important; stroke-linecap: round !important; stroke-linejoin: round !important;');
      
      // Gérer les couleurs des icônes
      const parentEl = svg.closest('[class*="text-"]');
      if (parentEl) {
        if (parentEl.className.includes('text-red')) {
          svg.style.stroke = '#ef4444';
        } else if (parentEl.className.includes('text-blue')) {
          svg.style.stroke = '#3b82f6';
        } else if (parentEl.className.includes('text-green')) {
          svg.style.stroke = '#22c55e';
        } else if (parentEl.className.includes('text-yellow')) {
          svg.style.stroke = '#facc15';
        }
      }
      
      // Tous les éléments enfants doivent hériter du style stroke mais pas de fill
      const allChildren = svg.querySelectorAll('*');
      allChildren.forEach(child => {
        child.setAttribute('style', 'fill: none !important; stroke: inherit !important;');
      });
    });
  }
  
  // Fonction pour recréer les icônes problématiques
  function recreateIcons() {
    // Trouver toutes les icônes dans les learning item cards
    const cardIcons = document.querySelectorAll('.learning-item-card svg, .item-wrapper svg');
    
    cardIcons.forEach(svg => {
      // Sauvegarder les informations de l'icône
      const parent = svg.parentNode;
      const iconType = svg.getAttribute('data-lucide');
      const classes = svg.getAttribute('class');
      
      // Recréer l'élément SVG
      if (iconType && parent) {
        // Clone le nœud pour préserver tous les attributs
        const newSvg = svg.cloneNode(true);
        
        // Appliquer les styles corrects
        newSvg.setAttribute('style', 'fill: none !important; stroke: currentColor !important; stroke-width: 2.5px !important; stroke-linecap: round !important; stroke-linejoin: round !important;');
        
        // Remplacer l'ancien SVG par le nouveau
        parent.replaceChild(newSvg, svg);
        
        // Appliquer des styles spécifiques aux enfants
        const allChildren = newSvg.querySelectorAll('*');
        allChildren.forEach(child => {
          child.setAttribute('style', 'fill: none !important; stroke: inherit !important;');
        });
      }
    });
  }
  
  // Injecter les styles d'urgence
  injectEmergencyStyles();
  
  // Appliquer les corrections immédiatement
  fixIcons();
  recreateIcons();
  
  // Créer un observer pour surveiller les modifications du DOM
  const observer = new MutationObserver(mutations => {
    let shouldFix = false;
    let shouldRecreate = false;
    
    mutations.forEach(mutation => {
      // Si des nœuds sont ajoutés, vérifier s'il y a des SVG
      if (mutation.addedNodes.length) {
        mutation.addedNodes.forEach(node => {
          // Vérifier si c'est un élément DOM et s'il contient ou est un SVG
          if (node.nodeType === 1) { // ELEMENT_NODE
            if (node.tagName === 'SVG' || node.querySelector('svg')) {
              shouldFix = true;
              
              // Si c'est dans une card, on le recrée aussi
              if (node.closest('.learning-item-card') || node.closest('.item-wrapper')) {
                shouldRecreate = true;
              }
            }
          }
        });
      }
      
      // Vérifier si un attribut a été modifié
      if (mutation.type === 'attributes') {
        const target = mutation.target;
        if (target.tagName === 'SVG' || target.closest('svg')) {
          shouldFix = true;
          
          // Si c'est dans une card, on le recrée aussi
          if (target.closest('.learning-item-card') || target.closest('.item-wrapper')) {
            shouldRecreate = true;
          }
        }
      }
    });
    
    // Appliquer les corrections si nécessaire
    if (shouldFix) {
      fixIcons();
    }
    
    if (shouldRecreate) {
      recreateIcons();
    }
  });
  
  // Observer tout le document pour les modifications
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'style', 'data-lucide']
  });
  
  // Surveiller aussi les changements de thème
  const themeObserver = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      if (mutation.attributeName === 'data-theme') {
        // Réinjecter les styles et réappliquer toutes les corrections
        injectEmergencyStyles();
        fixIcons();
        recreateIcons();
      }
    });
  });
  
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme']
  });
  
  // Réappliquer périodiquement pour s'assurer que tout fonctionne
  const interval = setInterval(() => {
    fixIcons();
    recreateIcons();
  }, 2000);
  
  // Fonction de nettoyage
  return () => {
    observer.disconnect();
    themeObserver.disconnect();
    clearInterval(interval);
    
    const style = document.getElementById('svg-emergency-styles');
    if (style) {
      style.remove();
    }
  };
}
