/**
 * Script pour corriger les problèmes de mode clair sur mobile
 */
(function() {
  function fixLightMode() {
    // Détecter si on est en mode clair
    const isLightMode = document.documentElement.getAttribute('data-theme') === 'light';
    const isMobile = window.innerWidth <= 768;
    
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
          if (children[i].className.includes('gradient')) {
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
    }
  }
  
  // Exécuter immédiatement
  fixLightMode();
  
  // Écouter les changements de taille de fenêtre
  window.addEventListener('resize', fixLightMode);
  
  // Observer les changements d'attribut sur le html pour détecter les changements de thème
  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
        fixLightMode();
      }
    });
  });
  
  observer.observe(document.documentElement, { attributes: true });
  
  // Réappliquer périodiquement pour s'assurer que les corrections sont maintenues
  setInterval(fixLightMode, 1000);

  // Ajouter un écouteur pour le chargement du contenu dynamique
  window.addEventListener('DOMContentLoaded', fixLightMode);
  
  // Réappliquer après un court délai pour attraper le contenu dynamique chargé après le DOM initial
  setTimeout(fixLightMode, 500);
  setTimeout(fixLightMode, 1500);
  setTimeout(fixLightMode, 3000);
})();

/**
 * Script pour résoudre les problèmes de transition entre les modes clair et sombre
 * et fixer les styles des cartes d'apprentissage
 */

