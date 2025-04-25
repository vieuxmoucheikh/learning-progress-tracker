/**
 * Direct fix for calendar cell colors in light mode on mobile
 * This script applies background colors to calendar cells based on their activity status
 */
(function() {
  // Main function to fix calendar cell colors
  function fixCalendarCellColors() {
    // Only run on mobile in light mode
    const isLightMode = document.documentElement.getAttribute('data-theme') === 'light';
    const isMobile = window.innerWidth <= 768;
    
    if (!isLightMode || !isMobile) return;
    
    console.log("Applying calendar cell color fix for light mode on mobile");
    
    // Find all calendar cells
    const calendarCells = document.querySelectorAll('[class*="calendar"] [role="gridcell"], [class*="calendar"] td, [class*="calendar"] [class*="grid"] > div');
    
    calendarCells.forEach(cell => {
      // Find the main content div of the cell
      const dayContent = cell.querySelector('div[class*="flex"]');
      if (!dayContent) return;
      
      // Get the day number element to ensure it remains visible
      const dayNumber = dayContent.querySelector('div[class*="text-sm"]');
      if (dayNumber) {
        dayNumber.style.color = 'black';
        dayNumber.style.fontWeight = 'bold';
        dayNumber.style.textShadow = '0 0 2px white';
        dayNumber.style.zIndex = '5';
        dayNumber.style.position = 'relative';
      }
      
      // Check for activity indicators
      const hasActiveTask = cell.querySelector('.w-2.h-2.bg-blue-500, [class*="bg-blue-500"]');
      const hasCompletedTask = cell.querySelector('.w-2.h-2.bg-green-500, [class*="bg-green-500"]');
      const hasArchivedTask = cell.querySelector('.w-2.h-2.bg-gray-500, [class*="bg-gray-500"]');
      const hasSession = cell.querySelector('.w-2.h-2.bg-yellow-500, [class*="bg-yellow-500"]');
      
      // Apply background colors based on activity status
      if (hasActiveTask) {
        // Blue background for active tasks
        dayContent.style.backgroundColor = '#93c5fd'; // bg-blue-300
        dayContent.style.color = 'black';
      } else if (hasCompletedTask) {
        // Green background for completed tasks
        dayContent.style.backgroundColor = '#86efac'; // bg-green-300
        dayContent.style.color = 'black';
      } else if (hasArchivedTask) {
        // Gray background for archived tasks
        dayContent.style.backgroundColor = '#d1d5db'; // bg-gray-300
        dayContent.style.color = 'black';
      } else if (hasSession) {
        // Yellow background for sessions
        dayContent.style.backgroundColor = '#fcd34d'; // bg-yellow-300
        dayContent.style.color = 'black';
      }
      
      // Make sure the cell has rounded corners and proper padding
      dayContent.style.borderRadius = '8px';
      dayContent.style.padding = '4px';
      
      // Hide the small indicator dots since we're using cell background colors
      const indicators = cell.querySelectorAll('.w-2.h-2, [class*="w-2"][class*="h-2"]');
      indicators.forEach(indicator => {
        indicator.style.display = 'none';
      });
    });
  }
  
  // Function to apply the fix repeatedly to ensure it catches dynamically loaded content
  function applyFixRepeatedly() {
    // Run immediately
    fixCalendarCellColors();
    
    // Apply the fix every 500ms for the first 10 seconds after page load
    for (let i = 1; i <= 20; i++) {
      setTimeout(fixCalendarCellColors, i * 500);
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
      fixCalendarCellColors();
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
