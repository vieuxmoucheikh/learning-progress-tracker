/**
 * Dashboard Layout Fix - Ensure widgets have equal heights on desktop
 * This script specifically makes the Active Tasks widget match the Calendar height
 */

(function() {
  // Fonction principale pour égaliser les hauteurs
  function equalizeWidgetHeights() {
    // Ne pas appliquer sur mobile
    if (window.innerWidth < 768) return;
    
    // Identifier les éléments par différents sélecteurs possibles
    function findElements(selectors) {
      for (const selector of selectors) {
        try {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) return Array.from(elements);
        } catch (e) {
          // Ignorer les erreurs de sélecteur invalide
          console.debug('Sélecteur non supporté:', selector);
        }
      }
      return [];
    }
    
    // Sélecteurs potentiels pour le widget calendrier
    const calendarSelectors = [
      '.calendar-widget',
      '[class*="calendar-widget"]',
      '[class*="CalendarWidget"]',
      '[class*="Calendar"]',
      '.rdp-month',
      '[class*="calendar"]',
      '.react-datepicker',
      'div:has(.rdp)',
      'div:has(.react-datepicker)'
    ];
    
    // Sélecteurs potentiels pour le widget des tâches actives
    const activeTasksSelectors = [
      '.active-tasks-widget',
      '[class*="active-tasks"]',
      '[class*="ActiveTasks"]',
      'div.card:has(h2:contains("Active Tasks"))',
      'div.card:has(h3:contains("Active Tasks"))',
      'div:has(> h2:contains("Active"))',
      'div:has(> h3:contains("Active"))',
      'div.rounded-lg:has(h2:contains("Active"))',
      'div.rounded-xl:has(h3:contains("Active"))'
    ];
    
    // Trouver tous les conteneurs de widgets
    const widgetContainerSelectors = [
      '.dashboard-widgets-container',
      '.dashboard-top-row',
      '.grid.grid-cols-1.md\\:grid-cols-2',
      '.grid.grid-cols-1.md\\:grid-cols-3',
      '[class*="dashboard"] [class*="grid"]',
      '[class*="dashboard"] > div > div'
    ];
    
    // Rechercher les widgets
    const calendarElements = findElements(calendarSelectors);
    const activeTasksElements = findElements(activeTasksSelectors);
    const containerElements = findElements(widgetContainerSelectors);
    
    // Définir la hauteur minimale par défaut si aucun calendrier n'est trouvé
    let targetHeight = 380; // px
    
    // Si un calendrier est trouvé, utiliser sa hauteur
    if (calendarElements.length > 0) {
      const calendarWidget = calendarElements[0];
      const computedHeight = calendarWidget.offsetHeight;
      
      if (computedHeight > 100) { // Ignorer les valeurs trop petites
        targetHeight = computedHeight;
      }
    }
    
    // Appliquer la hauteur aux widgets de tâches actives
    if (activeTasksElements.length > 0) {
      activeTasksElements.forEach(widget => {
        widget.style.height = `${targetHeight}px`;
        widget.style.display = 'flex';
        widget.style.flexDirection = 'column';
        
        // Trouver l'en-tête et le contenu
        const header = widget.querySelector('h2, h3');
        const content = widget.querySelector('[class*="grid"], [class*="list"]');
        
        if (header && content) {
          content.style.flex = '1';
          content.style.overflowY = 'auto';
          content.style.maxHeight = `calc(100% - ${header.offsetHeight}px)`;
        } else if (content) {
          content.style.flex = '1';
          content.style.overflowY = 'auto';
          content.style.maxHeight = 'calc(100% - 50px)';
        }
      });
    }
    
    // Assurer que tous les conteneurs de widgets ont une hauteur égale
    if (containerElements.length > 0) {
      containerElements.forEach(container => {
        const children = Array.from(container.children);
        
        // Appliquer la même hauteur à tous les enfants directs
        children.forEach(child => {
          child.style.height = `${targetHeight}px`;
          
          // Si c'est une carte, s'assurer qu'elle utilise tout l'espace
          const cards = child.querySelectorAll('.card, [class*="Card"], .rounded-lg, .rounded-xl');
          cards.forEach(card => {
            card.style.height = '100%';
          });
        });
      });
    }
  }
  
  // Appliquer immédiatement puis observer les changements de DOM
  function initialize() {
    equalizeWidgetHeights();
    
    // Observer les changements dans le DOM pour réappliquer si nécessaire
    const observer = new MutationObserver((mutations) => {
      let shouldUpdate = false;
      
      for (const mutation of mutations) {
        if (mutation.type === 'childList' || 
            (mutation.type === 'attributes' && 
             (mutation.attributeName === 'class' || mutation.attributeName === 'style'))) {
          shouldUpdate = true;
          break;
        }
      }
      
      if (shouldUpdate) {
        equalizeWidgetHeights();
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style']
    });
    
    // Aussi appliquer au redimensionnement de la fenêtre
    window.addEventListener('resize', equalizeWidgetHeights);
    
    // Et réappliquer périodiquement pour s'assurer de la cohérence
    setInterval(equalizeWidgetHeights, 2000);
  }
  
  // Exécuter quand le DOM est prêt
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }
  
  // Exposer la fonction pour une utilisation externe
  window.equalizeWidgetHeights = equalizeWidgetHeights;
})();
