/**
 * Script pour corriger les problèmes de mode clair sur mobile et assurer une transition fluide
 */
(function() {
  // Variables pour gérer les transitions de thème
  let isCurrentlyTransitioning = false;
  let transitionTimer = null;
  let themeChangeCount = 0;
  let lastThemeChangeTime = 0;
  let consecutiveThemeChanges = 0;
  
  function fixLightMode() {
    // Détecter si on est en mode clair
    const isLightMode = document.documentElement.getAttribute('data-theme') === 'light';
    const isMobile = window.innerWidth <= 768;
    
    // Protection contre les appels multiples en cours de transition
    if (isCurrentlyTransitioning) {
      return;
    }
    
    // Limiter la fréquence des corrections à 100ms minimum entre chaque appel
    const now = Date.now();
    if (now - lastThemeChangeTime < 100) {
      // Incrémenter le compteur de basculements consécutifs rapides
      consecutiveThemeChanges++;
      
      // Si trop de basculements rapides, forcer un rafraîchissement complet
      if (consecutiveThemeChanges > 3) {
        forceCompleteRefresh(isLightMode);
        consecutiveThemeChanges = 0;
        return;
      }
      return;
    }
    
    lastThemeChangeTime = now;
    
    // Marquer le début de la transition
    isCurrentlyTransitioning = true;
    
    // Incrémenter le compteur de changements de thème
    themeChangeCount++;
    
    // Ne pas appliquer les modifications pendant la transition de thème
    if (document.documentElement.classList.contains('theme-transitioning')) {
      document.documentElement.classList.remove('theme-transitioning');
    }
    
    // Ajouter à nouveau la classe pour indiquer la transition
    document.documentElement.classList.add('theme-transitioning');
    
    // Bloquer temporairement toutes les interactions UI
    const overlay = document.createElement('div');
    overlay.id = 'theme-transition-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: transparent;
      z-index: 99999;
      pointer-events: all;
    `;
    document.body.appendChild(overlay);
    
    // Stabiliser d'abord le bouton de changement de thème
    stabilizeThemeToggleButton(isLightMode);
    
    // Forcer un reflow pour appliquer immédiatement les changements CSS
    document.body.offsetHeight;

    if (isLightMode && isMobile) {
      // Force le thème clair
      document.documentElement.className = document.documentElement.className
        .replace(/\bdark\b/g, '')
        .replace(/\blight\b/g, '') + ' light';
      document.documentElement.setAttribute('data-theme', 'light');
      
      // Forcer le fond en clair avec un léger dégradé
      const bgGradient = 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)';
      document.body.style.background = bgGradient;
      document.documentElement.style.background = bgGradient;
      
      // Force les couleurs de base
      document.body.style.backgroundColor = '#ffffff';
      document.body.style.color = '#0f172a';
      
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
        card.style.color = '#0f172a';
        
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
      
      // Ajouter une classe spécifique pour activer les corrections CSS
      document.documentElement.classList.add('mobile-light-theme-active');
    } else if (!isLightMode && isMobile) {
      // Force le thème sombre
      document.documentElement.className = document.documentElement.className
        .replace(/\bdark\b/g, '')
        .replace(/\blight\b/g, '') + ' dark';
      document.documentElement.setAttribute('data-theme', 'dark');
      
      // Mode sombre sur mobile - s'assurer qu'il est correctement appliqué
      document.documentElement.classList.remove('mobile-light-theme-active');
      document.body.style.backgroundColor = '#0f172a';
      document.body.style.color = '#f8fafc';
      document.body.style.background = '#0f172a';
      document.documentElement.style.background = '#0f172a';
      
      // Forcer les couleurs pour les éléments principaux
      const mainElements = document.querySelectorAll('.bg-white, .bg-gray-50, .bg-gray-100, .bg-card, .card, [class*="card"]');
      mainElements.forEach(el => {
        el.style.backgroundColor = '#1e293b';
        el.style.color = '#f8fafc';
        el.style.borderColor = '#334155';
      });
    }
    
    // Force l'ajout d'une balise style pour corriger tous les cas difficiles
    let styleElement = document.getElementById('emergency-theme-fix');
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = 'emergency-theme-fix';
      styleElement.textContent = `
        /* Correctifs d'urgence pour stabiliser les thèmes lors de basculements multiples */
        @media (max-width: 768px) {
          html[data-theme="light"] {
            background-color: #ffffff !important;
            color: #0f172a !important;
          }
          
          html[data-theme="dark"] {
            background-color: #0f172a !important;
            color: #f8fafc !important;
          }
          
          html[data-theme="light"] body,
          html[data-theme="light"] #root {
            background-color: #ffffff !important;
            color: #0f172a !important;
          }
          
          html[data-theme="dark"] body,
          html[data-theme="dark"] #root {
            background-color: #0f172a !important;
            color: #f8fafc !important;
          }
          
          /* Stabilité des cartes */
          html[data-theme="light"] .card,
          html[data-theme="light"] .bg-white,
          html[data-theme="light"] .bg-card {
            background-color: #ffffff !important;
            color: #0f172a !important;
          }
          
          html[data-theme="dark"] .card,
          html[data-theme="dark"] .bg-gray-800,
          html[data-theme="dark"] .bg-gray-900,
          html[data-theme="dark"] .bg-card {
            background-color: #1e293b !important;
            color: #f8fafc !important;
          }
          
          /* Stabilité du bouton de thème */
          html[data-theme="light"] .theme-toggle-button,
          .light-mode-button {
            background-color: #ffffff !important;
            border-color: #e2e8f0 !important;
            color: #0f172a !important;
          }
          
          html[data-theme="dark"] .theme-toggle-button,
          .dark-mode-button {
            background-color: #1e293b !important;
            border-color: #334155 !important;
            color: #f8fafc !important;
          }
        }
      `;
      document.head.appendChild(styleElement);
    }
    
    // Terminer la transition après un court délai
    clearTimeout(transitionTimer);
    transitionTimer = setTimeout(() => {
      // Supprimer le blocage des interactions
      const overlay = document.getElementById('theme-transition-overlay');
      if (overlay) overlay.remove();
      
      // Supprimer la classe de transition
      document.documentElement.classList.remove('theme-transitioning');
      
      // Marquer la fin de la transition
      isCurrentlyTransitioning = false;
      
      // Si trop de basculements, forcer un reflow complet
      if (themeChangeCount > 2) {
        // Force un re-render
        document.body.style.display = 'none';
        document.body.offsetHeight; // Force reflow
        document.body.style.display = '';
        
        // Reset le compteur
        themeChangeCount = 0;
      }
      
      // Réinitialiser le compteur de basculements consécutifs
      consecutiveThemeChanges = 0;
    }, 150);
  }
  
  // Fonction pour forcer un rafraîchissement complet du thème
  function forceCompleteRefresh(isLightMode) {
    console.log('Forcer un rafraîchissement complet du thème...');
    
    // Bloquer toute interaction pendant le rafraîchissement
    const overlay = document.createElement('div');
    overlay.id = 'theme-refresh-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: ${isLightMode ? '#ffffff' : '#0f172a'};
      z-index: 999999;
      opacity: 0.5;
      transition: opacity 0.2s;
      pointer-events: all;
    `;
    document.body.appendChild(overlay);
    
    // Fixer immédiatement tous les éléments HTML au thème cible
    document.documentElement.className = document.documentElement.className
      .replace(/\bdark\b/g, '')
      .replace(/\blight\b/g, '') + (isLightMode ? ' light' : ' dark');
    document.documentElement.setAttribute('data-theme', isLightMode ? 'light' : 'dark');
    
    // Forcer une réinitialisation de l'état du DOM
    setTimeout(() => {
      document.body.style.display = 'none';
      
      // Force le nouveau style
      if (isLightMode) {
        document.body.style.backgroundColor = '#ffffff';
        document.body.style.color = '#0f172a';
      } else {
        document.body.style.backgroundColor = '#0f172a';
        document.body.style.color = '#f8fafc';
      }
      
      // Force un reflow complet
      document.body.offsetHeight;
      document.body.style.display = '';
      
      // Stabiliser l'apparence du bouton après le reflow
      stabilizeThemeToggleButton(isLightMode);
      
      // Réinitialiser les compteurs
      themeChangeCount = 0;
      consecutiveThemeChanges = 0;
      isCurrentlyTransitioning = false;
      
      // Supprimer l'overlay après le rafraîchissement
      setTimeout(() => {
        const overlay = document.getElementById('theme-refresh-overlay');
        if (overlay) {
          overlay.style.opacity = '0';
          setTimeout(() => overlay.remove(), 200);
        }
      }, 300);
    }, 50);
  }
  
  // Fonction pour s'assurer que le bouton de changement de thème est stable
  function stabilizeThemeToggleButton(isLightMode) {
    const themeToggle = document.querySelector('.theme-toggle-button');
    if (!themeToggle) return;
    
    // Reset des classes
    themeToggle.classList.remove('light-mode-button', 'dark-mode-button');
    
    // Désactiver toutes les transitions du bouton pendant les changements
    themeToggle.style.transition = 'none';
    
    // Appliquer la classe appropriée
    themeToggle.classList.add(isLightMode ? 'light-mode-button' : 'dark-mode-button');
    
    // Forcer les styles appropriés selon le thème
    if (isLightMode) {
      // Force les styles exacts pour le mode clair
      themeToggle.style.backgroundColor = '#ffffff';
      themeToggle.style.borderColor = '#e2e8f0';
      themeToggle.style.color = '#0f172a';
      
      // Trouver et styliser les icônes
      const sunIcon = themeToggle.querySelector('.icon-sun');
      if (sunIcon) {
        sunIcon.style.color = '#f59e0b';
        sunIcon.style.opacity = '1';
        sunIcon.style.transform = 'scale(1)';
      }
      
      const moonIcon = themeToggle.querySelector('.icon-moon');
      if (moonIcon) {
        moonIcon.style.color = '#94a3b8';
        moonIcon.style.opacity = '0.5';
        moonIcon.style.transform = 'scale(0.75)';
      }
    } else {
      // Force les styles exacts pour le mode sombre
      themeToggle.style.backgroundColor = '#1e293b';
      themeToggle.style.borderColor = '#334155';
      themeToggle.style.color = '#f8fafc';
      
      // Trouver et styliser les icônes
      const sunIcon = themeToggle.querySelector('.icon-sun');
      if (sunIcon) {
        sunIcon.style.color = '#94a3b8';
        sunIcon.style.opacity = '0.5';
        sunIcon.style.transform = 'scale(0.75)';
      }
      
      const moonIcon = themeToggle.querySelector('.icon-moon');
      if (moonIcon) {
        moonIcon.style.color = '#3b82f6';
        moonIcon.style.opacity = '1';
        moonIcon.style.transform = 'scale(1)';
      }
    }
    
    // Rendre les styles immuables avec !important
    themeToggle.setAttribute('style', themeToggle.getAttribute('style') + ' transition: none !important; transform: none !important;');
    
    // Force une repeinture du bouton
    themeToggle.getBoundingClientRect();
  }
  
  // Ajouter des styles spécifiques pour stabiliser le bouton de thème
  const themeToggleStyles = document.createElement('style');
  themeToggleStyles.id = 'theme-toggle-stability';
  themeToggleStyles.textContent = `
    /* Styles pour stabiliser le bouton de thème */
    .theme-toggle-button {
      transition: none !important;
      transform: none !important;
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
    .light-mode-button .icon-sun {
      color: #f59e0b !important;
      opacity: 1 !important;
      transform: scale(1) !important;
    }
    
    .light-mode-button .icon-moon {
      color: #94a3b8 !important;
      opacity: 0.5 !important;
      transform: scale(0.75) !important;
    }
    
    .dark-mode-button .icon-sun {
      color: #94a3b8 !important;
      opacity: 0.5 !important;
      transform: scale(0.75) !important;
    }
    
    .dark-mode-button .icon-moon {
      color: #3b82f6 !important;
      opacity: 1 !important;
      transform: scale(1) !important;
    }
    
    /* Styles d'urgence pour éviter les états incohérents */
    html[data-theme="light"] body {
      background-color: #ffffff !important;
      color: #0f172a !important;
    }
    
    html[data-theme="dark"] body {
      background-color: #0f172a !important;
      color: #f8fafc !important;
    }
  `;
  document.head.appendChild(themeToggleStyles);
  
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
        // Ajouter la classe transitioning immédiatement
        document.documentElement.classList.add('theme-transitioning');
        
        // Stabiliser immédiatement le bouton
        stabilizeThemeToggleButton(document.documentElement.getAttribute('data-theme') === 'light');
        
        // Appliquer le correctif après un léger délai
        setTimeout(fixLightMode, 10);
      }
    });
  });
  
  observer.observe(document.documentElement, { attributes: true });
  
  // Appliquer à l'initialisation et après chargement complet
  window.addEventListener('load', fixLightMode);
  
  // Réappliquer après un court délai pour attraper le contenu dynamique chargé après le DOM initial
  setTimeout(fixLightMode, 300);
  
  // S'assurer que les paramètres persistent entre les sessions
  window.addEventListener('beforeunload', () => {
    // Stocker le thème actuel dans localStorage pour éviter les incohérences
    const currentTheme = document.documentElement.getAttribute('data-theme');
    if (currentTheme) {
      localStorage.setItem('theme', currentTheme);
    }
  });
})();
