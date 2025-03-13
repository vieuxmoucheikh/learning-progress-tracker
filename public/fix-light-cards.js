/**
 * FIX POUR CARTES EN MODE CLAIR SUR MOBILE
 * Applique directement des styles aux cartes pour garantir leur visibilité
 */
(function() {
  // Fonction principale pour fixer les cartes
  function fixLightModeCards() {
    // Vérifier si on est sur mobile et en mode clair
    const isMobile = window.innerWidth <= 768;
    const isLightMode = document.documentElement.getAttribute('data-theme') === 'light' || 
                       !document.documentElement.classList.contains('dark');
    
    if (isMobile && isLightMode) {
      console.log("🛠️ Fixing light mode cards on mobile...");
      
      // Sélecteurs ciblant toutes les cartes possibles
      const cardSelectors = [
        // Cartes d'apprentissage
        '.learning-item-card',
        '[class*="learning-item-card"]',
        '[class*="learning-card"]',
        
        // Tous types de cartes
        '.card', 
        '[class*="card"]',
        
        // Sections spécifiques
        '[class*="completed-today"] .card',
        '[class*="active-tasks"] .card',
        
        // Onglets et panneaux
        '[role="tabpanel"] .card',
        '[id*="items-tab"] .card',
        '[id*="dashboard"] .card'
      ];
      
      // Trouver toutes les cartes avec ces sélecteurs
      const allCards = document.querySelectorAll(cardSelectors.join(', '));
      console.log(`Found ${allCards.length} cards to fix`);
      
      // Appliquer les styles directement à chaque carte
      allCards.forEach(card => {
        // Style de base - fond blanc et bordure visible
        card.style.backgroundColor = '#ffffff';
        card.style.background = '#ffffff';
        card.style.border = '2px solid #94a3b8'; // slate-400
        card.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.15)';
        card.style.color = '#000000';
        card.style.position = 'relative';
        card.style.zIndex = '1';
        
        // Trouver et styler les titres
        const titles = card.querySelectorAll('h1, h2, h3, h4, h5, h6, [class*="title"], [class*="heading"]');
        titles.forEach(title => {
          title.style.color = '#000000'; // Noir pur
          title.style.fontWeight = '700';
          title.style.textShadow = 'none';
          title.style.opacity = '1';
          title.style.visibility = 'visible';
        });
        
        // Trouver et styler les paragraphes et textes
        const texts = card.querySelectorAll('p, [class*="text"], [class*="description"], div:not([class*="badge"]):not([class*="tag"])');
        texts.forEach(text => {
          text.style.color = '#000000'; // Noir pur
          text.style.opacity = '1';
          text.style.visibility = 'visible';
          text.style.fontWeight = '500';
        });
        
        // Trouver et styler les badges et tags
        const badges = card.querySelectorAll('[class*="badge"], [class*="tag"]');
        badges.forEach(badge => {
          badge.style.backgroundColor = '#e5e7eb'; // gray-200
          badge.style.color = '#000000'; // Noir pur
          badge.style.border = '1px solid #9ca3af'; // gray-400
          badge.style.fontWeight = '600';
        });
        
        // Trouver et styler les SVGs et icônes
        const icons = card.querySelectorAll('svg, [class*="icon"]');
        icons.forEach(icon => {
          icon.style.color = '#000000'; // Noir pur
          icon.style.stroke = '#000000'; // Noir pur
          icon.style.strokeWidth = '2.5px';
          icon.style.fill = 'none';
        });
      });
      
      // Sections spécifiques
      const sectionSelectors = [
        '[class*="completed-today"]',
        '[class*="active-tasks"]'
      ];
      
      document.querySelectorAll(sectionSelectors.join(', ')).forEach(section => {
        // Trouver et styler les titres de section
        const sectionTitles = section.querySelectorAll('h3, [class*="heading"]');
        sectionTitles.forEach(title => {
          title.style.color = '#000000'; // Noir pur
          title.style.fontWeight = '700';
        });
        
        // Trouver et styler les cartes dans ces sections
        const sectionCards = section.querySelectorAll('.card, [class*="card"]');
        sectionCards.forEach(card => {
          card.style.backgroundColor = '#ffffff';
          card.style.border = '2px solid #94a3b8'; // slate-400
          card.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.15)';
        });
      });
      
      // Classes dark: overrides
      const darkClassElements = document.querySelectorAll('.dark\\:bg-gray-800, .dark\\:bg-black, .dark\\:bg-gray-900');
      darkClassElements.forEach(el => {
        if (isLightMode) {
          el.style.backgroundColor = '#ffffff';
        }
      });
      
      const darkTextElements = document.querySelectorAll('.dark\\:text-white, .dark\\:text-gray-100, .dark\\:text-gray-200');
      darkTextElements.forEach(el => {
        if (isLightMode) {
          el.style.color = '#000000';
        }
      });
    }
  }
  
  // Exécuter immédiatement
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fixLightModeCards);
  } else {
    fixLightModeCards();
  }
  
  // Exécuter après le chargement complet
  window.addEventListener('load', () => {
    fixLightModeCards();
    // Réessayer plusieurs fois pour s'assurer que tout est correctement appliqué
    setTimeout(fixLightModeCards, 500);
    setTimeout(fixLightModeCards, 1000);
    setTimeout(fixLightModeCards, 2000);
  });
  
  // Observer les changements de thème
  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      if (mutation.attributeName === 'data-theme' || mutation.attributeName === 'class') {
        fixLightModeCards();
      }
    });
  });
  
  observer.observe(document.documentElement, { attributes: true });
  
  // Observer les changements DOM pour les nouvelles cartes
  const contentObserver = new MutationObserver(() => {
    const isMobile = window.innerWidth <= 768;
    const isLightMode = document.documentElement.getAttribute('data-theme') === 'light' || 
                        !document.documentElement.classList.contains('dark');
    
    if (isMobile && isLightMode) {
      fixLightModeCards();
    }
  });
  
  contentObserver.observe(document.body, { childList: true, subtree: true });
  
  // Réappliquer sur resize
  window.addEventListener('resize', fixLightModeCards);
  
  // Appliquer lors des changements d'onglets
  document.addEventListener('click', e => {
    if (e.target.closest('[role="tab"]') || e.target.closest('button')) {
      setTimeout(fixLightModeCards, 100);
      setTimeout(fixLightModeCards, 500);
    }
  });
})();
