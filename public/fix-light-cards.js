/**
 * Script amélioré pour la visibilité des cartes d'apprentissage en mode clair sur mobile
 */
(function() {
  // Détection de l'environnement mobile et du mode clair
  const isMobile = window.innerWidth <= 768;
  
  function isLightMode() {
    return document.documentElement.getAttribute('data-theme') === 'light' || 
           !document.documentElement.classList.contains('dark');
  }
  
  // Fonction principale pour améliorer le contraste des cartes
  function enhanceCardContrast() {
    if (isMobile && isLightMode()) {
      console.log('Applying light mode card fixes for mobile...');
      
      // Sélecteurs pour cibler tous les types de cartes d'apprentissage
      const cardSelectors = [
        '.learning-item-card', 
        '[class*="learning-item-card"]',
        '[class*="learning-card"]',
        '[class*="dashboard"] .card',
        '[class*="completed-today"] .card',
        '[class*="active-tasks"] .card',
        '[role="tabpanel"][id*="items"] .card',
        '[role="tabpanel"][aria-labelledby*="items"] .card',
        // Sélecteurs plus ciblés pour les onglets spécifiques
        '[data-state="active"][role="tabpanel"] .card',
        '[id*="dashboard-tab"] .card',
        '[id*="items-tab"] .card'
      ];
      
      // Trouver toutes les cartes avec les sélecteurs combinés
      const allCards = document.querySelectorAll(cardSelectors.join(', '));
      
      // Appliquer les styles améliorés à chaque carte
      allCards.forEach(card => {
        // Styles de base pour la carte
        Object.assign(card.style, {
          backgroundColor: '#ffffff',
          border: '1px solid #d1d5db',
          boxShadow: '0 2px 5px rgba(0, 0, 0, 0.1)',
          color: '#374151'
        });
        
        // Améliorer les titres
        const titles = card.querySelectorAll('h3, h4, .card-title, [class*="title"], [class*="heading"]');
        titles.forEach(title => {
          Object.assign(title.style, {
            color: '#111827',
            fontWeight: '600',
            textShadow: 'none'
          });
        });
        
        // Améliorer les paragraphes et descriptions
        const paragraphs = card.querySelectorAll('p, .card-description, [class*="description"], [class*="text"], [class*="organize-text"]');
        paragraphs.forEach(p => {
          Object.assign(p.style, {
            color: '#374151',
            fontWeight: '400',
            opacity: '1',
            visibility: 'visible'
          });
        });
        
        // Améliorer les badges et tags
        const badges = card.querySelectorAll('.badge, [class*="badge"], [class*="tag"], .card-tags span');
        badges.forEach(badge => {
          Object.assign(badge.style, {
            backgroundColor: '#f3f4f6',
            color: '#1f2937',
            border: '1px solid #d1d5db',
            fontWeight: '500'
          });
        });
        
        // Améliorer les icônes
        const icons = card.querySelectorAll('svg, [class*="icon"], [class*="lucide"]');
        icons.forEach(icon => {
          Object.assign(icon.style, {
            color: '#4b5563',
            fill: 'none',
            stroke: '#4b5563'
          });
        });
        
        // Améliorer les boutons
        const buttons = card.querySelectorAll('button, [role="button"]');
        buttons.forEach(button => {
          Object.assign(button.style, {
            color: '#4b5563',
            backgroundColor: '#f9fafb',
            border: '1px solid #e5e7eb'
          });
        });
      });

      // Ciblage spécifique pour les cases "Completed Today" et "Active Tasks"
      const dashboardSections = [
        '[class*="completed-today"]',
        '[class*="active-tasks"]',
        '[class*="dashboard"] [class*="section"]'
      ];

      document.querySelectorAll(dashboardSections.join(', ')).forEach(section => {
        // Améliorer les titres de section
        const sectionTitles = section.querySelectorAll('h3, h4, [class*="heading"], [class*="title"]');
        sectionTitles.forEach(title => {
          Object.assign(title.style, {
            color: '#111827',
            fontWeight: '600'
          });
        });

        // Améliorer les cartes à l'intérieur des sections
        const sectionCards = section.querySelectorAll('.card, [class*="card"]');
        sectionCards.forEach(card => {
          Object.assign(card.style, {
            backgroundColor: '#ffffff',
            border: '1px solid #d1d5db',
            boxShadow: '0 2px 5px rgba(0, 0, 0, 0.1)'
          });
          
          // Améliorer le texte dans ces cartes
          const cardText = card.querySelectorAll('p, [class*="text"], [class*="description"]');
          cardText.forEach(text => {
            Object.assign(text.style, {
              color: '#374151',
              opacity: '1',
              visibility: 'visible'
            });
          });
        });
      });
    }
  }
  
  // Fonction pour appliquer les styles au chargement et au changement de thème
  function setupStyleFixes() {
    // Appliquer les styles immédiatement
    enhanceCardContrast();
    
    // Observer les changements du DOM pour appliquer les styles aux nouveaux éléments
    const observer = new MutationObserver(() => {
      if (isMobile && isLightMode()) {
        enhanceCardContrast();
      }
    });
    
    // Observer le document entier pour les changements
    observer.observe(document.body, { 
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'data-theme', 'data-state']
    });
    
    // Observer les changements d'attributs sur le document HTML
    const themeObserver = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        if (mutation.attributeName === 'data-theme' || 
            mutation.attributeName === 'class') {
          enhanceCardContrast();
        }
      });
    });
    
    themeObserver.observe(document.documentElement, { attributes: true });
    
    // Réappliquer les styles lors du changement de taille d'écran
    window.addEventListener('resize', () => {
      if (window.innerWidth <= 768 && isLightMode()) {
        enhanceCardContrast();
      }
    });
    
    // Observer les changements d'onglets
    document.querySelectorAll('[role="tab"]').forEach(tab => {
      tab.addEventListener('click', () => {
        // Attendre un peu que l'onglet se charge
        setTimeout(enhanceCardContrast, 100);
        setTimeout(enhanceCardContrast, 300);
      });
    });
  }
  
  // Initialiser lors du chargement du DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupStyleFixes);
  } else {
    setupStyleFixes();
  }
  
  // Réappliquer après le chargement complet de la page
  window.addEventListener('load', () => {
    enhanceCardContrast();
    // Ré-appliquer après un court délai pour s'assurer que tout est chargé
    setTimeout(enhanceCardContrast, 500);
  });
  
  // Appliquer toutes les 500ms pendant 5 secondes pour s'assurer que ça fonctionne
  let attempts = 0;
  const interval = setInterval(() => {
    enhanceCardContrast();
    attempts++;
    if (attempts >= 10) {
      clearInterval(interval);
    }
  }, 500);
})();
