/**
 * Simplified Theme Switcher Helper
 * Ensures clean theme transitions without unwanted styles
 */

(function() {
  // Apply theme immediately on page load
  document.addEventListener('DOMContentLoaded', function() {
    // Add transitioning class immediately
    document.documentElement.classList.add('theme-transitioning');
    
    // Get the current theme
    const currentTheme = localStorage.getItem('theme') || 'light';
    
    // Apply theme immediately
    document.documentElement.setAttribute('data-theme', currentTheme);
    document.documentElement.classList.add(currentTheme);
    document.documentElement.classList.remove(currentTheme === 'light' ? 'dark' : 'light');
    
    // Handle mobile specific classes
    if (window.innerWidth <= 768 && currentTheme === 'light') {
      document.documentElement.classList.add('mobile-light-theme');
    }
    
    // Remove transitioning class after a delay
    setTimeout(() => {
      document.documentElement.classList.remove('theme-transitioning');
    }, 400);
  });
  
  // Prevent any transitions during theme changes
  document.addEventListener('themeChanged', function(e) {
    // Immediately add transitioning class
    document.documentElement.classList.add('theme-transitioning');
    
    // Force a reflow
    document.documentElement.offsetHeight;
    
    // The theme will be changed by the ThemeProvider component
    // We just need to ensure transitions are disabled during the change
  });
})();
