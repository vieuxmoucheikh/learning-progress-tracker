/**
 * Special fix for authentication buttons during theme transitions
 * This script specifically targets sign up, login, and auth buttons
 */

(function() {
  // Function to hide auth buttons during theme transition
  const hideAuthButtons = () => {
    // Listen for theme transition class changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          const htmlElement = document.documentElement;
          
          if (htmlElement.classList.contains('theme-transitioning')) {
            // Find and hide all auth-related buttons
            const authButtons = document.querySelectorAll('button, [role="button"], a');
            
            authButtons.forEach(button => {
              const buttonText = button.textContent?.toLowerCase() || '';
              const buttonClasses = button.className?.toLowerCase() || '';
              
              // Check if this is an auth-related button
              if (
                buttonText.includes('sign') || 
                buttonText.includes('login') || 
                buttonText.includes('log in') || 
                buttonText.includes('register') ||
                buttonClasses.includes('sign') ||
                buttonClasses.includes('login') ||
                buttonClasses.includes('auth')
              ) {
                // Apply extreme hiding
                button.style.display = 'none';
                button.style.opacity = '0';
                button.style.visibility = 'hidden';
                button.style.pointerEvents = 'none';
                button.style.position = 'absolute';
                button.style.transform = 'translateX(-9999px)';
              }
            });
          }
        }
      });
    });
    
    // Start observing
    observer.observe(document.documentElement, { attributes: true });
  };
  
  // Run on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', hideAuthButtons);
  } else {
    hideAuthButtons();
  }
})();