(function() {
  // Fonction pour synchroniser les attributs data-theme et class
  function syncThemeAttributes() {
    const htmlElement = document.documentElement;
    const currentTheme = localStorage.getItem('theme') || 'light';
    
    // Ajouter la classe de transition pour désactiver les animations
    htmlElement.classList.add('theme-transitioning');
    
    // Synchroniser data-theme et class
    htmlElement.setAttribute('data-theme', currentTheme);
    
    if (currentTheme === 'dark') {
      htmlElement.classList.add('dark');
      htmlElement.classList.remove('light');
    } else {
      htmlElement.classList.remove('dark');
      htmlElement.classList.add('light');
    }
    
    // Forcer une réinitialisation des styles calculés
    void htmlElement.offsetWidth;
    
    // Réappliquer les styles spécifiques au thème
    document.body.style.backgroundColor = currentTheme === 'dark' ? '#0f172a' : '#ffffff';
    document.body.style.color = currentTheme === 'dark' ? '#f8fafc' : '#0f172a';
    
    // Nettoyer les styles spécifiques aux cartes qui peuvent persister
    cleanupPersistentStyles(currentTheme);
    
    // Appliquer directement les styles CSS pour les cartes et boutons
    fixLearningCardStyles(currentTheme);
    
    // Retirer la classe de transition après un court délai
    setTimeout(() => {
      htmlElement.classList.remove('theme-transitioning');
    }, 100);
  }
  
  // Fonction pour nettoyer les styles persistants
  function cleanupPersistentStyles(currentTheme) {
    // Sélecteurs qui peuvent causer des problèmes lors du changement de thème
    const problematicSelectors = [
      '.learning-item-card .card',
      '.learning-item-card .card > div:first-child',
      '.learning-item-card .card > div:last-child',
      '.learning-item-card button[title="Mark as complete"]',
      '.learning-item-card button[title="Mark as incomplete"]',
      '.learning-item-card button[title="Delete item"]',
      '.learning-item-card .border.rounded-xl',
      '.bg-white',
      '.bg-gray-800'
    ];
    
    // Fonction pour réappliquer les styles corrects selon le thème
    problematicSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        // Forcer le recalcul du style
        el.style.cssText = el.style.cssText;
      });
    });
  }

  // Fonction pour appliquer directement des styles CSS aux cartes d'apprentissage
  function fixLearningCardStyles(currentTheme) {
    if (currentTheme === 'light') {
      // Sélectionner tous les boutons de suppression
      const deleteButtons = document.querySelectorAll('.learning-item-card button[title="Delete item"]');
      deleteButtons.forEach(button => {
        button.style.backgroundColor = '#fee2e2';
        button.style.color = '#b91c1c';
        button.style.border = '2px solid #fca5a5';
        button.style.borderRadius = '8px';
        button.style.minWidth = '40px';
        button.style.minHeight = '40px';
        button.style.padding = '0';
        button.style.display = 'flex';
        button.style.alignItems = 'center';
        button.style.justifyContent = 'center';
        button.style.boxShadow = '0 4px 6px rgba(239, 68, 68, 0.25)';
        
        // Trouver l'icône SVG à l'intérieur du bouton
        const svg = button.querySelector('svg');
        if (svg) {
          svg.style.width = '24px';
          svg.style.height = '24px';
          svg.style.color = '#dc2626';
          svg.style.strokeWidth = '2.5px';
        }
      });
      
      // Sélectionner tous les boutons de complétion
      const completeButtons = document.querySelectorAll('.learning-item-card button[title="Mark as complete"], .learning-item-card button[title="Mark as incomplete"]');
      completeButtons.forEach(button => {
        button.style.backgroundColor = '#dcfce7';
        button.style.color = '#15803d';
        button.style.border = '2px solid #bbf7d0';
        button.style.borderRadius = '12px';
        button.style.minWidth = '40px';
        button.style.minHeight = '40px';
        button.style.padding = '0';
        button.style.display = 'flex';
        button.style.alignItems = 'center';
        button.style.justifyContent = 'center';
        
        // Trouver l'icône SVG à l'intérieur du bouton
        const svg = button.querySelector('svg');
        if (svg) {
          svg.style.width = '24px';
          svg.style.height = '24px';
          svg.style.color = '#15803d';
          svg.style.strokeWidth = '2px';
        }
      });
      
      // Sélectionner toutes les cartes principales
      const cards = document.querySelectorAll('.learning-item-card .card');
      cards.forEach(card => {
        card.style.border = '3px solid #e2e8f0';
        card.style.borderRadius = '16px';
        card.style.boxShadow = '0 10px 25px rgba(0, 0, 0, 0.1)';
        card.style.marginBottom = '32px';
        card.style.backgroundColor = '#ffffff';
        
        // Détecter le statut et appliquer la couleur de bordure appropriée
        if (card.classList.contains('status-in_progress') || card.classList.contains('border-l-blue-400')) {
          card.style.borderLeft = '8px solid #3b82f6';
        } else if (card.classList.contains('status-completed') || card.classList.contains('border-l-green-400')) {
          card.style.borderLeft = '8px solid #10b981';
        } else if (card.classList.contains('status-on_hold') || card.classList.contains('border-l-yellow-400')) {
          card.style.borderLeft = '8px solid #f59e0b';
        } else {
          card.style.borderLeft = '8px solid #64748b';
        }
      });
      
      // Sélectionner tous les conteneurs de session
      const sessions = document.querySelectorAll('.learning-item-card .border.rounded-xl');
      sessions.forEach(session => {
        session.style.border = '2px solid rgba(226, 232, 240, 0.8)';
        session.style.borderRadius = '12px';
        session.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.05)';
        session.style.padding = '16px';
        session.style.marginBottom = '16px';
        session.style.backgroundColor = '#ffffff';
        
        // Détecter le statut et appliquer la couleur de bordure appropriée
        if (session.classList.contains('border-l-blue-400')) {
          session.style.borderLeft = '6px solid #3b82f6';
          session.style.background = 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)';
        } else if (session.querySelector('[class*="on_hold"]')) {
          session.style.borderLeft = '6px solid #f59e0b';
          session.style.background = 'linear-gradient(135deg, #fefce8 0%, #fef9c3 100%)';
        } else if (session.querySelector('[class*="completed"]')) {
          session.style.borderLeft = '6px solid #10b981';
          session.style.background = 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)';
        }
      });
    }
  }

  // Exécuter au chargement
  syncThemeAttributes();
  
  // Observer les changements de thème
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.attributeName === 'data-theme' || 
          mutation.attributeName === 'class') {
        syncThemeAttributes();
      }
    });
  });
  
  observer.observe(document.documentElement, { 
    attributes: true,
    attributeFilter: ['data-theme', 'class']
  });
  
  // S'exécuter aussi quand le stockage local change
  window.addEventListener('storage', (event) => {
    if (event.key === 'theme') {
      syncThemeAttributes();
    }
  });
  
  // Observation des modifications du DOM pour réappliquer les styles lorsque de nouvelles cartes sont ajoutées
  const domObserver = new MutationObserver((mutations) => {
    const currentTheme = localStorage.getItem('theme') || 'light';
    if (currentTheme === 'light') {
      mutations.forEach(mutation => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          // Vérifier si les mutations concernent des cartes d'apprentissage
          const hasLearningCards = Array.from(mutation.addedNodes).some(node => {
            if (node.nodeType === 1) { // Element node
              const element = node as Element;
              return element.querySelector && (
                element.querySelector('.learning-item-card') !== null ||
                element.classList && element.classList.contains('learning-item-card')
              );
            }
            return false;
          });
          
          if (hasLearningCards) {
            // Réappliquer les styles aux cartes si des cartes ont été ajoutées
            setTimeout(() => fixLearningCardStyles(currentTheme), 100);
          }
        }
      });
    }
  });
  
  // Observer le corps du document pour détecter les nouvelles cartes
  domObserver.observe(document.body, { 
    childList: true,
    subtree: true
  });
  
  // Réappliquer les styles lors d'un redimensionnement de la fenêtre
  window.addEventListener('resize', () => {
    const currentTheme = localStorage.getItem('theme') || 'light';
    fixLearningCardStyles(currentTheme);
  });
  
  // Appliquer les styles spécifiques après le chargement complet
  window.addEventListener('load', () => {
    const currentTheme = localStorage.getItem('theme') || 'light';
    setTimeout(() => fixLearningCardStyles(currentTheme), 500);
    setTimeout(() => fixLearningCardStyles(currentTheme), 1000); // Répéter pour s'assurer que cela prend effet
  });
  
  // Exporter la fonction pour qu'elle puisse être appelée manuellement
  window.syncThemeAttributes = syncThemeAttributes;
})();
