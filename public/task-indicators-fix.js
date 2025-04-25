/**
 * Script to fix calendar indicators in light mode on mobile
 */
(function() {
  function fixCalendarIndicators() {
    // Only run on mobile in light mode
    const isLightMode = document.documentElement.getAttribute('data-theme') === 'light';
    const isMobile = window.innerWidth <= 768;
    
    if (!isLightMode || !isMobile) return;
    
    // Remove any weird blue points that might be showing up
    const pseudoElements = document.querySelectorAll('[class*="calendar"] *::after, [class*="calendar"] *::before');
    pseudoElements.forEach(el => {
      if (el.style) {
        el.style.display = 'none';
      }
    });
    
    // Find all calendar elements
    const calendarElements = document.querySelectorAll('[class*="calendar"]');
    
    calendarElements.forEach(calendar => {
      // Find all activity indicator containers
      const indicatorContainers = calendar.querySelectorAll('.absolute.bottom-1.right-1.flex');
      
      indicatorContainers.forEach(container => {
        // Make the container visible
        container.style.display = 'flex';
        container.style.visibility = 'visible';
        container.style.opacity = '1';
        container.style.zIndex = '9999';
        
        // Find all indicators
        const indicators = container.querySelectorAll('.w-2.h-2');
        
        indicators.forEach(indicator => {
          // Make all indicators larger and more visible
          indicator.style.width = '8px';
          indicator.style.height = '8px';
          indicator.style.borderRadius = '50%';
          indicator.style.border = '1px solid white';
          indicator.style.visibility = 'visible';
          indicator.style.opacity = '1';
          indicator.style.display = 'block';
          
          // Apply specific styles based on the indicator color
          if (indicator.classList.contains('bg-blue-500')) {
            // Blue indicator for active tasks
            indicator.style.backgroundColor = '#3b82f6';
            indicator.style.boxShadow = '0 0 4px rgba(59, 130, 246, 0.8)';
          } else if (indicator.classList.contains('bg-green-500')) {
            // Green indicator for completed tasks
            indicator.style.backgroundColor = '#10b981';
            indicator.style.boxShadow = '0 0 4px rgba(16, 185, 129, 0.8)';
          } else if (indicator.classList.contains('bg-gray-500')) {
            // Gray indicator for archived tasks
            indicator.style.backgroundColor = '#6b7280';
            indicator.style.boxShadow = '0 0 4px rgba(107, 114, 128, 0.8)';
          } else if (indicator.classList.contains('bg-yellow-500')) {
            // Yellow indicator for sessions
            indicator.style.backgroundColor = '#f59e0b';
            indicator.style.boxShadow = '0 0 4px rgba(245, 158, 11, 0.8)';
          }
        });
      });
      
      // Find all session indicators (they're in a different container)
      const sessionContainers = calendar.querySelectorAll('.absolute.bottom-1.right-1:not(.flex)');
      
      sessionContainers.forEach(container => {
        // Make the container visible
        container.style.display = 'block';
        container.style.visibility = 'visible';
        container.style.opacity = '1';
        container.style.zIndex = '9999';
        
        // Find the session indicator
        const sessionIndicator = container.querySelector('.w-2.h-2.bg-yellow-500');
        
        if (sessionIndicator) {
          // Make the session indicator larger and more visible
          sessionIndicator.style.width = '8px';
          sessionIndicator.style.height = '8px';
          sessionIndicator.style.borderRadius = '50%';
          sessionIndicator.style.border = '1px solid white';
          sessionIndicator.style.visibility = 'visible';
          sessionIndicator.style.opacity = '1';
          sessionIndicator.style.display = 'block';
          sessionIndicator.style.backgroundColor = '#f59e0b';
          sessionIndicator.style.boxShadow = '0 0 4px rgba(245, 158, 11, 0.8)';
        }
      });
    });
  }
  
  // Run immediately
  fixCalendarIndicators();
  
  // Run on window resize
  window.addEventListener('resize', fixCalendarIndicators);
  
  // Run when DOM content is loaded
  document.addEventListener('DOMContentLoaded', fixCalendarIndicators);
  
  // Run after a short delay to catch dynamically loaded content
  setTimeout(fixCalendarIndicators, 500);
  setTimeout(fixCalendarIndicators, 1000);
  setTimeout(fixCalendarIndicators, 2000);
  
  // Set up a mutation observer to detect changes in the DOM
  const observer = new MutationObserver(function(mutations) {
    fixCalendarIndicators();
  });
  
  // Start observing the document with the configured parameters
  observer.observe(document.body, { 
    childList: true, 
    subtree: true 
  });
})();
