/**
 * Script pour améliorer la visibilité des cartes d'apprentissage en mode clair sur mobile
 */
(function() {
  const isMobile = window.innerWidth <= 768;
  const isLightMode = document.documentElement.getAttribute('data-theme') === 'light';
  
  function enhanceCardContrast() {
    if (isMobile && isLightMode) {
      const cards = document.querySelectorAll('.learning-item-card');
      cards.forEach(card => {
        // Assurer que les cartes ont un bon contraste
        card.style.backgroundColor = '#f8f9fa';
        card.style.borderColor = '#e0e0e0';
        
        // Assurer que le texte est lisible
        const titles = card.querySelectorAll('h3, .card-title');
        titles.forEach(title => title.style.color = '#111827');
        
        const paragraphs = card.querySelectorAll('p, .card-description');
        paragraphs.forEach(p => p.style.color = '#374151');
        
        // Assurer que les icônes sont visibles
        const icons = card.querySelectorAll('.card-icon, svg');
        icons.forEach(icon => icon.style.color = '#4b5563');
      });
    }
  }
  
  // Appliquer les améliorations au chargement
  if (document.readyState === 'complete') {
    enhanceCardContrast();
  } else {
    window.addEventListener('load', enhanceCardContrast);
  }
  
  // Observer les changements de thème
  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      if (mutation.attributeName === 'data-theme') {
        enhanceCardContrast();
      }
    });
  });
  
  observer.observe(document.documentElement, { attributes: true });
  
  // Réappliquer lors du changement de taille d'écran
  window.addEventListener('resize', () => {
    if (window.innerWidth <= 768) {
      enhanceCardContrast();
    }
  });
})();
