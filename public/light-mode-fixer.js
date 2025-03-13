/**
 * Script pour corriger les problèmes de mode clair et sombre sur mobile
 */
(function() {
  function fixThemeMode() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const isMobile = window.innerWidth <= 768;
    
    if (isMobile) {
      console.log(`Applying theme fixes for ${currentTheme} mode on mobile`);

      // Nettoyer d'abord les modifications précédentes
      document.documentElement.classList.remove('mobile-light-theme-active', 'mobile-dark-theme-active');
      document.documentElement.removeAttribute('data-mobile-light');
      document.documentElement.removeAttribute('data-mobile-dark');
      
      if (currentTheme === 'light') {
        // MODE CLAIR
        document.body.style.backgroundColor = '#f8fafc'; // slate-50
        document.documentElement.style.backgroundColor = '#f8fafc';
        document.documentElement.setAttribute('data-mobile-light', 'true');
        document.documentElement.classList.add('mobile-light-theme-active');
        
        // Assurer que les cartes ont un fond blanc
        fixCardBackgrounds('#ffffff', 'rgba(0, 0, 0, 0.1)', '0 2px 10px rgba(0, 0, 0, 0.05)');
      } else {
        // MODE SOMBRE
        document.body.style.backgroundColor = '#1e293b'; // slate-800
        document.documentElement.style.backgroundColor = '#1e293b';
        document.documentElement.setAttribute('data-mobile-dark', 'true');
        document.documentElement.classList.add('mobile-dark-theme-active');
        
        // Assurer que les cartes ont un fond sombre
        fixCardBackgrounds('#1e293b', 'rgba(255, 255, 255, 0.1)', '0 4px 12px rgba(0, 0, 0, 0.2)');
      }
      
      // Préserver les couleurs des icônes et badges dans les deux modes
      preserveColors();

      // Injecter une balise style avec des correctifs spécifiques au mode actuel
      injectThemeSpecificStyles(currentTheme);
    }
  }
  
  function fixCardBackgrounds(backgroundColor, borderColor, boxShadow) {
    // Sélecteurs très larges pour attraper toutes les cartes possibles
    const cardSelectors = [
      '.card', 
      '[class*="Card"]', 
      '[class*="-card"]',
      '[class*="card"]',
      '.mastered-card',
      '.rounded-xl',
      '.border-l-4',
      '.bg-card'
    ];
    
    // Sélectionner toutes les cartes
    const cards = document.querySelectorAll(cardSelectors.join(','));
    
    console.log(`Applying background fixes to ${cards.length} cards`);
    
    // Appliquer les styles à chaque carte
    cards.forEach(card => {
      card.style.backgroundColor = backgroundColor;
      card.style.background = backgroundColor;
      card.style.borderColor = borderColor;
      card.style.boxShadow = boxShadow;
      
      // Traiter également les enfants directs qui peuvent avoir des backgrounds
      const children = card.children;
      for (let i = 0; i < children.length; i++) {
        children[i].style.backgroundColor = backgroundColor;
        children[i].style.background = backgroundColor;
        
        // Si c'est un élément avec une classe contenant "gradient", préserver le gradient
        if (!children[i].className.includes('gradient')) {
          children[i].style.backgroundImage = 'none';
        }
      }
    });
  }
  
  function preserveColors() {
    // Préserver les couleurs des icônes
    const coloredElements = document.querySelectorAll('svg, [class*="lucide-"], [class*="icon"], .preserve-color');
    coloredElements.forEach(el => {
      el.style.removeProperty('color');
      el.style.removeProperty('fill');
    });
    
    // Préserver les couleurs spécifiques des badges et boutons
    const coloredBadgesButtons = document.querySelectorAll(
      '[class*="bg-blue-"], [class*="bg-green-"], [class*="bg-red-"], [class*="bg-yellow-"]'
    );
    coloredBadgesButtons.forEach(el => {
      // Stocker la couleur actuelle si elle est définie
      if (window.getComputedStyle(el).color && !el.dataset.originalColor) {
        el.dataset.originalColor = window.getComputedStyle(el).color;
      }
      
      // Si c'est un badge ou un bouton primaire, ne pas modifier sa couleur
      const isBadge = el.classList.contains('badge') || 
                      el.className.includes('badge') || 
                      el.tagName.toLowerCase() === 'button';
      if (isBadge) {
        el.style.removeProperty('color');
      }
    });
  }
  
  function injectThemeSpecificStyles(theme) {
    // Supprimer l'ancien style s'il existe
    const oldStyle = document.getElementById('dynamic-theme-fix');
    if (oldStyle) oldStyle.remove();
    
    // Créer un nouvel élément style
    const styleElement = document.createElement('style');
    styleElement.id = 'dynamic-theme-fix';
    
    if (theme === 'light') {
      styleElement.textContent = `
        @media (max-width: 768px) {
          /* Fond pour le mode clair */
          html[data-theme="light"], html[data-theme="light"] body {
            background-color: #f8fafc !important;
            color-scheme: light !important;
          }
          
          /* Cartes en mode clair */
          html[data-theme="light"] .card,
          html[data-theme="light"] [class*="Card"],
          html[data-theme="light"] [class*="-card"],
          html[data-theme="light"] [class*="card"],
          html[data-theme="light"] .mastered-card {
            background-color: #ffffff !important;
            background: #ffffff !important;
            border-color: rgba(0, 0, 0, 0.1) !important;
          }
          
          /* Titres en mode clair */
          html[data-theme="light"] h1,
          html[data-theme="light"] h2,
          html[data-theme="light"] h3 {
            color: #0f172a !important;
          }
          
          /* Texte en mode clair */
          html[data-theme="light"] p:not([class*="text-"]),
          html[data-theme="light"] span:not([class*="text-"]) {
            color: #334155 !important;
          }
        }
      `;
    } else {
      styleElement.textContent = `
        @media (max-width: 768px) {
          /* Fond pour le mode sombre */
          html[data-theme="dark"], html[data-theme="dark"] body {
            background-color: #1e293b !important;
            color-scheme: dark !important;
          }
          
          /* Cartes en mode sombre */
          html[data-theme="dark"] .card,
          html[data-theme="dark"] [class*="Card"],
          html[data-theme="dark"] [class*="-card"],
          html[data-theme="dark"] [class*="card"],
          html[data-theme="dark"] .mastered-card {
            background-color: #1e293b !important;
            background: #1e293b !important;
            border-color: rgba(255, 255, 255, 0.1) !important;
          }
          
          /* Titres en mode sombre */
          html[data-theme="dark"] h1,
          html[data-theme="dark"] h2,
          html[data-theme="dark"] h3 {
            color: #f1f5f9 !important;
          }
          
          /* Texte en mode sombre */
          html[data-theme="dark"] p:not([class*="text-"]),
          html[data-theme="dark"] span:not([class*="text-"]) {
            color: #e2e8f0 !important;
          }
        }
      `;
    }
    
    document.head.appendChild(styleElement);
  }

  // Exécuter immédiatement
  fixThemeMode();
  
  // Écouter les changements de taille de fenêtre
  window.addEventListener('resize', fixThemeMode);
  
  // Observer les changements d'attribut sur le html pour détecter les changements de thème
  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
        fixThemeMode();
      }
    });
  });
  
  observer.observe(document.documentElement, { attributes: true });
  
  // Réappliquer après le chargement du DOM
  document.addEventListener('DOMContentLoaded', fixThemeMode);
  
  // Réappliquer périodiquement pour s'assurer que les corrections sont maintenues
  setInterval(fixThemeMode, 2000);
  
  // Réappliquer après un court délai pour attraper le contenu dynamique chargé après le DOM initial
  setTimeout(fixThemeMode, 500);
  setTimeout(fixThemeMode, 1500);
})();
