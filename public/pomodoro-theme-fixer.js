/**
 * Pomodoro Theme Fixer
 * Ensures consistent button colors and UI elements when switching themes
 */
(function() {
  function fixPomodoroThemeColors() {
    // Only run if we're in light mode
    const isLightMode = document.documentElement.getAttribute('data-theme') === 'light';
    
    if (isLightMode) {
      // Find all pomodoro timer containers
      const pomodoroContainers = document.querySelectorAll('.pomodoro-timer');
      
      pomodoroContainers.forEach(container => {
        // Fix start/pause button
        const startPauseButtons = container.querySelectorAll('button[name="start"], button[name="pause"]');
        startPauseButtons.forEach(button => {
          button.style.backgroundColor = '#3b82f6';
          button.style.color = 'white';
          button.style.borderColor = '#2563eb';
          
          // Add hover event listeners
          button.addEventListener('mouseenter', function() {
            this.style.backgroundColor = '#2563eb';
          });
          
          button.addEventListener('mouseleave', function() {
            this.style.backgroundColor = '#3b82f6';
          });
        });
        
        // Fix skip button
        const skipButtons = container.querySelectorAll('button[name="skip"]');
        skipButtons.forEach(button => {
          button.style.backgroundColor = '#334155';
          button.style.color = 'white';
          button.style.borderColor = '#475569';
          
          // Add hover event listeners
          button.addEventListener('mouseenter', function() {
            this.style.backgroundColor = '#475569';
          });
          
          button.addEventListener('mouseleave', function() {
            this.style.backgroundColor = '#334155';
          });
        });
        
        // Fix settings button
        const settingsButtons = container.querySelectorAll('button[name="settings"]');
        settingsButtons.forEach(button => {
          button.style.backgroundColor = '#334155';
          button.style.color = 'white';
          button.style.borderColor = '#475569';
          
          // Add hover event listeners
          button.addEventListener('mouseenter', function() {
            this.style.backgroundColor = '#475569';
          });
          
          button.addEventListener('mouseleave', function() {
            this.style.backgroundColor = '#334155';
          });
        });
        
        // Fix task buttons
        const taskButtons = container.querySelectorAll('li button');
        taskButtons.forEach(button => {
          if (button.classList.contains('bg-blue-500')) {
            button.style.backgroundColor = '#3b82f6';
            button.style.color = 'white';
            
            // Add hover event listeners
            button.addEventListener('mouseenter', function() {
              this.style.backgroundColor = '#2563eb';
            });
            
            button.addEventListener('mouseleave', function() {
              this.style.backgroundColor = '#3b82f6';
            });
          } else if (button.textContent.trim() === 'Start') {
            button.style.backgroundColor = 'rgba(59, 130, 246, 0.2)';
            button.style.color = '#1d4ed8';
            
            // Add hover event listeners
            button.addEventListener('mouseenter', function() {
              this.style.backgroundColor = 'rgba(59, 130, 246, 0.3)';
            });
            
            button.addEventListener('mouseleave', function() {
              this.style.backgroundColor = 'rgba(59, 130, 246, 0.2)';
            });
          }
        });
        
        // Fix tooltips
        const tooltips = container.querySelectorAll('[role="tooltip"]');
        tooltips.forEach(tooltip => {
          tooltip.style.backgroundColor = '#2563eb';
          tooltip.style.color = 'white';
          tooltip.style.borderColor = '#1d4ed8';
        });
        
        // Fix pomodoro status badge
        const statusBadges = container.querySelectorAll('.pomodoro-status > div');
        statusBadges.forEach(badge => {
          badge.style.backgroundColor = '#2563eb';
        });
        
        // Fix checkboxes
        const checkboxes = container.querySelectorAll('[data-state="checked"]');
        checkboxes.forEach(checkbox => {
          checkbox.style.backgroundColor = '#3b82f6';
          checkbox.style.borderColor = '#2563eb';
        });
      });
    }
  }
  
  // Run immediately
  fixPomodoroThemeColors();
  
  // Run when DOM content is loaded
  document.addEventListener('DOMContentLoaded', fixPomodoroThemeColors);
  
  // Run when theme changes
  document.addEventListener('themeChanged', function(e) {
    // Small delay to ensure the theme has been applied
    setTimeout(fixPomodoroThemeColors, 100);
  });
  
  // Set up a mutation observer to detect changes in the DOM
  const observer = new MutationObserver(function(mutations) {
    fixPomodoroThemeColors();
  });
  
  // Start observing the document with the configured parameters
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme', 'class'],
    childList: true,
    subtree: true
  });
})();
