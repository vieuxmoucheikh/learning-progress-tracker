/**
 * Script pour appliquer dynamiquement des styles aux cartes d'apprentissage
 * à exécuter après le chargement du DOM
 */
(function() {
  function applyCardStyles() {
    // Sélectionner toutes les cartes d'apprentissage
    const cards = document.querySelectorAll('.learning-item-card > .card, .item-wrapper > .card');
    
    // Appliquer les styles à chaque carte
    cards.forEach(card => {
      // Appliquer les styles de base
      card.style.border = '3px solid #cbd5e1';
      card.style.borderLeftWidth = '8px';
      card.style.borderLeftColor = '#3b82f6';
      card.style.borderRadius = '18px';
      card.style.boxShadow = '0 10px 25px rgba(0, 0, 0, 0.1)';
      card.style.overflow = 'hidden';
      card.style.marginBottom = '32px';
      
      // Appliquer des styles différents selon la classe de bordure
      if (card.classList.contains('border-l-gray-300')) {
        card.style.borderLeftColor = '#94a3b8';
      } else if (card.classList.contains('border-l-blue-400')) {
        card.style.borderLeftColor = '#3b82f6';
      } else if (card.classList.contains('border-l-green-400')) {
        card.style.borderLeftColor = '#22c55e';
      } else if (card.classList.contains('border-l-yellow-400')) {
        card.style.borderLeftColor = '#facc15';
      } else if (card.classList.contains('border-l-gray-400')) {
        card.style.borderLeftColor = '#64748b';
      }
      
      // Ajouter des attributs de données pour les sélecteurs CSS
      card.setAttribute('data-component', 'learning-card');
      card.setAttribute('data-styled', 'true');
      
      // Ajouter une classe pour les sélecteurs CSS
      card.classList.add('force-card-style');
    });
  }
  
  // Appliquer les styles au chargement initial
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyCardStyles);
  } else {
    applyCardStyles();
  }
  
  // Appliquer les styles périodiquement pour les cartes dynamiquement ajoutées
  setInterval(applyCardStyles, 1000);
  
  // Observer les modifications du DOM pour appliquer les styles aux nouvelles cartes
  const observer = new MutationObserver(mutations => {
    for (const mutation of mutations) {
      if (mutation.type === 'childList' && mutation.addedNodes.length) {
        applyCardStyles();
        break;
      }
    }
  });
  
  // Observer les modifications de l'arbre DOM
  observer.observe(document.body, { childList: true, subtree: true });
})();
