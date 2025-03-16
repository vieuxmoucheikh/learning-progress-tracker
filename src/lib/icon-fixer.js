/**
 * CORRECTEUR SYSTÈME POUR LES PROBLÈMES DE RENDU EN MODE SOMBRE
 * Ce script applique des corrections au niveau DOM pour garantir que:
 * 1. Les fonds blancs sont convertis en fonds sombres
 * 2. Les icônes SVG sont correctement rendues
 * 3. Les textes ont un contraste suffisant
 */

// Fonction principale d'application des correctifs
export function applyDarkModeFixesRuntime() {
  // Vérifie si nous sommes en mode sombre
  const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';
  if (!isDarkMode) return;

  console.log('🔧 Applying Dark Mode Runtime Fixes');

  // CORRECTIF 1: FONDS BLANCS
  fixWhiteBackgrounds();

  // CORRECTIF 2: ICÔNES SVG
  fixSvgIcons();

  // CORRECTIF 3: CONTRASTE DE TEXTE
  fixTextContrast();

  // Configuration de l'observateur pour continuer à appliquer les correctifs
  setupMutationObserver();
}

// Corrige tous les éléments avec fond blanc
function fixWhiteBackgrounds() {
  // Sélecteurs pour éléments potentiellement problématiques
  const whiteBackgroundSelectors = [
    '.bg-white',
    '.bg-gray-50',
    '.bg-gray-100',
    '.mb-4.p-4.bg-gray-50',
    '.mb-4.p-4.bg-white',
    '.p-4.bg-gray-50',
    '.p-4.bg-white',
    '[class*="total-time"]',
    '[class*="total-minutes"]',
    '.time-display',
    '.stats-display',
    '.time-counter',
    '.time-tracker'
  ];

  // Applique les correctifs à chaque sélecteur
  whiteBackgroundSelectors.forEach(selector => {
    document.querySelectorAll(selector).forEach(element => {
      // Style direct inline pour garantir l'application
      element.style.backgroundColor = '#0f172a';
      element.style.color = '#f8fafc';
      element.style.borderColor = '#334155';
      
      // Assure que tous les enfants ont une couleur de texte claire
      Array.from(element.querySelectorAll('*')).forEach(child => {
        if (child.tagName !== 'SVG') {
          child.style.color = '#f8fafc';
        }
      });
    });
  });

  // Recherche par attributs style pour les fonds blancs
  document.querySelectorAll('[style*="background"]').forEach(element => {
    const currentStyle = element.getAttribute('style');
    if (
      currentStyle.includes('background-color: white') ||
      currentStyle.includes('background-color: #fff') ||
      currentStyle.includes('background-color: #ffffff') ||
      currentStyle.includes('background: white') ||
      currentStyle.includes('background: #fff') ||
      currentStyle.includes('background: #ffffff')
    ) {
      element.style.backgroundColor = '#0f172a';
      element.style.color = '#f8fafc';
    }
  });
}

// Corrige les icônes SVG
function fixSvgIcons() {
  document.querySelectorAll('svg').forEach(svg => {
    // Réinitialisation des propriétés SVG
    svg.style.fill = 'none';
    svg.style.strokeWidth = '2.5px';
    svg.style.strokeLinecap = 'round';
    svg.style.strokeLinejoin = 'round';
    svg.style.filter = 'drop-shadow(0 0 1px rgba(255, 255, 255, 0.7))';
    
    // Réinitialisation de tous les chemins et formes
    Array.from(svg.querySelectorAll('path, line, circle, rect, polyline, polygon')).forEach(path => {
      path.setAttribute('fill', 'none');
      path.style.fill = 'none';
    });

    // Vérification du parent pour appliquer des couleurs spécifiques
    const parent = svg.parentElement;
    if (parent) {
      if (parent.classList.contains('text-blue-500') || parent.classList.contains('text-blue-600')) {
        svg.style.stroke = '#60a5fa';
      } else if (parent.classList.contains('text-green-500') || parent.classList.contains('text-green-600')) {
        svg.style.stroke = '#4ade80';
      } else if (parent.classList.contains('text-red-500') || parent.classList.contains('text-red-600')) {
        svg.style.stroke = '#f87171';
      } else if (parent.classList.contains('text-yellow-500') || parent.classList.contains('text-yellow-600')) {
        svg.style.stroke = '#fbbf24';
      }
    }

    // Cas spécial pour l'icône Trophy
    if (svg.getAttribute('data-lucide') === 'Trophy') {
      svg.style.stroke = '#fbbf24';
      const fillPath = svg.querySelector('path[fill="currentColor"]');
      if (fillPath) {
        fillPath.style.fill = '#fbbf24';
      }
    }
  });
}

// Corrige le contraste du texte
function fixTextContrast() {
  // Sélecteurs pour textes potentiellement problématiques
  const lowContrastSelectors = [
    '.text-gray-500',
    '.text-gray-600',
    '.text-gray-700',
    '.text-gray-800',
    '.text-gray-900'
  ];

  // Applique les correctifs à chaque sélecteur
  lowContrastSelectors.forEach(selector => {
    document.querySelectorAll(selector).forEach(element => {
      if (!element.closest('svg')) {
        element.style.color = '#f1f5f9';
      }
    });
  });

  // S'assurer que les titres sont visibles
  document.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach(heading => {
    heading.style.color = '#f8fafc';
  });
}

// Configure un observateur de mutations pour appliquer les correctifs aux nouveaux éléments
function setupMutationObserver() {
  // Créer un observateur qui surveille les modifications du DOM
  const observer = new MutationObserver((mutations) => {
    let needsFixes = false;
    
    mutations.forEach(mutation => {
      // Vérifier si des nœuds ont été ajoutés
      if (mutation.addedNodes.length) {
        needsFixes = true;
      }
    });
    
    // Appliquer les correctifs si nécessaire
    if (needsFixes) {
      fixWhiteBackgrounds();
      fixSvgIcons();
      fixTextContrast();
    }
  });
  
  // Observer tout le corps du document
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// Exportation pour utilisation directe comme module ES
export default applyDarkModeFixesRuntime;
