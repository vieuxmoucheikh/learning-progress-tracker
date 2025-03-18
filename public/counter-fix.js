/**
 * Counter Fix - Ensure top corner counters are always visible
 * This script applies critical styles to the activity counters in the top-right corner
 */

(function() {
  function applyCounterStyles() {
    // Create a style element
    const styleEl = document.createElement('style');
    styleEl.id = 'top-corner-counters-fix';
    
    // Apply ultra-specific styles targeting the top corner counters
    styleEl.textContent = `
      /* Ultra-specific styles for Active Tasks and Completed Today counters in dark mode */
      html[data-theme="dark"] header .flex.items-center span.text-xs.font-medium,
      html[data-theme="dark"] nav .flex.items-center span.text-xs.font-medium,
      html[data-theme="dark"] div[class*="header"] .flex.items-center span.text-xs.font-medium,
      html[data-theme="dark"] div[class*="navbar"] .flex.items-center span.text-xs.font-medium,
      html[data-theme="dark"] div[class*="top-bar"] .flex.items-center span.text-xs.font-medium,
      html[data-theme="dark"] div.flex.items-center.justify-end span.text-xs.font-medium {
        color: white !important;
        background-color: #0f172a !important;
        font-weight: 700 !important;
        padding: 5px 10px !important;
        border: 2px solid !important;
        border-radius: 9999px !important;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5) !important;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.4) !important;
        margin: 0 4px !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        min-width: 28px !important;
        height: auto !important;
        line-height: 1 !important;
        position: relative !important;
        z-index: 50 !important;
      }
      
      /* Active Tasks - Blue counter */
      html[data-theme="dark"] header .flex.items-center span.text-xs.font-medium.bg-blue-500\\/10,
      html[data-theme="dark"] nav .flex.items-center span.text-xs.font-medium.bg-blue-500\\/10,
      html[data-theme="dark"] div[class*="header"] .flex.items-center span.text-xs.font-medium.bg-blue-500\\/10,
      html[data-theme="dark"] div[class*="navbar"] .flex.items-center span.text-xs.font-medium.bg-blue-500\\/10,
      html[data-theme="dark"] div[class*="top-bar"] .flex.items-center span.text-xs.font-medium.bg-blue-500\\/10,
      html[data-theme="dark"] div.flex.items-center.justify-end span.text-xs.font-medium.bg-blue-500\\/10 {
        background-color: rgb(37, 99, 235) !important;
        border-color: #60a5fa !important;
      }
      
      /* Completed Today - Green counter */
      html[data-theme="dark"] header .flex.items-center span.text-xs.font-medium.bg-green-500\\/10,
      html[data-theme="dark"] nav .flex.items-center span.text-xs.font-medium.bg-green-500\\/10,
      html[data-theme="dark"] div[class*="header"] .flex.items-center span.text-xs.font-medium.bg-green-500\\/10,
      html[data-theme="dark"] div[class*="navbar"] .flex.items-center span.text-xs.font-medium.bg-green-500\\/10,
      html[data-theme="dark"] div[class*="top-bar"] .flex.items-center span.text-xs.font-medium.bg-green-500\\/10,
      html[data-theme="dark"] div.flex.items-center.justify-end span.text-xs.font-medium.bg-green-500\\/10 {
        background-color: rgb(22, 163, 74) !important;
        border-color: #4ade80 !important;
      }
      
      /* Improved text labels next to counters */
      html[data-theme="dark"] header .flex.items-center span:not(.text-xs.font-medium),
      html[data-theme="dark"] nav .flex.items-center span:not(.text-xs.font-medium),
      html[data-theme="dark"] div[class*="header"] .flex.items-center span:not(.text-xs.font-medium),
      html[data-theme="dark"] div[class*="navbar"] .flex.items-center span:not(.text-xs.font-medium),
      html[data-theme="dark"] div[class*="top-bar"] .flex.items-center span:not(.text-xs.font-medium),
      html[data-theme="dark"] div.flex.items-center.justify-end span:not(.text-xs.font-medium) {
        color: #e2e8f0 !important;
        font-weight: 600 !important;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.4) !important;
      }
      
      /* Container fixes to ensure proper spacing */
      html[data-theme="dark"] header .flex.items-center,
      html[data-theme="dark"] nav .flex.items-center,
      html[data-theme="dark"] div[class*="header"] .flex.items-center,
      html[data-theme="dark"] div[class*="navbar"] .flex.items-center,
      html[data-theme="dark"] div[class*="top-bar"] .flex.items-center,
      html[data-theme="dark"] div.flex.items-center.justify-end {
        gap: 8px !important;
        align-items: center !important;
        justify-content: center !important;
      }
    `;
    
    // Replace existing style or add new one
    const existingStyle = document.getElementById('top-corner-counters-fix');
    if (existingStyle) {
      existingStyle.replaceWith(styleEl);
    } else {
      document.head.appendChild(styleEl);
    }
  }
  
  // Ajout d'une fonction pour égaliser les hauteurs des widgets sur le dashboard
  function equalizeWidgetHeights() {
    // Ne pas appliquer sur mobile
    if (window.innerWidth < 768) return;
    
    // Trouver les widgets de calendrier et de tâches actives
    const calendarWidgets = document.querySelectorAll('.calendar-widget, [class*="calendar"], div:has(.rdp)');
    const taskWidgets = document.querySelectorAll('.active-tasks-widget, [class*="active-tasks"], div:has(h2:contains("Active Tasks")), div:has(h3:contains("Active Tasks"))');
    
    if (calendarWidgets.length === 0 || taskWidgets.length === 0) return;
    
    // Déterminer la hauteur de référence (calendrier)
    let targetHeight = 380; // Hauteur minimale par défaut
    
    // Utiliser la hauteur du premier calendrier trouvé
    calendarWidgets.forEach(calendar => {
      const height = calendar.offsetHeight;
      if (height > 100) { // Ignorer les hauteurs non significatives
        targetHeight = Math.max(targetHeight, height);
      }
    });
    
    // Appliquer la hauteur aux widgets de tâches actives
    taskWidgets.forEach(widget => {
      // Définir les styles pour égaliser la hauteur
      widget.style.height = `${targetHeight}px`;
      widget.style.minHeight = `${targetHeight}px`;
      widget.style.display = 'flex';
      widget.style.flexDirection = 'column';
      
      // Trouver la liste des tâches
      const taskList = widget.querySelector('[class*="grid"]');
      if (taskList) {
        taskList.style.flex = '1';
        taskList.style.overflowY = 'auto';
      }
      
      // Appliquer également aux cartes internes
      const cards = widget.querySelectorAll('.card');
      cards.forEach(card => {
        card.style.height = '100%';
        card.style.display = 'flex';
        card.style.flexDirection = 'column';
        
        // Faire que le corps de la carte s'étende
        const cardBody = card.querySelector('div:not(:first-child)');
        if (cardBody) {
          cardBody.style.flex = '1';
          cardBody.style.display = 'flex';
          cardBody.style.flexDirection = 'column';
        }
      });
    });
    
    // S'assurer que les calendriers ont aussi la bonne hauteur
    calendarWidgets.forEach(widget => {
      widget.style.height = `${targetHeight}px`;
      widget.style.minHeight = `${targetHeight}px`;
    });
  }
  
  // Fonction d'initialisation
  function initialize() {
    // Appliquer les styles pour les compteurs
    applyCounterStyles();
    
    // Égaliser les hauteurs après un court délai pour s'assurer que les éléments sont rendus
    setTimeout(equalizeWidgetHeights, 500);
    
    // Observer les changements DOM
    const observer = new MutationObserver((mutations) => {
      let shouldUpdateStyles = false;
      let shouldUpdateHeights = false;
      
      for (const mutation of mutations) {
        if (mutation.type === 'childList' || 
            (mutation.type === 'attributes' && mutation.attributeName === 'class')) {
          
          // Vérifier si des compteurs ont été modifiés
          const counters = document.querySelectorAll('.text-xs.font-medium.bg-blue-500\\/10, .text-xs.font-medium.bg-green-500\\/10');
          if (counters.length > 0) {
            shouldUpdateStyles = true;
          }
          
          // Vérifier si des widgets du dashboard ont été modifiés
          const dashboardWidgets = document.querySelectorAll('.calendar-widget, .active-tasks-widget, [class*="calendar"], [class*="active-tasks"]');
          if (dashboardWidgets.length > 0) {
            shouldUpdateHeights = true;
          }
        }
      }
      
      if (shouldUpdateStyles) {
        applyCounterStyles();
      }
      
      if (shouldUpdateHeights) {
        equalizeWidgetHeights();
      }
    });
    
    // Observer les changements dans le DOM
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style']
    });
    
    // S'assurer que la hauteur est ajustée au redimensionnement
    window.addEventListener('resize', () => {
      equalizeWidgetHeights();
    });
    
    // Réappliquer périodiquement
    setInterval(() => {
      if (window.location.href.includes('dashboard')) {
        equalizeWidgetHeights();
      }
    }, 2000);
  }
  
  // Initialiser le script
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }
})();
