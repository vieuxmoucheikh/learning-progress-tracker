/**
 * Direct fix for calendar indicators in light mode on mobile
 * This script directly modifies the calendar component's styling
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
    
    // Hide the task count badges
    const taskCountBadges = document.querySelectorAll('[class*="calendar"] .absolute.top-1.right-1');
    taskCountBadges.forEach(badge => {
      badge.style.display = 'none';
    });
    
    // Find all calendar cells
    const calendarCells = document.querySelectorAll('[class*="calendar"] [role="gridcell"], [class*="calendar"] td');
    
    calendarCells.forEach(cell => {
      // Make sure the cell has position relative for absolute positioning
      cell.style.position = 'relative';
      
      // Find the day content div (the main div inside the cell)
      const dayContent = cell.querySelector('div');
      if (dayContent) {
        // Apply styles to make sure the background color is visible
        dayContent.style.backgroundColor = 'transparent';
        dayContent.style.background = 'transparent';
      }
      
      // Find activity indicators
      const activityContainer = cell.querySelector('.absolute.bottom-1.right-1.flex');
      if (activityContainer) {
        // Make the container visible
        activityContainer.style.display = 'flex';
        activityContainer.style.visibility = 'visible';
        activityContainer.style.opacity = '1';
        activityContainer.style.zIndex = '9999';
        activityContainer.style.bottom = '2px';
        activityContainer.style.right = '2px';
        
        // Find all indicators
        const indicators = activityContainer.querySelectorAll('.w-2.h-2');
        
        indicators.forEach(indicator => {
          // Make all indicators larger and more visible
          indicator.style.width = '10px';
          indicator.style.height = '10px';
          indicator.style.borderRadius = '50%';
          indicator.style.border = '2px solid white';
          indicator.style.visibility = 'visible';
          indicator.style.opacity = '1';
          indicator.style.display = 'block';
          
          // Apply specific styles based on the indicator color
          if (indicator.classList.contains('bg-blue-500')) {
            // Blue indicator for active tasks
            indicator.style.backgroundColor = '#3b82f6';
            indicator.style.boxShadow = '0 0 6px rgba(59, 130, 246, 1)';
          } else if (indicator.classList.contains('bg-green-500')) {
            // Green indicator for completed tasks
            indicator.style.backgroundColor = '#10b981';
            indicator.style.boxShadow = '0 0 6px rgba(16, 185, 129, 1)';
          } else if (indicator.classList.contains('bg-gray-500')) {
            // Gray indicator for archived tasks
            indicator.style.backgroundColor = '#6b7280';
            indicator.style.boxShadow = '0 0 6px rgba(107, 114, 128, 1)';
          }
        });
      }
      
      // Find session indicator (it's in a different container)
      const sessionContainer = cell.querySelector('.absolute.bottom-1.right-1:not(.flex)');
      if (sessionContainer) {
        // Make the container visible
        sessionContainer.style.display = 'block';
        sessionContainer.style.visibility = 'visible';
        sessionContainer.style.opacity = '1';
        sessionContainer.style.zIndex = '9999';
        sessionContainer.style.bottom = '2px';
        sessionContainer.style.right = '2px';
        
        // Find the session indicator
        const sessionIndicator = sessionContainer.querySelector('.w-2.h-2.bg-yellow-500');
        
        if (sessionIndicator) {
          // Make the session indicator larger and more visible
          sessionIndicator.style.width = '10px';
          sessionIndicator.style.height = '10px';
          sessionIndicator.style.borderRadius = '50%';
          sessionIndicator.style.border = '2px solid white';
          sessionIndicator.style.visibility = 'visible';
          sessionIndicator.style.opacity = '1';
          sessionIndicator.style.display = 'block';
          sessionIndicator.style.backgroundColor = '#f59e0b';
          sessionIndicator.style.boxShadow = '0 0 6px rgba(245, 158, 11, 1)';
        }
      }
    });
  }
  
  // Function to apply the fix repeatedly to ensure it catches dynamically loaded content
  function applyFixRepeatedly() {
    fixCalendarIndicators();
    
    // Apply the fix every 500ms for the first 5 seconds
    for (let i = 1; i <= 10; i++) {
      setTimeout(fixCalendarIndicators, i * 500);
    }
  }
  
  // Run immediately
  applyFixRepeatedly();
  
  // Run on window resize
  window.addEventListener('resize', applyFixRepeatedly);
  
  // Run when DOM content is loaded
  document.addEventListener('DOMContentLoaded', applyFixRepeatedly);
  
  // Set up a mutation observer to detect changes in the DOM
  const observer = new MutationObserver(function(mutations) {
    fixCalendarIndicators();
  });
  
  // Start observing the document with the configured parameters
  observer.observe(document.body, { 
    childList: true, 
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'style']
  });
})();
