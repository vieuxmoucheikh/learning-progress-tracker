/**
 * Enhanced Theme Switcher Helper
 * Ensures instant theme application with no flicker or layout shifts
 */

(function() {
  // Apply theme immediately on page load before any rendering
  function applyThemeImmediately() {
    // Get stored theme or use system preference
    const storedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = storedTheme || (systemPrefersDark ? 'dark' : 'light');
    
    // Add transitioning class to block animations during initial render
    document.documentElement.classList.add('theme-transitioning');
    
    // Apply theme attributes and classes
    document.documentElement.setAttribute('data-theme', theme);
    
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    }
    
    // Handle mobile specific classes
    const isMobile = window.innerWidth <= 768;
    if (theme === 'light' && isMobile) {
      document.documentElement.classList.add('mobile-light-theme');
    } else {
      document.documentElement.classList.remove('mobile-light-theme');
    }
    
    // Store the theme for consistency
    if (!storedTheme) {
      localStorage.setItem('theme', theme);
    }
  }
  
  // Apply theme immediately
  applyThemeImmediately();
  
  // Remove transitioning class after DOM is fully loaded
  document.addEventListener('DOMContentLoaded', () => {
    // Short delay to ensure styles are applied
    setTimeout(() => {
      document.documentElement.classList.remove('theme-transitioning');
    }, 50);
  });
  
  // Handle theme changes between page navigations
  document.addEventListener('themeChanged', (e) => {
    // Store that we're in the middle of a theme change
    sessionStorage.setItem('theme-switching', 'true');
    // Store the new theme for immediate application on next page load
    if (e.detail && e.detail.theme) {
      localStorage.setItem('theme', e.detail.theme);
    }
  });
  
  // If we're coming from a theme switch, ensure smooth transition
  if (sessionStorage.getItem('theme-switching') === 'true') {
    sessionStorage.removeItem('theme-switching');
    // Force a repaint to ensure clean transition
    document.body.style.display = 'none';
    document.body.offsetHeight; // Force reflow
    document.body.style.display = '';
  }
})();
