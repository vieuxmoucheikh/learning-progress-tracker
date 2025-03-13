// Script de correction d'urgence pour les icônes en mode sombre
(function() {
  // Attendre que le DOM soit chargé
  document.addEventListener('DOMContentLoaded', function() {
    // Vérifier si nous sommes en mode sombre
    const isDarkMode = document.documentElement.classList.contains('dark');
    
    if (isDarkMode) {
      // Sélectionner toutes les icônes SVG dans le dashboard
      const iconSelectors = [
        '.dashboard-container svg',
        '[class*="dashboard"] svg',
        '[id*="dashboard"] svg',
        '.bg-blue-100 svg',
        '.bg-green-100 svg',
        '.bg-purple-100 svg',
        '.bg-amber-100 svg',
        '.from-blue-50 svg',
        '.from-green-50 svg',
        '.from-purple-50 svg',
        '.from-amber-50 svg'
      ];
      
      // Appliquer les styles directement aux SVG
      iconSelectors.forEach(selector => {
        const icons = document.querySelectorAll(selector);
        icons.forEach(icon => {
          icon.style.fill = 'none';
          icon.style.strokeWidth = '2px';
          
          // S'assurer que tous les chemins à l'intérieur ne sont pas remplis
          const paths = icon.querySelectorAll('path');
          paths.forEach(path => {
            path.style.fill = 'none';
          });
          
          // Appliquer la couleur en fonction de la classe parente
          if (icon.closest('.bg-blue-100, .from-blue-50') || 
              icon.classList.contains('lucide-calendar') || 
              icon.classList.contains('lucide-clock')) {
            icon.style.color = '#60a5fa';
            icon.style.stroke = '#60a5fa';
          } 
          else if (icon.closest('.bg-green-100, .from-green-50') || 
                   icon.classList.contains('lucide-check-circle') ||
                   icon.classList.contains('lucide-check-circle-2') ||
                   icon.classList.contains('lucide-target')) {
            icon.style.color = '#34d399';
            icon.style.stroke = '#34d399';
          }
          else if (icon.closest('.bg-purple-100, .from-purple-50') || 
                   icon.classList.contains('lucide-book-open')) {
            icon.style.color = '#a78bfa';
            icon.style.stroke = '#a78bfa';
          }
          else if (icon.closest('.bg-amber-100, .from-amber-50') || 
                   icon.classList.contains('lucide-trophy')) {
            icon.style.color = '#fbbf24';
            icon.style.stroke = '#fbbf24';
          }
        });
      });
      
      // Correction pour les fonds colorés
      document.querySelectorAll('.bg-blue-100').forEach(el => {
        el.style.backgroundColor = 'rgba(30, 58, 138, 0.8)';
      });
      
      document.querySelectorAll('.bg-green-100').forEach(el => {
        el.style.backgroundColor = 'rgba(6, 78, 59, 0.8)';
      });
      
      document.querySelectorAll('.bg-purple-100').forEach(el => {
        el.style.backgroundColor = 'rgba(76, 29, 149, 0.8)';
      });
      
      document.querySelectorAll('.bg-amber-100').forEach(el => {
        el.style.backgroundColor = 'rgba(120, 53, 15, 0.8)';
      });
    }
    
    // Observer les changements du mode sombre/clair
    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        if (mutation.attributeName === 'class' && 
            mutation.target === document.documentElement && 
            document.documentElement.classList.contains('dark')) {
          // Le mode sombre a été activé, réappliquer les corrections
          setTimeout(() => {
            // Rappeler la fonction principale
            document.dispatchEvent(new Event('DOMContentLoaded'));
          }, 100);
        }
      });
    });
    
    // Observer les changements de classe sur l'élément html
    observer.observe(document.documentElement, { attributes: true });
  });

  // Ajouter un gestionnaire pour React qui s'exécute après les mises à jour du DOM
  const runFixes = () => {
    // Vérifier si nous sommes en mode sombre
    if (document.documentElement.classList.contains('dark')) {
      // Cibler spécifiquement les icônes du dashboard
      document.querySelectorAll('[class*="dashboard"] svg').forEach(icon => {
        // Empêcher le remplissage des SVG
        icon.setAttribute('fill', 'none');
        icon.style.fill = 'none';
        
        // Parcourir tous les éléments enfants
        icon.querySelectorAll('*').forEach(child => {
          child.setAttribute('fill', 'none');
          child.style.fill = 'none';
        });
      });
    }
  };
  
  // Exécuter les corrections toutes les secondes pour attraper les mises à jour dynamiques
  setInterval(runFixes, 1000);
})();
