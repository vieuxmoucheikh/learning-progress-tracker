/**
 * Theme Switcher Helper
 * This script helps ensure smooth theme transitions without flickering or layout shifts
 */

(function() {
  // Check if we're coming from a theme switch
  const isThemeSwitching = sessionStorage.getItem('theme-switching') === 'true';
  
  if (isThemeSwitching) {
    // Add transitioning class immediately on page load
    document.documentElement.classList.add('theme-transitioning');
    
    // Clear the flag
    sessionStorage.removeItem('theme-switching');
    
    // Get the current theme
    const currentTheme = localStorage.getItem('theme') || 'light';
    
    // Apply theme immediately
    document.documentElement.setAttribute('data-theme', currentTheme);
    
    if (currentTheme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    }
    
    // Handle mobile specific classes
    const isMobile = window.innerWidth <= 768;
    if (currentTheme === 'light' && isMobile) {
      document.documentElement.classList.add('mobile-light-theme');
    } else {
      document.documentElement.classList.remove('mobile-light-theme');
    }
    
    // Remove transitioning class after a delay
    setTimeout(() => {
      requestAnimationFrame(() => {
        document.documentElement.classList.remove('theme-transitioning');
      });
    }, 300);
  }
  
  // Listen for theme changes to set the flag for page refreshes/navigations
  document.addEventListener('themeChanged', () => {
    sessionStorage.setItem('theme-switching', 'true');
  });
})();
