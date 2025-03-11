/**
 * Gestionnaire de thème pour basculer entre mode clair et sombre
 */
(function() {
  // Éléments DOM
  const themeToggle = document.getElementById('theme-toggle');
  const htmlElement = document.documentElement;
  const bodyElement = document.body;
  
  // Fonctions utilitaires
  const isDarkMode = () => htmlElement.classList.contains('dark-mode');
  
  // Initialisation du thème basé sur les préférences utilisateur
  function initTheme() {
    // Vérifier le localstorage en priorité
    const savedTheme = localStorage.getItem('theme');
    
    if (savedTheme) {
      // Appliquer le thème sauvegardé
      if (savedTheme === 'dark') {
        enableDarkMode();
      } else {
        enableLightMode();
      }
    } else {
      // Vérifier les préférences système
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        enableDarkMode();
      } else {
        enableLightMode();
      }
    }
    
    // Activer les transitions après le chargement initial pour éviter les flashs
    setTimeout(() => {
      htmlElement.classList.add('transition-ready');
    }, 100);
  }
  
  // Activer le mode sombre
  function enableDarkMode() {
    htmlElement.classList.add('dark-mode');
    bodyElement.classList.add('dark-mode');
    localStorage.setItem('theme', 'dark');
    updateThemeToggleIcon(true);
  }
  
  // Activer le mode clair
  function enableLightMode() {
    htmlElement.classList.remove('dark-mode');
    bodyElement.classList.remove('dark-mode');
    localStorage.setItem('theme', 'light');
    updateThemeToggleIcon(false);
  }
  
  // Mettre à jour l'icône du bouton de basculement
  function updateThemeToggleIcon(isDark) {
    const lightIcon = themeToggle.querySelector('.light-icon');
    const darkIcon = themeToggle.querySelector('.dark-icon');
    
    if (isDark) {
      lightIcon.style.display = 'none';
      darkIcon.style.display = 'block';
    } else {
      lightIcon.style.display = 'block';
      darkIcon.style.display = 'none';
    }
  }
  
  // Basculer le thème
  function toggleTheme() {
    // Ajouter une classe pour gérer la transition proprement
    htmlElement.classList.add('transition');
    
    if (isDarkMode()) {
      enableLightMode();
    } else {
      enableDarkMode();
    }
    
    // Retirer la classe après la transition
    setTimeout(() => {
      htmlElement.classList.remove('transition');
    }, 500);
  }
  
  // Event listeners
  if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
  }
  
  // Observer les changements de préférences système
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
      if (!localStorage.getItem('theme')) {
        if (e.matches) {
          enableDarkMode();
        } else {
          enableLightMode();
        }
      }
    });
  }
  
  // Initialiser le thème au chargement
  document.addEventListener('DOMContentLoaded', initTheme);
  
  // S'assurer que l'initialisation est exécutée même si l'événement DOMContentLoaded est déjà passé
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    initTheme();
  }
})();
