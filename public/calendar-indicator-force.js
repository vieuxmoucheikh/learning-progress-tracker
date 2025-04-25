/**
 * Aggressive fix for calendar indicators in light mode on mobile
 * This script directly modifies the calendar DOM to ensure indicators are visible
 */
(function() {
  // Main function to fix calendar indicators
  function forceCalendarIndicators() {
    // Only run on mobile in light mode
    const isLightMode = document.documentElement.getAttribute('data-theme') === 'light';
    const isMobile = window.innerWidth <= 768;
    
    if (!isLightMode || !isMobile) return;
    
    console.log("Applying calendar indicator fix for light mode on mobile");
    
    // Find all calendar cells
    const calendarCells = document.querySelectorAll('[class*="calendar"] [role="gridcell"], [class*="calendar"] td, [class*="calendar"] [class*="grid"] > div');
    
    calendarCells.forEach(cell => {
      // Remove task count badges
      const countBadges = cell.querySelectorAll('.absolute.top-1.right-1, [class*="absolute"][class*="top-1"][class*="right-1"]');
      countBadges.forEach(badge => badge.remove());
      
      // Find all activity indicators
      const indicators = cell.querySelectorAll('.w-2.h-2, [class*="w-2"][class*="h-2"]');
      
      if (indicators.length > 0) {
        // Create a new container for indicators if needed
        let container = cell.querySelector('.indicator-container');
        if (!container) {
          container = document.createElement('div');
          container.className = 'indicator-container';
          container.style.position = 'absolute';
          container.style.bottom = '2px';
          container.style.right = '2px';
          container.style.display = 'flex';
          container.style.gap = '2px';
          container.style.zIndex = '9999';
          cell.appendChild(container);
        }
        
        // Process each indicator
        indicators.forEach(indicator => {
          // Get the background color class
          let colorClass = '';
          if (indicator.classList.contains('bg-blue-500') || indicator.className.includes('bg-blue-500')) {
            colorClass = 'blue';
          } else if (indicator.classList.contains('bg-green-500') || indicator.className.includes('bg-green-500')) {
            colorClass = 'green';
          } else if (indicator.classList.contains('bg-gray-500') || indicator.className.includes('bg-gray-500')) {
            colorClass = 'gray';
          } else if (indicator.classList.contains('bg-yellow-500') || indicator.className.includes('bg-yellow-500')) {
            colorClass = 'yellow';
          }
          
          // Create a new enhanced indicator
          if (colorClass && !container.querySelector(`.enhanced-indicator.${colorClass}`)) {
            const enhancedIndicator = document.createElement('div');
            enhancedIndicator.className = `enhanced-indicator ${colorClass}`;
            enhancedIndicator.style.width = '10px';
            enhancedIndicator.style.height = '10px';
            enhancedIndicator.style.borderRadius = '50%';
            enhancedIndicator.style.border = '2px solid white';
            enhancedIndicator.style.boxShadow = '0 0 4px rgba(0, 0, 0, 0.5)';
            
            // Apply color based on type
            switch (colorClass) {
              case 'blue':
                enhancedIndicator.style.backgroundColor = '#2563eb';
                enhancedIndicator.style.boxShadow = '0 0 6px rgba(37, 99, 235, 1)';
                break;
              case 'green':
                enhancedIndicator.style.backgroundColor = '#16a34a';
                enhancedIndicator.style.boxShadow = '0 0 6px rgba(22, 163, 74, 1)';
                break;
              case 'gray':
                enhancedIndicator.style.backgroundColor = '#4b5563';
                enhancedIndicator.style.boxShadow = '0 0 6px rgba(75, 85, 99, 1)';
                break;
              case 'yellow':
                enhancedIndicator.style.backgroundColor = '#d97706';
                enhancedIndicator.style.boxShadow = '0 0 6px rgba(217, 119, 6, 1)';
                break;
            }
            
            container.appendChild(enhancedIndicator);
          }
        });
      }
    });
  }
  
  // Function to apply the fix repeatedly to ensure it catches dynamically loaded content
  function applyFixRepeatedly() {
    // Run immediately
    forceCalendarIndicators();
    
    // Apply the fix every 500ms for the first 10 seconds after page load
    for (let i = 1; i <= 20; i++) {
      setTimeout(forceCalendarIndicators, i * 500);
    }
  }
  
  // Run on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyFixRepeatedly);
  } else {
    applyFixRepeatedly();
  }
  
  // Run on theme changes
  document.addEventListener('themeChanged', applyFixRepeatedly);
  
  // Run on window resize
  window.addEventListener('resize', applyFixRepeatedly);
  
  // Set up a mutation observer to detect changes in the DOM
  const observer = new MutationObserver(function(mutations) {
    // Check if any of the mutations involve the calendar
    const calendarMutation = mutations.some(mutation => {
      return mutation.target.className && 
             (typeof mutation.target.className === 'string' && 
              mutation.target.className.includes('calendar'));
    });
    
    if (calendarMutation) {
      forceCalendarIndicators();
    }
  });
  
  // Start observing the document with the configured parameters
  observer.observe(document.body, { 
    childList: true, 
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'style']
  });
})();
