/**
 * Solution d'urgence extrême qui force les cartes à être visibles en mode clair sur mobile
 */
(function() {
  // Fonction principale qui applique directement des styles sur chaque carte
  function forceCardVisibility() {
    // Vérifier si nous sommes en mode mobile et en mode clair
    const isMobile = window.innerWidth <= 768;
    const isLightMode = document.documentElement.getAttribute('data-theme') === 'light' || 
                       !document.documentElement.classList.contains('dark');
    
    if (isMobile && isLightMode) {
      console.log("🔧 Applying EMERGENCY light mode card fixes");
      
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
        
        // Sélecteurs ultra-génériques
        'div.card'
      ];
      
      // Trouver toutes les cartes
      const allCards = document.querySelectorAll(allCardSelectors.join(', '));
      
      // 2. APPLIQUER DES STYLES DIRECTS AVEC style.setProperty pour forcer la priorité maximale
      allCards.forEach(card => {
        // Réinitialiser d'abord tous les styles existants
        card.style.cssText = "";
        
        // STYLE DE CARTE DE BASE
        card.style.setProperty('background-color', '#ffffff', 'important');
        card.style.setProperty('background', '#ffffff', 'important');
        card.style.setProperty('border', '2px solid #d1d5db', 'important');
        card.style.setProperty('box-shadow', '0 4px 8px rgba(0, 0, 0, 0.12)', 'important');
        card.style.setProperty('color', '#1f2937', 'important');
        card.style.setProperty('position', 'relative', 'important');
        card.style.setProperty('z-index', '1', 'important');
        
        // STYLE DE TEXTE
        // Titres
        card.querySelectorAll('h1, h2, h3, h4, h5, h6, [class*="title"], [class*="heading"]').forEach(heading => {
          heading.style.setProperty('color', '#000000', 'important');
          heading.style.setProperty('font-weight', '700', 'important');
          heading.style.setProperty('opacity', '1', 'important');
          heading.style.setProperty('visibility', 'visible', 'important');
          heading.style.setProperty('text-shadow', 'none', 'important');
        });
        
        // Paragraphes et textes
        card.querySelectorAll('p, span, [class*="text"], [class*="description"]').forEach(text => {
          text.style.setProperty('color', '#111827', 'important');
          text.style.setProperty('font-weight', '500', 'important');
          text.style.setProperty('opacity', '1', 'important');
          text.style.setProperty('visibility', 'visible', 'important');
          text.style.setProperty('text-shadow', 'none', 'important');
        });
        
        // Badges et étiquettes
        card.querySelectorAll('[class*="badge"], [class*="tag"]').forEach(badge => {
          badge.style.setProperty('background-color', '#e5e7eb', 'important');
          badge.style.setProperty('color', '#000000', 'important');
          badge.style.setProperty('border', '1px solid #9ca3af', 'important');
          badge.style.setProperty('font-weight', '600', 'important');
        });
        
        // Icônes SVG
        card.querySelectorAll('svg').forEach(svg => {
          svg.style.setProperty('color', '#000000', 'important');
          svg.style.setProperty('stroke', '#000000', 'important');
          svg.style.setProperty('fill', 'none', 'important');
          svg.style.setProperty('stroke-width', '2px', 'important');
        });
        
        // Boutons
        card.querySelectorAll('button, [role="button"]').forEach(button => {
          button.style.setProperty('background-color', '#f3f4f6', 'important');
          button.style.setProperty('color', '#000000', 'important');
          button.style.setProperty('border', '1px solid #9ca3af', 'important');
          button.style.setProperty('font-weight', '600', 'important');
        });
      });
      
      // 3. CIBLAGE SPÉCIFIQUE POUR LES SECTIONS DASHBOARD
      const dashboardSections = document.querySelectorAll('[class*="completed-today"], [class*="active-tasks"]');
      dashboardSections.forEach(section => {
        // Titres de section
        section.querySelectorAll('h1, h2, h3, h4, h5, h6, [class*="title"], [class*="heading"]').forEach(heading => {
          heading.style.setProperty('color', '#000000', 'important');
          heading.style.setProperty('font-weight', '700', 'important');
        });
        
        // Cartes dans les sections
        section.querySelectorAll('.card, [class*="card"]').forEach(card => {
          card.style.setProperty('background-color', '#ffffff', 'important');
          card.style.setProperty('border', '2px solid #d1d5db', 'important');
          card.style.setProperty('box-shadow', '0 4px 8px rgba(0, 0, 0, 0.12)', 'important');
        });
      });
    }
  }

  // Exécuter au chargement
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', forceCardVisibility);
  } else {
    forceCardVisibility();
  }
  
  // Exécuter après le chargement complet
  window.addEventListener('load', forceCardVisibility);
  
  // Observer les changements de thème
  const themeObserver = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      if (mutation.attributeName === 'data-theme' || mutation.attributeName === 'class') {
        forceCardVisibility();
      }
    });
  });
  
  themeObserver.observe(document.documentElement, { attributes: true });
  
  // Observer les ajouts au DOM
  const contentObserver = new MutationObserver(() => {
    const isMobile = window.innerWidth <= 768;
    const isLightMode = document.documentElement.getAttribute('data-theme') === 'light' || 
                       !document.documentElement.classList.contains('dark');
    
    if (isMobile && isLightMode) {
      forceCardVisibility();
    }
  });
  
  contentObserver.observe(document.body, { childList: true, subtree: true });
  
  // Exécuter lors du changement d'onglet
  document.addEventListener('click', e => {
    if (e.target.matches('[role="tab"], button')) {
      setTimeout(forceCardVisibility, 100);
      setTimeout(forceCardVisibility, 300);
    }
  });
  
  // Exécuter lors du redimensionnement
  window.addEventListener('resize', forceCardVisibility);
  
  // Forcer l'exécution à intervalles réguliers pendant 10 secondes
  let attempts = 0;
  const interval = setInterval(() => {
    forceCardVisibility();
    attempts++;
    
    if (attempts >= 20) {
      clearInterval(interval);
    }
  }, 500);
})();
