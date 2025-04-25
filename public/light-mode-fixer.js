/**
 * Light Mode Fixer
 * This script ensures proper light mode rendering by applying critical fixes
 * to the DOM as early as possible during page load.
 */

(function() {
  // Check if we're in light mode
  const isLightMode = () => {
    const storedTheme = localStorage.getItem('theme');
    if (storedTheme === 'light') return true;
    if (storedTheme === 'dark') return false;
    
    // Check system preference if no stored preference
    return window.matchMedia && !window.matchMedia('(prefers-color-scheme: dark)').matches;
  };

  // Apply light mode fixes
  const applyLightModeFixes = () => {
    if (isLightMode()) {
      // Add light mode class to html element
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', 'light');
      
      // Apply critical light mode styles
      const style = document.createElement('style');
      style.textContent = `
        body, #root {
          background-color: #f8fafc !important;
          color: #0f172a !important;
        }
        
        .card, [class*="Card"], [class*="-card"] {
          background-color: #ffffff !important;
          border: 1px solid rgba(0, 0, 0, 0.1) !important;
        }
      `;
      document.head.appendChild(style);
    }
  };

  // Run immediately
  applyLightModeFixes();
  
  // Also run when DOM is fully loaded
  document.addEventListener('DOMContentLoaded', applyLightModeFixes);
})();
