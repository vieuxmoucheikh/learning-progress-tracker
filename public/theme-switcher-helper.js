/**
 * Enhanced Theme Switcher Helper
 * Advanced approach for perfectly clean theme transitions
 */

(function() {
  // Create a style element for critical theme styles
  const createCriticalStyles = () => {
    const style = document.createElement('style');
    style.id = 'critical-theme-styles';
    style.textContent = `
      /* Immediately hide content during theme transition */
      .theme-transitioning body {
        opacity: 0 !important;
        transition: opacity 0ms !important;
      }
      
      /* Ensure content appears smoothly after theme is applied */
      body:not(.theme-transitioning) {
        transition: opacity 300ms ease-in !important;
      }
      
      /* Prevent any layout shifts */
      html, body, #root {
        min-height: 100vh;
        width: 100%;
      }
    `;
    document.head.appendChild(style);
  };
  
  // Create and inject critical styles immediately
  createCriticalStyles();
  
  // Check if we're coming from a theme switch
  const isThemeSwitching = sessionStorage.getItem('theme-switching') === 'true';
  const currentTheme = localStorage.getItem('theme') || 'light';
  const isMobile = window.innerWidth <= 768;
  
  // Apply theme immediately on page load
  document.documentElement.setAttribute('data-theme', currentTheme);
  
  if (currentTheme === 'dark') {
    document.documentElement.classList.add('dark');
    document.documentElement.classList.remove('light');
  } else {
    document.documentElement.classList.add('light');
    document.documentElement.classList.remove('dark');
  }
  
  // Handle mobile specific classes
  if (currentTheme === 'light' && isMobile) {
    document.documentElement.classList.add('mobile-light-theme');
  } else {
    document.documentElement.classList.remove('mobile-light-theme');
  }
  
  // If coming from a theme switch, handle transition
  if (isThemeSwitching) {
    // Add transitioning class immediately
    document.documentElement.classList.add('theme-transitioning');
    
    // Clear the flag
    sessionStorage.removeItem('theme-switching');
    
    // Wait for all resources to load before showing content
    window.addEventListener('load', () => {
      // Small delay to ensure all styles are applied
      setTimeout(() => {
        // Remove transitioning class
        document.documentElement.classList.remove('theme-transitioning');
      }, 100);
    });
  }
  
  // Listen for theme changes to set the flag for page refreshes/navigations
  document.addEventListener('themeChanged', (e) => {
    // Set flag for page refreshes/navigations
    sessionStorage.setItem('theme-switching', 'true');
    
    // Add transitioning class immediately
    document.documentElement.classList.add('theme-transitioning');
  });
})();
