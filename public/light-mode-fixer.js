/**
 * Script pour corriger les problèmes de mode clair sur mobile et assurer une transition fluide
 */
(function() {
  function fixCalendarLightMode() {
    // Sélectionner les éléments du calendrier
    const calendarElements = document.querySelectorAll('[class*="calendar"]');
    
    // Appliquer les styles spécifiques au calendrier
    calendarElements.forEach(calendar => {
      // Assurer que le fond du calendrier est blanc
      calendar.style.backgroundColor = '#ffffff';
      calendar.style.borderRadius = '12px';
      calendar.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.08)';
      calendar.style.border = '1px solid rgba(0, 0, 0, 0.06)';
      calendar.style.overflow = 'hidden';
      
      // Améliorer les jours sélectionnés
      const selectedDays = calendar.querySelectorAll('[role="gridcell"] button[data-state="active"], td button.selected, [class*="selected"]');
      selectedDays.forEach(day => {
        day.style.background = 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)';
        day.style.color = 'white';
        day.style.fontWeight = '700';
        day.style.boxShadow = '0 2px 8px rgba(37, 99, 235, 0.3)';
        day.style.border = '2px solid #2563eb';
      });
      
      // Améliorer les jours d'aujourd'hui
      const todayElements = calendar.querySelectorAll('[class*="today"]');
      todayElements.forEach(today => {
        today.style.background = 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)';
        today.style.color = '#1e40af';
        today.style.fontWeight = '700';
        today.style.boxShadow = '0 2px 6px rgba(37, 99, 235, 0.2)';
        today.style.border = '1px solid #60a5fa';
      });
      
      // Améliorer les indicateurs d'activité - version renforcée pour une meilleure visibilité
      const activityIndicators = calendar.querySelectorAll('[class*="activity"]');
      activityIndicators.forEach(indicator => {
        // Ajouter un style inline pour renforcer la visibilité
        indicator.style.position = 'relative';
        
        // Supprimer les points d'activité existants pour éviter les doublons
        const existingDots = indicator.querySelectorAll('.activity-dot-js');
        existingDots.forEach(dot => dot.remove());
        
        // Créer un élément pour les indicateurs d'activité
        const activityDot = document.createElement('div');
        activityDot.classList.add('activity-dot-js');
        activityDot.style.position = 'absolute';
        activityDot.style.bottom = '3px';
        activityDot.style.left = '50%';
        activityDot.style.transform = 'translateX(-50%)';
        activityDot.style.width = '8px';
        activityDot.style.height = '8px';
        activityDot.style.borderRadius = '50%';
        activityDot.style.backgroundColor = '#3b82f6'; // Bleu par défaut
        activityDot.style.boxShadow = '0 0 5px rgba(59, 130, 246, 0.8)';
        activityDot.style.zIndex = '10';
        activityDot.style.border = '1px solid white';
        
        // Déterminer le type d'activité et appliquer la couleur appropriée
        if (indicator.classList.contains('many-activities') || indicator.className.includes('many-activities')) {
          // Beaucoup d'activités - violet
          activityDot.style.backgroundColor = '#8b5cf6';
          activityDot.style.width = '10px';
          activityDot.style.height = '10px';
          activityDot.style.boxShadow = '0 0 5px rgba(139, 92, 246, 0.8)';
        } else if (indicator.classList.contains('completed-activity') || indicator.className.includes('completed')) {
          // Activités complétées - vert
          activityDot.style.backgroundColor = '#10b981';
          activityDot.style.boxShadow = '0 0 5px rgba(16, 185, 129, 0.8)';
        } else if (indicator.classList.contains('active-activity') || indicator.className.includes('in-progress')) {
          // Activités actives/en cours - ambre
          activityDot.style.backgroundColor = '#f59e0b';
          activityDot.style.boxShadow = '0 0 5px rgba(245, 158, 11, 0.8)';
        }
        
        // Ajouter le point d'activité
        indicator.appendChild(activityDot);
        
        // Ajouter un second indicateur si nécessaire pour les jours avec plusieurs types d'activités
        if ((indicator.classList.contains('has-completed') && indicator.classList.contains('has-active')) ||
            (indicator.className.includes('completed') && indicator.className.includes('active'))) {
          const secondDot = document.createElement('div');
          secondDot.classList.add('activity-dot-js', 'second-dot');
          secondDot.style.position = 'absolute';
          secondDot.style.bottom = '3px';
          secondDot.style.left = 'calc(50% + 6px)';
          secondDot.style.width = '8px';
          secondDot.style.height = '8px';
          secondDot.style.borderRadius = '50%';
          secondDot.style.backgroundColor = '#10b981'; // Vert pour complété
          secondDot.style.boxShadow = '0 0 5px rgba(16, 185, 129, 0.8)';
          secondDot.style.zIndex = '10';
          secondDot.style.border = '1px solid white';
          indicator.appendChild(secondDot);
          
          // Déplacer le premier point vers la gauche
          activityDot.style.left = 'calc(50% - 6px)';
        }
      });
      
      // Améliorer les cellules de jour avec des couleurs spécifiques
      const dayCells = calendar.querySelectorAll('td, [role="gridcell"]');
      dayCells.forEach(cell => {
        cell.style.position = 'relative';
        cell.style.textAlign = 'center';
        cell.style.padding = '0.5rem';
        cell.style.borderRadius = '8px';
        cell.style.transition = 'all 0.2s ease';
        
        // Appliquer des couleurs spécifiques en fonction des classes ou attributs
        // Jour sélectionné
        if (cell.classList.contains('selected') || 
            cell.getAttribute('aria-selected') === 'true' || 
            cell.querySelector('[data-state="active"]') || 
            cell.querySelector('.selected')) {
          cell.style.background = 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)';
          cell.style.color = 'white';
          cell.style.fontWeight = '700';
          cell.style.boxShadow = '0 2px 8px rgba(37, 99, 235, 0.3)';
        }
        // Aujourd'hui
        else if (cell.classList.contains('today') || cell.className.includes('today')) {
          cell.style.background = 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)';
          cell.style.color = '#1e40af';
          cell.style.fontWeight = '700';
          cell.style.boxShadow = '0 2px 6px rgba(37, 99, 235, 0.2)';
        }
        // Jours avec beaucoup d'activités (5+)
        else if (cell.classList.contains('has-many-items') || 
                 cell.className.includes('items-5') || 
                 cell.className.includes('items-6') || 
                 cell.className.includes('items-7')) {
          cell.style.background = 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)';
          cell.style.color = 'white';
        }
        // Jours avec 3-4 activités
        else if (cell.className.includes('items-3') || cell.className.includes('items-4')) {
          cell.style.background = 'linear-gradient(135deg, #4ade80 0%, #22c55e 100%)';
          cell.style.color = 'white';
        }
        // Jours avec 2 activités
        else if (cell.className.includes('items-2')) {
          cell.style.background = 'linear-gradient(135deg, #86efac 0%, #4ade80 100%)';
          cell.style.color = '#166534';
        }
        // Jours avec 1 activité
        else if (cell.className.includes('items-1') || 
                 cell.classList.contains('has-activity') || 
                 cell.className.includes('activity')) {
          cell.style.background = 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)';
          cell.style.color = '#166534';
        }
        // Jours avec sessions mais pas d'activités
        else if (cell.classList.contains('has-sessions') || cell.className.includes('sessions')) {
          cell.style.background = 'linear-gradient(135deg, #fef9c3 0%, #fef08a 100%)';
          cell.style.color = '#854d0e';
        }
        // Jours hors du mois courant
        else if (cell.classList.contains('outside-month') || 
                 cell.className.includes('outside') || 
                 cell.className.includes('muted')) {
          cell.style.backgroundColor = '#f8fafc';
          cell.style.color = '#94a3b8';
        }
        // Jours normaux
        else {
          cell.style.backgroundColor = 'white';
        }
        
        // Améliorer les boutons de jour
        const dayButton = cell.querySelector('button');
        if (dayButton) {
          dayButton.style.width = '36px';
          dayButton.style.height = '36px';
          dayButton.style.borderRadius = '50%';
          dayButton.style.display = 'flex';
          dayButton.style.alignItems = 'center';
          dayButton.style.justifyContent = 'center';
          dayButton.style.margin = '0 auto';
          dayButton.style.fontWeight = '500';
          dayButton.style.position = 'relative';
          dayButton.style.zIndex = '1';
          
          // Ajouter un effet de survol
          dayButton.addEventListener('mouseenter', function() {
            if (!dayButton.classList.contains('selected') && 
                !dayButton.hasAttribute('data-state') && 
                !dayButton.parentElement.classList.contains('today')) {
              dayButton.style.backgroundColor = '#e0e7ff';
              dayButton.style.color = '#4f46e5';
            }
          });
          
          dayButton.addEventListener('mouseleave', function() {
            if (!dayButton.classList.contains('selected') && 
                !dayButton.hasAttribute('data-state') && 
                !dayButton.parentElement.classList.contains('today')) {
              dayButton.style.backgroundColor = '';
              dayButton.style.color = '';
            }
          });
        }
      });
    });
  }

  function fixLightMode() {
    // Détecter si on est en mode clair
    const isLightMode = document.documentElement.getAttribute('data-theme') === 'light';
    const isMobile = window.innerWidth <= 768;
    
    // Ne pas appliquer les modifications pendant la transition de thème
    if (document.documentElement.classList.contains('theme-transitioning')) {
      return;
    }
    
    if (isLightMode && isMobile) {
      // Forcer le fond en clair avec un léger dégradé
      const bgGradient = 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)';
      document.body.style.background = bgGradient;
      document.documentElement.style.background = bgGradient;
      
      // Assurer que les cartes ont un fond blanc - VERSION RENFORCÉE
      // Sélecteurs très larges pour attraper toutes les cartes possibles
      const cardSelectors = [
        '.card', 
        '[class*="Card"]', 
        '[class*="-card"]',
        '[class*="card"]',
        '.mastered-card',
        '.rounded-xl',
        '.border-l-4',
        '.dark\\:bg-gray-800',
        '[class*="learning-item-card"]',
        '[class*="mastered"]',
        '.bg-card',
        '[class*="border-blue-"]',
        '[class*="border-emerald-"]'
      ];
      
      // Améliorer le calendrier en mode clair sur mobile
      fixCalendarLightMode();
      
      // Sélectionner toutes les cartes
      const cards = document.querySelectorAll(cardSelectors.join(','));
      
      // Appliquer les styles à chaque carte
      cards.forEach(card => {
        card.style.backgroundColor = '#ffffff';
        card.style.background = '#ffffff';
        card.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.08)';
        card.style.borderRadius = '12px';
        card.style.border = '1px solid rgba(0, 0, 0, 0.06)';
        
        // Traiter également les enfants directs qui peuvent avoir des backgrounds
        const children = card.children;
        for (let i = 0; i < children.length; i++) {
          children[i].style.backgroundColor = '#ffffff';
          children[i].style.background = '#ffffff';
          
          // Si c'est un élément avec une classe contenant "gradient"
          if (children[i].className && children[i].className.includes && children[i].className.includes('gradient')) {
            children[i].style.backgroundImage = 'none';
          }
        }
      });
      
      // Traitement spécial pour les cartes maîtrisées
      const masteredCards = document.querySelectorAll('.mastered-card, [class*="from-emerald-50"]');
      masteredCards.forEach(card => {
        card.style.background = 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)';
        card.style.borderColor = '#6ee7b7';
        card.style.boxShadow = '0 4px 15px rgba(16, 185, 129, 0.15)';
      });
      
      // Améliorer les boutons
      const primaryButtons = document.querySelectorAll('button.bg-blue-500, button.bg-blue-600, [class*="primary"]');
      primaryButtons.forEach(button => {
        button.style.background = 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)';
        button.style.boxShadow = '0 2px 10px rgba(37, 99, 235, 0.3)';
        button.style.transform = 'translateY(0)';
        button.style.transition = 'transform 0.2s, box-shadow 0.2s';
        button.style.color = '#ffffff';
      });
      
      // Améliorer les badges
      const badges = document.querySelectorAll('.badge');
      badges.forEach(badge => {
        badge.style.fontWeight = '600';
        badge.style.padding = '0.25rem 0.75rem';
        badge.style.borderRadius = '9999px';
        badge.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
      });
      
      // Badges bleus
      const blueBadges = document.querySelectorAll('.badge.bg-blue-100');
      blueBadges.forEach(badge => {
        badge.style.background = 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)';
        badge.style.color = '#1e40af';
        badge.style.border = 'none';
      });
      
      // Badges verts
      const greenBadges = document.querySelectorAll('.badge.bg-green-100');
      greenBadges.forEach(badge => {
        badge.style.background = 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)';
        badge.style.color = '#15803d';
        badge.style.border = 'none';
      });
      
      // Badges jaunes
      const yellowBadges = document.querySelectorAll('.badge.bg-yellow-100');
      yellowBadges.forEach(badge => {
        badge.style.background = 'linear-gradient(135deg, #fef9c3 0%, #fef08a 100%)';
        badge.style.color = '#854d0e';
        badge.style.border = 'none';
      });
      
      // Badges rouges
      const redBadges = document.querySelectorAll('.badge.bg-red-100');
      redBadges.forEach(badge => {
        badge.style.background = 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)';
        badge.style.color = '#b91c1c';
        badge.style.border = 'none';
      });
      
      // Ajouter une classe spécifique pour activer les corrections CSS
      document.documentElement.classList.add('mobile-light-theme-active');
      
      // Forcer aussi les éléments avec la classe dark:bg-* à avoir un fond blanc
      const darkBgElements = document.querySelectorAll('[class*="dark:bg"]');
      darkBgElements.forEach(el => {
        if (el.closest('.card') || el.closest('[class*="card"]')) {
          el.style.backgroundColor = '#ffffff';
          el.style.background = '#ffffff';
        }
      });

      // PRÉSERVER LES COULEURS DES ICÔNES ET BOUTONS
      // Trouver tous les éléments SVG et Lucide icons
      const coloredIcons = document.querySelectorAll('svg, [class*="lucide-"], [class*="icon"]');
      coloredIcons.forEach(icon => {
        // Supprimer les styles forcés qui pourraient affecter la couleur
        icon.style.removeProperty('color');
        icon.style.removeProperty('fill');
      });

      // Force l'ajout d'une balise style pour corriger tous les cas difficiles
      let styleElement = document.getElementById('emergency-card-fix');
      if (!styleElement) {
        styleElement = document.createElement('style');
        styleElement.id = 'emergency-card-fix';
        styleElement.textContent = `
          @media (max-width: 768px) {
            html[data-theme="light"] .card,
            html[data-theme="light"] [class*="Card"],
            html[data-theme="light"] [class*="-card"],
            html[data-theme="light"] [class*="card"],
            html[data-theme="light"] .mastered-card,
            html[data-theme="light"] .rounded-xl,
            html[data-theme="light"] .dark\\:bg-gray-800,
            html[data-theme="light"] [class*="learning-item-card"] {
              background-color: #ffffff !important;
              background: #ffffff !important;
              border-radius: 12px !important;
              box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08) !important;
              border: 1px solid rgba(0, 0, 0, 0.06) !important;
              transition: transform 0.2s ease, box-shadow 0.2s ease !important;
            }
            
            html[data-theme="light"] .card:hover,
            html[data-theme="light"] [class*="Card"]:hover,
            html[data-theme="light"] [class*="-card"]:hover,
            html[data-theme="light"] [class*="card"]:hover {
              transform: translateY(-2px) !important;
              box-shadow: 0 6px 20px rgba(0, 0, 0, 0.1) !important;
            }
            
            html[data-theme="light"] .card > div,
            html[data-theme="light"] [class*="card"] > div {
              background-color: #ffffff !important;
              background: #ffffff !important;
              background-image: none !important;
            }
            
            /* Préserver les couleurs des icônes et badges */
            html[data-theme="light"] svg,
            html[data-theme="light"] [class*="lucide-"],
            html[data-theme="light"] [class*="icon"] {
              color: currentColor !important;
            }
            
            /* Boutons principaux */
            html[data-theme="light"] button.bg-blue-500,
            html[data-theme="light"] button.bg-blue-600,
            html[data-theme="light"] [class*="primary"] {
              background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%) !important;
              box-shadow: 0 2px 10px rgba(37, 99, 235, 0.3) !important;
              color: #ffffff !important;
            }
            
            /* Cartes maîtrisées avec style spécial */
            html[data-theme="light"] .mastered-card,
            html[data-theme="light"] [class*="from-emerald-50"] {
              background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%) !important;
              border-color: #6ee7b7 !important;
              box-shadow: 0 4px 15px rgba(16, 185, 129, 0.15) !important;
            }
            
            /* Badges améliorés */
            html[data-theme="light"] .badge {
              font-weight: 600 !important;
              padding: 0.25rem 0.75rem !important;
              border-radius: 9999px !important;
              box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1) !important;
            }
            
            html[data-theme="light"] .badge.bg-blue-100 {
              background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%) !important;
              color: #1e40af !important;
              border: none !important;
            }
            
            html[data-theme="light"] .badge.bg-green-100 {
              background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%) !important;
              color: #15803d !important;
              border: none !important;
            }
            
            html[data-theme="light"] .badge.bg-yellow-100 {
              background: linear-gradient(135deg, #fef9c3 0%, #fef08a 100%) !important;
              color: #854d0e !important;
              border: none !important;
            }
            
            html[data-theme="light"] .badge.bg-red-100 {
              background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%) !important;
              color: #b91c1c !important;
              border: none !important;
            }
            
            /* Amélioration des titres */
            html[data-theme="light"] h1,
            html[data-theme="light"] h2,
            html[data-theme="light"] h3 {
              color: hsl(222, 95%, 18%) !important;
              font-weight: 700 !important;
            }
            
            /* Style pour les formulaires */
            html[data-theme="light"] input,
            html[data-theme="light"] textarea,
            html[data-theme="light"] select {
              border: 1px solid rgba(0, 0, 0, 0.1) !important;
              border-radius: 8px !important;
              box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05) !important;
            }
            
            html[data-theme="light"] input:focus,
            html[data-theme="light"] textarea:focus,
            html[data-theme="light"] select:focus {
              border-color: #3b82f6 !important;
              box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2) !important;
            }
          }
        `;
        document.head.appendChild(styleElement);
      }
    } else if (!isLightMode && isMobile) {
      // Mode sombre sur mobile - s'assurer qu'il est correctement appliqué
      document.documentElement.classList.remove('mobile-light-theme-active');
      document.body.style.removeProperty('background');
      document.documentElement.style.removeProperty('background');
      
      // Supprimer le style d'urgence
      const styleElement = document.getElementById('emergency-card-fix');
      if (styleElement) styleElement.remove();
      
      // Restaurer les couleurs sombres
      const cardSelectors = [
        '.card', 
        '[class*="Card"]', 
        '[class*="-card"]',
        '[class*="card"]',
        '.mastered-card',
        '.rounded-xl',
        '.border-l-4'
      ];
      
      // Sélectionner toutes les cartes
      const cards = document.querySelectorAll(cardSelectors.join(','));
      
      // Réinitialiser les styles pour mode sombre
      cards.forEach(card => {
        card.style.removeProperty('background-color');
        card.style.removeProperty('background');
        card.style.removeProperty('box-shadow');
        card.style.removeProperty('border-radius');
        card.style.removeProperty('border');
        
        // Traiter également les enfants directs
        const children = card.children;
        for (let i = 0; i < children.length; i++) {
          children[i].style.removeProperty('background-color');
          children[i].style.removeProperty('background');
        }
      });
    }
  }
  
  // Si le DOM est déjà chargé, exécuter immédiatement
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    fixLightMode();
  } else {
    // Sinon, attendre que le DOM soit chargé
    document.addEventListener('DOMContentLoaded', fixLightMode);
  }
  
  // Écouter les changements de taille de fenêtre
  window.addEventListener('resize', fixLightMode);
  
  // Observer les changements d'attribut sur le html pour détecter les changements de thème
  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
        // Attendre que la transition de thème soit terminée
        setTimeout(fixLightMode, 200);
      }
    });
  });
  
  observer.observe(document.documentElement, { attributes: true });
  
  // Appliquer à l'initialisation et après chargement complet
  window.addEventListener('load', fixLightMode);
  
  // Réappliquer après un court délai pour attraper le contenu dynamique chargé après le DOM initial
  setTimeout(fixLightMode, 500);
})();
