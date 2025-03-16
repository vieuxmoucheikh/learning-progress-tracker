/**
 * DÉPANNAGE ULTIME POUR LE MODE SOMBRE - SCRIPT D'URGENCE
 * Ce script va analyser et corriger manuellement certains problèmes d'affichage
 * qui ne peuvent pas être résolus par CSS seul.
 */

export function applyEmergencyDarkModeFixes() {
  if (document.documentElement.getAttribute('data-theme') !== 'dark') {
    return; // N'exécuter que si nous sommes en mode sombre
  }

  console.log('🚨 Applying Emergency Dark Mode Fixes');

  // Liste des correctifs à appliquer
  const fixes = [
    fixTotalTimeDisplays,
    fixSvgIcons,
    fixWhiteBackgrounds,
    fixCardsSpecifically
  ];

  // Appliquer tous les correctifs
  fixes.forEach(fix => {
    try {
      fix();
    } catch (error) {
      console.error(`Failed to apply fix: ${fix.name}`, error);
    }
  });

  // Configurer un observateur pour appliquer les correctifs aux nouveaux éléments
  setupMutationObserver(fixes);

  // Appliquer les correctifs encore une fois après un court délai
  // pour capturer les éléments chargés de manière asynchrone
  setTimeout(() => {
    fixes.forEach(fix => fix());
  }, 200);
}

// Corrige spécifiquement les affichages de temps total
function fixTotalTimeDisplays() {
  // Cibler très précisément les sections de temps
  document.querySelectorAll('[class*="total-time"], [class*="total-minutes"], .time-display, .stats-display, .time-counter, .time-tracker, .mb-4.p-4.bg-white, .mb-4.p-4.bg-gray-50, .mb-4.p-4.bg-gray-100, .p-4.bg-white, .p-4.bg-gray-50, .p-4.bg-gray-100').forEach(element => {
    // Force le style inline pour s'assurer qu'il est appliqué
    element.style.backgroundColor = '#0f172a';
    element.style.background = '#0f172a';
    element.style.color = '#f8fafc';
    element.style.borderColor = '#334155';
    element.style.borderRadius = '0.5rem';
    element.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.2), 0 2px 4px -2px rgba(0, 0, 0, 0.1)';
    element.style.border = '1px solid #334155';
    
    // Corrige aussi les enfants directs
    Array.from(element.children).forEach(child => {
      if (child.tagName !== 'SVG') {
        child.style.color = '#f8fafc';
      }
    });
  });
}

// Corrige les icônes SVG
function fixSvgIcons() {
  document.querySelectorAll('svg').forEach(svg => {
    // Styles de base pour toutes les icônes
    svg.style.fill = 'none';
    svg.style.strokeWidth = '2.5px';
    svg.style.strokeLinecap = 'round';
    svg.style.strokeLinejoin = 'round';
    svg.style.filter = 'drop-shadow(0 0 1px rgba(255, 255, 255, 0.7))';
    svg.style.opacity = '1';
    svg.style.visibility = 'visible';
    
    // Réinitialisation de tous les chemins et formes
    Array.from(svg.querySelectorAll('path, line, circle, rect, polyline, polygon')).forEach(path => {
      path.setAttribute('fill', 'none');
      path.style.fill = 'none';
    });
    
    // Couleurs spécifiques selon le type d'icône
    const iconType = svg.getAttribute('data-lucide');
    if (iconType) {
      switch (iconType) {
        case 'Edit':
        case 'Save':
        case 'Eye':
        case 'EyeOff':
        case 'Download':
          svg.style.stroke = '#60a5fa';
          svg.style.color = '#60a5fa';
          break;
        case 'Trash2':
        case 'X':
          svg.style.stroke = '#f87171';
          svg.style.color = '#f87171';
          break;
        case 'Play':
        case 'Check':
        case 'Bookmark':
        case 'BookmarkCheck':
          svg.style.stroke = '#4ade80';
          svg.style.color = '#4ade80';
          break;
        case 'Pause':
          svg.style.stroke = '#facc15';
          svg.style.color = '#facc15';
          break;
        case 'Trophy':
          svg.style.stroke = '#fbbf24';
          svg.style.color = '#fbbf24';
          // Cas spécial pour l'icône Trophy
          const trophyPath = svg.querySelector('path[fill="currentColor"]');
          if (trophyPath) {
            trophyPath.style.fill = '#fbbf24';
            trophyPath.setAttribute('fill', '#fbbf24');
          }
          break;
        case 'Clock':
          svg.style.stroke = '#94a3b8';
          svg.style.color = '#94a3b8';
          break;
      }
    }
    
    // Vérifier les classes de couleur
    if (svg.closest('.text-blue-500, .text-blue-600, [class*="text-blue-"]')) {
      svg.style.stroke = '#60a5fa';
      svg.style.color = '#60a5fa';
    } else if (svg.closest('.text-green-500, .text-green-600, [class*="text-green-"]')) {
      svg.style.stroke = '#4ade80';
      svg.style.color = '#4ade80';
    } else if (svg.closest('.text-red-500, .text-red-600, [class*="text-red-"]')) {
      svg.style.stroke = '#f87171';
      svg.style.color = '#f87171';
    } else if (svg.closest('.text-yellow-500, .text-yellow-600, [class*="text-yellow-"]')) {
      svg.style.stroke = '#fbbf24';
      svg.style.color = '#fbbf24';
    }
  });
}

