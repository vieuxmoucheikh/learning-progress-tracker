/**
 * CORRECTEUR UNIFIÉ POUR LE MODE CLAIR SUR MOBILE
 * Combine toutes les approches pour garantir la visibilité des cartes d'apprentissage
 */
(function() {
  // Configuration globale
  const DEBUG = true;
  const LIGHT_TEXT_COLOR = '#000000'; // Noir pur pour contraste maximal
  const LIGHT_CARD_BG = '#ffffff';    // Blanc pur
  const LIGHT_CARD_BORDER = '2px solid #94a3b8'; // Bordure visible
  const CARD_SHADOW = '0 4px 8px rgba(0, 0, 0, 0.15)';
  
  // Log conditionnel
  function debugLog(message) {
    if (DEBUG) console.log(`🔧 [LightModeFixer] ${message}`);
  }
  
  // Détecter si nous sommes en mode clair sur mobile
  function isLightModeOnMobile() {
    const isMobile = window.innerWidth <= 768;
    const isLightMode = document.documentElement.getAttribute('data-theme') === 'light' || 
                       !document.documentElement.classList.contains('dark');
    return isMobile && isLightMode;
  }
  
  // Fonction principale qui combine toutes les approches
  function fixLightModeVisibility() {
    if (!isLightModeOnMobile()) return;
    
    debugLog('Applying comprehensive light mode fixes');
    
    // 1. FIXER LES VARIABLES CSS AU NIVEAU GLOBAL
    fixRootVariables();
    
    // 2. APPLIQUER CSS INLINE DIRECTEMENT SUR TOUTES LES CARTES
    fixAllCards();
    
    // 3. CORRECTIFS SPÉCIFIQUES POUR LES SECTIONS DASHBOARD
    fixDashboardSections();
    
    // 4. AJOUT D'UN STYLE GLOBAL
    injectGlobalStyle();
    
    debugLog('All light mode fixes applied');
  }
  
  // 1. Fixer les variables CSS au niveau racine
  function fixRootVariables() {
    const rootStyle = document.documentElement.style;
    rootStyle.setProperty('--background', '248 250 252');
    rootStyle.setProperty('--foreground', '15 23 42');
    rootStyle.setProperty('--card', '255 255 255');
    rootStyle.setProperty('--card-foreground', '0 0 0');
    rootStyle.setProperty('--border', '226 232 240');
    
    // Fixer l'arrière-plan général
    rootStyle.setProperty('background-color', '#f8fafc', 'important');
    rootStyle.setProperty('color-scheme', 'light', 'important');
  }
  
  // 2. Appliquer des styles directement sur toutes les cartes
  function fixAllCards() {
    // Super-sélecteur qui cible toutes les cartes possibles
    const cardSelectors = [
      // Cartes d'apprentissage spécifiques
      '.learning-item-card',
      '[class*="learning-item-card"]',
      '[class*="learning-card"]',
      
      // Cartes génériques
      '.card',
      '[class*="Card"]',
      '[class*="card"]',
      
      // Sections dashboard
      '[class*="completed-today"] .card',
      '[class*="active-tasks"] .card',
      
      // Onglets spécifiques
      '[role="tabpanel"] .card',
      '[id*="items-tab"] .card',
      '[id*="dashboard"] .card',
      '[id*="panel-"] .card'
    ];
    
    // Sélectionner toutes les cartes
    const cards = document.querySelectorAll(cardSelectors.join(','));
    debugLog(`Found ${cards.length} cards to enhance`);
    
    // Appliquer les styles à chaque carte
    cards.forEach(card => {
      // Style de base
      card.style.setProperty('background-color', LIGHT_CARD_BG, 'important');
      card.style.setProperty('background', LIGHT_CARD_BG, 'important');
      card.style.setProperty('border', LIGHT_CARD_BORDER, 'important');
      card.style.setProperty('box-shadow', CARD_SHADOW, 'important');
      card.style.setProperty('color', LIGHT_TEXT_COLOR, 'important');
      card.style.setProperty('position', 'relative', 'important');
      card.style.setProperty('z-index', '1', 'important');
      
      // Pour les cartes trop petites sur mobile
      card.style.setProperty('padding', '12px', 'important');
      card.style.setProperty('margin-bottom', '12px', 'important');
      
      // Améliorer tous les titres
      const titles = card.querySelectorAll('h1, h2, h3, h4, h5, h6, [class*="title"], [class*="heading"]');
      titles.forEach(title => {
        title.style.setProperty('color', LIGHT_TEXT_COLOR, 'important');
        title.style.setProperty('font-weight', '700', 'important');
        title.style.setProperty('text-shadow', 'none', 'important');
        title.style.setProperty('opacity', '1', 'important');
        title.style.setProperty('visibility', 'visible', 'important');
      });
      
      // Améliorer tous les textes
      const texts = card.querySelectorAll('p, span, [class*="text"], [class*="description"]');
      texts.forEach(text => {
        text.style.setProperty('color', LIGHT_TEXT_COLOR, 'important');
        text.style.setProperty('opacity', '1', 'important');
        text.style.setProperty('visibility', 'visible', 'important');
        text.style.setProperty('font-weight', '500', 'important');
        text.style.setProperty('text-shadow', 'none', 'important');
      });
      
      // Améliorer les badges
      const badges = card.querySelectorAll('[class*="badge"], [class*="tag"]');
      badges.forEach(badge => {
        badge.style.setProperty('background-color', '#e5e7eb', 'important');
        badge.style.setProperty('color', LIGHT_TEXT_COLOR, 'important');
        badge.style.setProperty('border', '1px solid #9ca3af', 'important');
        badge.style.setProperty('font-weight', '600', 'important');
      });
      
      // Améliorer les icônes SVG
      const icons = card.querySelectorAll('svg, [class*="icon"]');
      icons.forEach(icon => {
        icon.style.setProperty('color', LIGHT_TEXT_COLOR, 'important');
        icon.style.setProperty('stroke', LIGHT_TEXT_COLOR, 'important');
        icon.style.setProperty('fill', 'none', 'important');
        icon.style.setProperty('stroke-width', '2.5px', 'important');
      });
    });
  }
  
  // 3. Correctifs spécifiques pour le tableau de bord
  function fixDashboardSections() {
    // Cibler les sections importantes du dashboard
    const sectionSelectors = [
      '[class*="completed-today"]',
      '[class*="active-tasks"]',
      '[class*="dashboard-section"]'
    ];
    
    document.querySelectorAll(sectionSelectors.join(',')).forEach(section => {
      // Améliorer les titres de section
      const sectionTitles = section.querySelectorAll('h1, h2, h3, h4, h5, h6, [class*="heading"], [class*="title"]');
      sectionTitles.forEach(title => {
        title.style.setProperty('color', LIGHT_TEXT_COLOR, 'important');
        title.style.setProperty('font-weight', '700', 'important');
        title.style.setProperty('font-size', '18px', 'important');
        title.style.setProperty('margin-bottom', '12px', 'important');
      });
    });
  }
  
  // 4. Injecter un style global pour les cas non couverts par le JavaScript
  function injectGlobalStyle() {
    // Supprimer l'ancien style s'il existe déjà
    const oldStyle = document.getElementById('unified-light-mode-fix');
    if (oldStyle) {
      oldStyle.remove();
    }
    
    // Créer le nouvel élément style
    const style = document.createElement('style');
    style.id = 'unified-light-mode-fix';
    style.textContent = `
      @media (max-width: 768px) {
        /* Fixer les variables globales */
        html[data-theme="light"], html:not([data-theme="dark"]) {
          --background: 248 250 252 !important;
          --foreground: 15 23 42 !important;
          --card: 255 255 255 !important;
          --card-foreground: 0 0 0 !important;
          background-color: #f8fafc !important;
        }
        
        /* Super sélecteur pour toutes les cartes */
        html[data-theme="light"] .card,
        html[data-theme="light"] [class*="card"],
        html[data-theme="light"] .learning-item-card,
        html[data-theme="light"] [class*="learning-item-card"],
        html:not([data-theme="dark"]) .card,
        html:not([data-theme="dark"]) [class*="card"],
        html:not([data-theme="dark"]) .learning-item-card,
        html:not([data-theme="dark"]) [class*="learning-item-card"] {
          background-color: #ffffff !important;
          border: 2px solid #94a3b8 !important;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15) !important;
          color: #000000 !important;
          position: relative !important;
          z-index: 1 !important;
        }
        
        /* Super sélecteur pour les titres */
        html[data-theme="light"] .card h1, 
        html[data-theme="light"] .card h2,
        html[data-theme="light"] .card h3,
        html[data-theme="light"] .card h4,
        html[data-theme="light"] .card h5,
        html[data-theme="light"] .card h6,
        html[data-theme="light"] .card [class*="title"],
        html[data-theme="light"] .card [class*="heading"],
        html:not([data-theme="dark"]) .card h1,
        html:not([data-theme="dark"]) .card h2,
        html:not([data-theme="dark"]) .card h3,
        html:not([data-theme="dark"]) .card h4,
        html:not([data-theme="dark"]) .card h5,
        html:not([data-theme="dark"]) .card h6,
        html:not([data-theme="dark"]) .card [class*="title"],
        html:not([data-theme="dark"]) .card [class*="heading"] {
          color: #000000 !important;
          font-weight: 700 !important;
          opacity: 1 !important;
          visibility: visible !important;
          text-shadow: none !important;
        }
        
        /* Super sélecteur pour les textes */
        html[data-theme="light"] .card p,
        html[data-theme="light"] .card span,
        html[data-theme="light"] .card [class*="text"],
        html[data-theme="light"] .card [class*="description"],
        html:not([data-theme="dark"]) .card p,
        html:not([data-theme="dark"]) .card span,
        html:not([data-theme="dark"]) .card [class*="text"],
        html:not([data-theme="dark"]) .card [class*="description"] {
          color: #000000 !important;
          font-weight: 500 !important;
          opacity: 1 !important;
          visibility: visible !important;
        }
        
        /* Correction pour les éléments avec préfixe dark: */
        html[data-theme="light"] .dark\\:bg-gray-800,
        html[data-theme="light"] .dark\\:bg-gray-900,
        html[data-theme="light"] .dark\\:bg-black,
        html:not([data-theme="dark"]) .dark\\:bg-gray-800,
        html:not([data-theme="dark"]) .dark\\:bg-gray-900,
        html:not([data-theme="dark"]) .dark\\:bg-black {
          background-color: #ffffff !important;
        }
        
        html[data-theme="light"] .dark\\:text-white,
        html[data-theme="light"] .dark\\:text-gray-100,
        html:not([data-theme="dark"]) .dark\\:text-white,
        html:not([data-theme="dark"]) .dark\\:text-gray-100 {
          color: #000000 !important;
        }
      }
    `;
    
    document.head.appendChild(style);
  }
  
  // Détection de changement de thème
  function setupThemeChangeDetection() {
    // Observer les changements sur l'élément HTML
    const themeObserver = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        if (mutation.attributeName === 'data-theme' || mutation.attributeName === 'class') {
          fixLightModeVisibility();
        }
      });
    });
    
    themeObserver.observe(document.documentElement, { attributes: true });
    
    // Observer les changements généraux du DOM
    const contentObserver = new MutationObserver(() => {
      if (isLightModeOnMobile()) {
        fixLightModeVisibility();
      }
    });
    
    contentObserver.observe(document.body, { childList: true, subtree: true });
    
    // Observer les onglets et autres changements interactifs
    document.addEventListener('click', e => {
      if (e.target.closest('[role="tab"]') || e.target.closest('button')) {
        if (isLightModeOnMobile()) {
          setTimeout(fixLightModeVisibility, 100);
          setTimeout(fixLightModeVisibility, 300);
        }
      }
    });
  }
  
  // Initialisation au chargement
  function initialize() {
    debugLog('Initializing light mode fixer');
    
    // Appliquer immédiatement
    fixLightModeVisibility();
    
    // Mettre en place la détection de changement
    setupThemeChangeDetection();
    
    // Réappliquer lors du redimensionnement
    window.addEventListener('resize', fixLightModeVisibility);
    
    // Appliquer après chargement complet
    window.addEventListener('load', fixLightModeVisibility);
    
    // Programme d'application périodique (toutes les 500ms pendant 5s)
    let attempts = 0;
    const interval = setInterval(() => {
      if (isLightModeOnMobile()) {
        fixLightModeVisibility();
      }
      attempts++;
      if (attempts >= 10) {
        clearInterval(interval);
      }
    }, 500);
    
    debugLog('Initialization complete');
  }
  
  // Démarrer
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }
})();
