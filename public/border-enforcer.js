/**
 * Script pour forcer l'application des bordures sur les cartes d'apprentissage
 * Ce script utilise des styles inline pour s'assurer que les bordures sont visibles
 */

(function() {
  // Fonction pour appliquer les styles directement aux éléments
  function applyCardStyles() {
    // Attendre que le DOM soit chargé
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', forceCardStyles);
    } else {
      forceCardStyles();
    }
    
    // Observer les changements du DOM pour appliquer les styles aux nouveaux éléments
    const observer = new MutationObserver(function(mutations) {
      forceCardStyles();
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
  
  // Fonction pour forcer les styles sur toutes les cartes
  function forceCardStyles() {
    // Obtenir le thème actuel
    const isDarkMode = document.documentElement.dataset.theme === 'dark';
    
    // Sélectionner toutes les cartes principales
    const cards = document.querySelectorAll('.learning-item-card .card');
    
    cards.forEach(card => {
      // Styles de base communs à tous les thèmes
      card.style.borderWidth = '3px';
      card.style.borderStyle = 'solid';
      card.style.borderRadius = '18px';
      card.style.overflow = 'hidden';
      card.style.position = 'relative';
      card.style.marginBottom = '32px';
      
      // Styles différenciés selon le thème
      if (isDarkMode) {
        card.style.borderColor = '#1e293b';
        card.style.boxShadow = '0 15px 30px rgba(0, 0, 0, 0.25)';
        card.style.background = 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)';
      } else {
        card.style.borderColor = '#e2e8f0';
        card.style.boxShadow = '0 15px 30px rgba(0, 0, 0, 0.1)';
        card.style.background = 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)';
      }
      
      // Appliquer les couleurs de bordure selon le statut
      applyBorderColorByStatus(card, isDarkMode);
    });
    
    // Sélectionner toutes les sessions
    const sessions = document.querySelectorAll('.learning-item-card .border.rounded-xl');
    
    sessions.forEach(session => {
      // Styles de base communs
      session.style.border = '2px solid ' + (isDarkMode ? 'rgba(30, 41, 59, 0.8)' : 'rgba(226, 232, 240, 0.8)');
      session.style.borderRadius = '12px';
      session.style.padding = '16px';
      session.style.marginBottom = '16px';
      session.style.position = 'relative';
      session.style.boxShadow = isDarkMode 
        ? '0 4px 10px rgba(0, 0, 0, 0.15)' 
        : '0 4px 10px rgba(0, 0, 0, 0.05)';
      session.style.background = isDarkMode ? '#0f172a' : '#ffffff';
      
      // Appliquer les couleurs de bordure pour les sessions
      applySessionBorderColor(session, isDarkMode);
    });
  }
  
  // Fonction pour appliquer la couleur de bordure selon le statut de la carte
  function applyBorderColorByStatus(card, isDarkMode) {
    // Déterminer le statut
    const isInProgress = card.classList.contains('border-l-blue-400') || 
                         card.classList.contains('status-in_progress');
    const isCompleted = card.classList.contains('border-l-green-400') || 
                       card.classList.contains('status-completed');
    const isOnHold = card.classList.contains('border-l-yellow-400') || 
                    card.classList.contains('status-on_hold');
    
    // Appliquer les bordures colorées
    if (isInProgress) {
      card.style.borderLeftWidth = '10px';
      card.style.borderLeftColor = isDarkMode ? '#2563eb' : '#3b82f6';
    } else if (isCompleted) {
      card.style.borderLeftWidth = '10px';
      card.style.borderLeftColor = isDarkMode ? '#059669' : '#10b981';
    } else if (isOnHold) {
      card.style.borderLeftWidth = '10px';
      card.style.borderLeftColor = isDarkMode ? '#d97706' : '#f59e0b';
    } else {
      card.style.borderLeftWidth = '10px';
      card.style.borderLeftColor = isDarkMode ? '#475569' : '#64748b';
    }
  }
  
  // Fonction pour appliquer la couleur de bordure aux sessions
  function applySessionBorderColor(session, isDarkMode) {
    // Sessions actives
    if (session.classList.contains('border-l-blue-400')) {
      session.style.borderLeftWidth = '6px';
      session.style.borderLeftStyle = 'solid';
      session.style.borderLeftColor = isDarkMode ? '#2563eb' : '#3b82f6';
      session.style.background = isDarkMode 
        ? 'linear-gradient(135deg, rgba(30, 64, 175, 0.2) 0%, rgba(30, 58, 138, 0.2) 100%)'
        : 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)';
    }
    
    // Sessions en pause (via texte contenu)
    if (session.innerHTML.includes('on_hold')) {
      session.style.borderLeftWidth = '6px';
      session.style.borderLeftStyle = 'solid';
      session.style.borderLeftColor = isDarkMode ? '#d97706' : '#f59e0b';
      session.style.background = isDarkMode 
        ? 'linear-gradient(135deg, rgba(146, 64, 14, 0.2) 0%, rgba(120, 53, 15, 0.2) 100%)'
        : 'linear-gradient(135deg, #fefce8 0%, #fef9c3 100%)';
    }
    
    // Sessions terminées (via texte contenu)
    if (session.innerHTML.includes('completed')) {
      session.style.borderLeftWidth = '6px';
      session.style.borderLeftStyle = 'solid';
      session.style.borderLeftColor = isDarkMode ? '#059669' : '#10b981';
      session.style.background = isDarkMode 
        ? 'linear-gradient(135deg, rgba(6, 95, 70, 0.2) 0%, rgba(6, 78, 59, 0.2) 100%)'
        : 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)';
    }
  }
  
  // Appliquer les styles lors du chargement du script
  applyCardStyles();
  
  // Réappliquer les styles lors des changements de thème
  document.addEventListener('themeChange', forceCardStyles);
  
  // Réappliquer les styles périodiquement pour s'assurer qu'ils sont toujours appliqués
  setInterval(forceCardStyles, 2000);
})();