// Corrige tous les fonds blancs
function fixWhiteBackgrounds() {
  document.querySelectorAll('.bg-white, .bg-gray-50, .bg-gray-100, [class*="bg-white"], [class*="bg-gray-50"], [class*="bg-gray-100"]').forEach(element => {
    element.style.backgroundColor = '#0f172a';
    element.style.background = '#0f172a';
    element.style.color = '#f8fafc';
    element.style.borderColor = '#334155';
  });
  
  // Correction des fonds en style inline
  document.querySelectorAll('[style*="background-color: white"], [style*="background-color: #fff"], [style*="background-color: #ffffff"], [style*="background: white"], [style*="background: #fff"], [style*="background: #ffffff"]').forEach(element => {
    element.style.backgroundColor = '#0f172a';
    element.style.background = '#0f172a';
    element.style.color = '#f8fafc';
  });
}

// Corrige spécifiquement les cartes d'apprentissage
function fixCardsSpecifically() {
  document.querySelectorAll('.learning-item-card, .item-wrapper').forEach(card => {
    // Icônes dans les cartes
    card.querySelectorAll('svg').forEach(svg => {
      svg.style.strokeWidth = '2.5px';
      svg.style.fill = 'none';
      svg.style.filter = 'drop-shadow(0 0 2px rgba(255, 255, 255, 0.7))';
      
      // Chemins et formes dans les icônes
      Array.from(svg.querySelectorAll('path, line, circle, rect, polyline, polygon')).forEach(path => {
        if (path.getAttribute('fill') !== 'currentColor') {
          path.setAttribute('fill', 'none');
          path.style.fill = 'none';
        }
      });
    });
    
    // Sections avec fond blanc
    card.querySelectorAll('.p-4.bg-white, .p-4.bg-gray-50, .p-4.bg-gray-100, div[class*="bg-white"], div[class*="bg-gray-50"], div[class*="bg-gray-100"]').forEach(section => {
      section.style.backgroundColor = '#1e293b';
      section.style.background = '#1e293b';
      section.style.color = '#f8fafc';
      section.style.border = '1px solid #334155';
      section.style.borderRadius = '0.5rem';
      
      // Textes à l'intérieur
      Array.from(section.querySelectorAll('*')).forEach(child => {
        if (child.tagName !== 'SVG') {
          child.style.color = '#f8fafc';
        }
      });
    });
    
    // Sections de temps
    card.querySelectorAll('[class*="total-time"], [class*="total-minutes"], [class*="time-display"], .time-display, .stats-display').forEach(timeDisplay => {
      timeDisplay.style.backgroundColor = '#0f172a';
      timeDisplay.style.background = '#0f172a';
      timeDisplay.style.color = '#f8fafc';
      timeDisplay.style.borderColor = '#334155';
      timeDisplay.style.borderRadius = '0.5rem';
      timeDisplay.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.2), 0 2px 4px -2px rgba(0, 0, 0, 0.1)';
      
      // Textes à l'intérieur
      Array.from(timeDisplay.querySelectorAll('*')).forEach(child => {
        if (child.tagName !== 'SVG') {
          child.style.color = '#f8fafc';
        }
      });
    });
  });
}

// Configurer un observateur de mutations pour traiter les nouvelles modifications
function setupMutationObserver(fixes) {
  const observer = new MutationObserver((mutations) => {
    let needsApply = false;
    
    for (const mutation of mutations) {
      if (mutation.addedNodes.length) {
        needsApply = true;
        break;
      }
    }
    
    if (needsApply) {
      fixes.forEach(fix => fix());
    }
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// Export pour utilisation dans d'autres modules
export default applyEmergencyDarkModeFixes;
