/**
 * Solution d'urgence extrême qui force les cartes à être visibles en mode clair sur mobile
 */
(function() {
  // Configuration
  const DEBUG = true;
  const CRITICAL_DELAY = 100;
  const REPEAT_INTERVAL = 1000;
  const MAX_ATTEMPTS = 5;
  
  // Log conditionnel
  function log(message) {
    if (DEBUG) console.log(`🔧 [CardFixer] ${message}`);
  }

  // Fonction principale qui applique directement des styles sur chaque carte
  function forceCardVisibility() {
    // Vérifier si nous sommes en mode mobile et en mode clair
    const isMobile = window.innerWidth <= 768;
    const isLightMode = document.documentElement.getAttribute('data-theme') === 'light' || 
                       !document.documentElement.classList.contains('dark');
    
    if (isMobile && isLightMode) {
      log("EMERGENCY light mode card fixes - PRIORITY OVERRIDE");
      
      // 1. TROUVER TOUTES LES CARTES POSSIBLES
      const allCardSelectors = [
        // Cartes d'apprentissage
        '.learning-item-card',
        '[class*="learning-item-card"]',
        '[class*="learning-card"]',
        
        // Dashboard sections
        '[class*="completed-today"] .card',
        '[class*="active-tasks"] .card',
        
        // Cartes dans les sections à onglets
        '[role="tabpanel"] .card',
        '[id*="items-tab"] .card',
        '[id*="dashboard"] .card',
        
        // Cartes génériques
        'div.card',
        '[class*="card"]',
        
        // Pour les cartes avec des classes très spécifiques
        '[data-state="active"] .card'
      ];
      
      // Trouver toutes les cartes
      const allCards = document.querySelectorAll(allCardSelectors.join(', '));
      log(`Found ${allCards.length} cards to enhance`);
      
      // 2. APPLIQUER DES STYLES DIRECTS
      allCards.forEach(card => {
        // STYLE DE CARTE DE BASE
        card.style.setProperty('background-color', '#ffffff', 'important');
        card.style.setProperty('background', '#ffffff', 'important');
        card.style.setProperty('border', '2px solid #94a3b8', 'important');
        card.style.setProperty('box-shadow', '0 4px 8px rgba(0, 0, 0, 0.15)', 'important');
        card.style.setProperty('color', '#000000', 'important');
        card.style.setProperty('position', 'relative', 'important');
        card.style.setProperty('z-index', '2', 'important');
        card.style.setProperty('padding', '12px', 'important');
        card.style.setProperty('margin-bottom', '12px', 'important');
        
        // TITRES
        const titles = card.querySelectorAll('h1, h2, h3, h4, h5, h6, [class*="title"], [class*="heading"]');
        titles.forEach(heading => {
          heading.style.setProperty('color', '#000000', 'important');
          heading.style.setProperty('font-weight', '700', 'important');
          heading.style.setProperty('opacity', '1', 'important');
          heading.style.setProperty('visibility', 'visible', 'important');
          heading.style.setProperty('text-shadow', 'none', 'important');
        });
        
        // PARAGRAPHES ET TEXTES
        const texts = card.querySelectorAll('p, span:not([class*="badge"]), [class*="text"], [class*="description"]');
        texts.forEach(text => {
          text.style.setProperty('color', '#000000', 'important');
          text.style.setProperty('font-weight', '500', 'important');
          text.style.setProperty('opacity', '1', 'important');
          text.style.setProperty('visibility', 'visible', 'important');
          text.style.setProperty('text-shadow', 'none', 'important');
        });
        
        // BADGES ET ÉTIQUETTES
        const badges = card.querySelectorAll('[class*="badge"], [class*="tag"], .tag');
        badges.forEach(badge => {
          badge.style.setProperty('background-color', '#e5e7eb', 'important');
          badge.style.setProperty('color', '#000000', 'important');
          badge.style.setProperty('border', '1px solid #64748b', 'important');
          badge.style.setProperty('font-weight', '600', 'important');
        });
        
        // ICÔNES SVG
        const svgs = card.querySelectorAll('svg, [class*="icon"]');
        svgs.forEach(svg => {
          svg.style.setProperty('color', '#000000', 'important');
          svg.style.setProperty('stroke', '#000000', 'important');
          svg.style.setProperty('fill', 'none', 'important');
          svg.style.setProperty('stroke-width', '2.5px', 'important');
        });
        
        // BOUTONS
        const buttons = card.querySelectorAll('button, [role="button"]');
        buttons.forEach(button => {
          button.style.setProperty('background-color', '#f3f4f6', 'important');
          button.style.setProperty('color', '#000000', 'important');
          button.style.setProperty('border', '1px solid #64748b', 'important');
          button.style.setProperty('font-weight', '600', 'important');
          button.style.setProperty('text-shadow', 'none', 'important');
        });
      });
      
      // 3. CIBLAGE SPÉCIFIQUE POUR LES SECTIONS DASHBOARD
      const dashboardSections = document.querySelectorAll('[class*="completed-today"], [class*="active-tasks"], [class*="dashboard-section"]');
      dashboardSections.forEach(section => {
        // Titres de section
        const sectionTitles = section.querySelectorAll('h1, h2, h3, h4, h5, h6, [class*="title"], [class*="heading"]');
        sectionTitles.forEach(heading => {
          heading.style.setProperty('color', '#000000', 'important');
          heading.style.setProperty('font-weight', '700', 'important');
          heading.style.setProperty('font-size', '18px', 'important');
        });
        
        // Cartes dans les sections
        const sectionCards = section.querySelectorAll('.card, [class*="card"]');
        sectionCards.forEach(card => {
          card.style.setProperty('background-color', '#ffffff', 'important');
          card.style.setProperty('border', '2px solid #94a3b8', 'important');
          card.style.setProperty('box-shadow', '0 4px 8px rgba(0, 0, 0, 0.15)', 'important');
        });
        
        // Textes dans les sections
        const sectionTexts = section.querySelectorAll('p, [class*="text"], [class*="description"]');
        sectionTexts.forEach(text => {
          text.style.setProperty('color', '#000000', 'important');
          text.style.setProperty('opacity', '1', 'important');
        });
      });
      
      // 4. CORRIGER LES ÉLÉMENTS AVEC PRÉFIXE DARK: EN MODE CLAIR
      const darkPrefixedElements = document.querySelectorAll(
        '.dark\\:bg-gray-800, .dark\\:bg-black, .dark\\:bg-gray-900, ' +
        '.dark\\:text-white, .dark\\:text-gray-100, .dark\\:text-gray-200'
      );
      
      darkPrefixedElements.forEach(el => {
        // Obtenir les classes de l'élément
        const classList = el.className.split(' ');
        
        // Vérifier chaque classe
        classList.forEach(className => {
          if (className.startsWith('dark:bg-')) {
            el.style.setProperty('background-color', '#ffffff', 'important');
          }
          else if (className.startsWith('dark:text-')) {
            el.style.setProperty('color', '#000000', 'important');
          }
        });
      });
      
      return true; // Succès
    }
    
    return false; // Non appliqué
  }

  // Fonction d'attente avant de réessayer
  function tryWithDelay(delay, maxAttempts = 1) {
    let attempts = 0;
    
    function attempt() {
      if (attempts >= maxAttempts) return;
      
      const success = forceCardVisibility();
      attempts++;
      
      if (!success && attempts < maxAttempts) {
        setTimeout(attempt, delay);
      }
    }
    
    attempt();
  }

  // STRATÉGIE D'EXÉCUTION

  // 1. Exécution immédiate
  forceCardVisibility();

  // 2. Exécution après un court délai (pour le contenu dynamique)
  setTimeout(() => forceCardVisibility(), CRITICAL_DELAY);
  
  // 3. Exécution après chargement du DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => tryWithDelay(REPEAT_INTERVAL, 3));
  }
  
  // 4. Exécution après chargement complet de la page
  window.addEventListener('load', () => tryWithDelay(REPEAT_INTERVAL, 3));
  
  // 5. Observer les changements de thème
  const themeObserver = new MutationObserver(mutations => {
    for (const mutation of mutations) {
      if (mutation.attributeName === 'data-theme' || mutation.attributeName === 'class') {
        forceCardVisibility();
      }
    }
  });
  
  themeObserver.observe(document.documentElement, { attributes: true });
  
  // 6. Observer les modifications du DOM
  const contentObserver = new MutationObserver(() => {
    const isMobile = window.innerWidth <= 768;
    const isLightMode = document.documentElement.getAttribute('data-theme') === 'light' || 
                       !document.documentElement.classList.contains('dark');
    
    if (isMobile && isLightMode) {
      tryWithDelay(100, 1);
    }
  });
  
  contentObserver.observe(document.body, { childList: true, subtree: true });
  
  // 7. Réagir aux clics (changements d'onglet, etc.)
  document.addEventListener('click', e => {
    // Si c'est un onglet, un bouton ou un lien
    if (e.target.matches('[role="tab"], button, a, [role="link"]')) {
      setTimeout(forceCardVisibility, 100);
      setTimeout(forceCardVisibility, 300);
    }
  });
  
  // 8. Réagir aux redimensionnements
  window.addEventListener('resize', forceCardVisibility);
  
  // 9. Application récurrente pour s'assurer du résultat
  let attempts = 0;
  const interval = setInterval(() => {
    forceCardVisibility();
    attempts++;
    
    if (attempts >= MAX_ATTEMPTS) {
      clearInterval(interval);
    }
  }, REPEAT_INTERVAL);

  log("Card fixer initialized with multiple reinforcement strategies");
})();
