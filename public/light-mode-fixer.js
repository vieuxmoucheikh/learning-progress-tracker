/**
 * Script pour corriger les problèmes de mode clair sur mobile et assurer une transition fluide
 */
(function() {
  // Variables pour gérer les transitions de thème
  let isCurrentlyTransitioning = false;
  let transitionTimer = null;
  let themeChangeCount = 0;
  
  function fixLightMode() {
    // Détecter si on est en mode clair
    const isLightMode = document.documentElement.getAttribute('data-theme') === 'light';
    const isMobile = window.innerWidth <= 768;
    
    // Protection contre les appels multiples en cours de transition
    if (isCurrentlyTransitioning) {
      return;
    }
    
    // Ne pas appliquer les modifications pendant la transition de thème
    if (document.documentElement.classList.contains('theme-transitioning')) {
      return;
    }
    
    // Marquer le début de la transition
    isCurrentlyTransitioning = true;
    
    // Incrémenter le compteur de changements de thème
    themeChangeCount++;
    
    // Stabiliser d'abord le bouton de changement de thème
    stabilizeThemeToggleButton(isLightMode);

    if (isLightMode && isMobile) {
      // Forcer le fond en clair avec un léger dégradé
      const bgGradient = 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)';
      document.body.style.background = bgGradient;
      document.documentElement.style.background = bgGradient;
      
      // Assurer que les cartes ont un fond blanc
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
      
      // Sélectionner toutes les cartes
      const cards = document.querySelectorAll(cardSelectors.join(','));
      
      // Appliquer les styles à chaque carte
      cards.forEach(card => {
        card.style.backgroundColor = '#ffffff';
        card.style.background = '#ffffff';
        card.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.08)';
        card.style.borderRadius = '12px';
        card.style.border = '1px solid rgba(0, 0, 0, 0.06)';
        
        // Traiter également les enfants directs
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

            /* Corrections pour le bouton de changement de thème */
            .theme-toggle-button {
              transition: none !important;
              transform: none !important;
              border-color: rgba(203, 213, 225, 0.8) !important;
            }
            
            html[data-theme="light"] .theme-toggle-button {
              background-color: white !important;
              color: #0f172a !important;
            }
            
            html[data-theme="dark"] .theme-toggle-button {
              background-color: #1e293b !important;
              color: #f8fafc !important;
              border-color: #334155 !important;
            }
            
            .theme-toggle-button svg {
              transition: none !important;
              transform: none !important;
            }
          }
        `;
        document.head.appendChild(styleElement);
      }
    } else if (!isLightMode && isMobile) {
      // Mode sombre sur mobile - s'assurer qu'il est correctement appliqué
      document.documentElement.classList.remove('mobile-light-theme-active');
      document.body.style.backgroundColor = '#0f172a';
      document.body.style.color = '#f8fafc';
      document.documentElement.style.removeProperty('background');
      
      // Supprimer le style d'urgence
      const styleElement = document.getElementById('emergency-card-fix');
      if (styleElement) styleElement.remove();
    }
    
    // Terminer la transition après un court délai
    clearTimeout(transitionTimer);
    transitionTimer = setTimeout(() => {
      isCurrentlyTransitioning = false;
      
      // Force un re-render si nécessaire
      if (themeChangeCount > 1) {
        // Force une re-peinture du DOM après multiples changements
        document.body.style.display = 'none';
        document.body.offsetHeight; // Force reflow
        document.body.style.display = '';
        
        // Reset le compteur
        themeChangeCount = 0;
      }
    }, 200);
  }
  
  // Fonction pour s'assurer que le bouton de changement de thème est stable
  function stabilizeThemeToggleButton(isLightMode) {
    const themeToggle = document.querySelector('.theme-toggle-button');
    if (!themeToggle) return;
    
    // Désactiver toutes les transitions du bouton pendant les changements
    themeToggle.style.transition = 'none';
    
    // Forcer les styles appropriés selon le thème
    if (isLightMode) {
      themeToggle.classList.add('light-mode-button');
      themeToggle.classList.remove('dark-mode-button');
      
      // Force les styles exacts pour le mode clair
      themeToggle.style.backgroundColor = '#ffffff';
      themeToggle.style.borderColor = 'rgba(203, 213, 225, 0.8)';
      themeToggle.style.color = '#0f172a';
      
      // Trouver et styliser les icônes
      const sunIcon = themeToggle.querySelector('svg:first-of-type');
      if (sunIcon) {
        sunIcon.style.color = '#f59e0b';
        sunIcon.style.opacity = '1';
        sunIcon.style.transform = 'scale(1)';
      }
      
      const moonIcon = themeToggle.querySelector('svg:last-of-type');
      if (moonIcon) {
        moonIcon.style.color = '#94a3b8';
        moonIcon.style.opacity = '0.5';
        moonIcon.style.transform = 'scale(0.75)';
      }
    } else {
      themeToggle.classList.add('dark-mode-button');
      themeToggle.classList.remove('light-mode-button');
      
      // Force les styles exacts pour le mode sombre
      themeToggle.style.backgroundColor = '#1e293b';
      themeToggle.style.borderColor = '#334155';
      themeToggle.style.color = '#f8fafc';
      
      // Trouver et styliser les icônes
      const sunIcon = themeToggle.querySelector('svg:first-of-type');
      if (sunIcon) {
        sunIcon.style.color = '#94a3b8';
        sunIcon.style.opacity = '0.5';
        sunIcon.style.transform = 'scale(0.75)';
      }
      
      const moonIcon = themeToggle.querySelector('svg:last-of-type');
      if (moonIcon) {
        moonIcon.style.color = '#3b82f6';
        moonIcon.style.opacity = '1';
        moonIcon.style.transform = 'scale(1)';
      }
    }
    
    // Force une repeinture du bouton
    themeToggle.getBoundingClientRect();
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
        document.documentElement.classList.add('theme-transitioning');
        stabilizeThemeToggleButton(document.documentElement.getAttribute('data-theme') === 'light');
        
        // Attendre que la transition de thème soit terminée
        setTimeout(() => {
          fixLightMode();
          setTimeout(() => {
            document.documentElement.classList.remove('theme-transitioning');
          }, 50);
        }, 10);
      }
    });
  });
  
  observer.observe(document.documentElement, { attributes: true });
  
  // Ajouter des styles spécifiques pour stabiliser le bouton de thème
  const themeToggleStyles = document.createElement('style');
  themeToggleStyles.id = 'theme-toggle-stability';
  themeToggleStyles.textContent = `
    /* Styles pour stabiliser le bouton de thème */
    .theme-toggle-button.theme-transitioning * {
      transition: none !important;
      animation: none !important;
    }
    
    /* Mode clair */
    .light-mode-button {
      background-color: white !important;
      border-color: rgba(203, 213, 225, 0.8) !important;
      color: #0f172a !important;
    }
    
    /* Mode sombre */
    .dark-mode-button {
      background-color: #1e293b !important;
      border-color: #334155 !important;
      color: #f8fafc !important;
    }
    
    /* Fix pour les icônes Sun et Moon */
    .light-mode-button svg:first-of-type {
      color: #f59e0b !important;
      opacity: 1 !important;
      transform: scale(1) !important;
    }
    
    .light-mode-button svg:last-of-type {
      color: #94a3b8 !important;
      opacity: 0.5 !important;
      transform: scale(0.75) !important;
    }
    
    .dark-mode-button svg:first-of-type {
      color: #94a3b8 !important;
      opacity: 0.5 !important;
      transform: scale(0.75) !important;
    }
    
    .dark-mode-button svg:last-of-type {
      color: #3b82f6 !important;
      opacity: 1 !important;
      transform: scale(1) !important;
    }
  `;
  document.head.appendChild(themeToggleStyles);
  
  // Appliquer à l'initialisation et après chargement complet
  window.addEventListener('load', fixLightMode);
  
  // Réappliquer après un court délai pour attraper le contenu dynamique chargé après le DOM initial
  setTimeout(fixLightMode, 300);
})();
