/**
 * Script to forcefully add visible task indicators to calendar cells on mobile in light mode
 */
(function() {
  function addVisibleTaskIndicators() {
    // Only run on mobile in light mode
    const isLightMode = document.documentElement.getAttribute('data-theme') === 'light';
    const isMobile = window.innerWidth <= 768;
    
    if (!isLightMode || !isMobile) return;
    
    // Find all calendar elements
    const calendarElements = document.querySelectorAll('[class*="calendar"]');
    
    calendarElements.forEach(calendar => {
      // Find all calendar cells
      const cells = calendar.querySelectorAll('td, [role="gridcell"]');
      
      cells.forEach(cell => {
        // Clear existing indicators we might have added
        const existingIndicators = cell.querySelectorAll('.task-indicator-js');
        existingIndicators.forEach(indicator => indicator.remove());
        
        // Check if this cell has any activity classes
        const hasActivity = 
          cell.className.includes('activity') || 
          cell.className.includes('items') || 
          cell.className.includes('has-completed') || 
          cell.className.includes('has-active') ||
          cell.className.includes('in-progress') ||
          cell.className.includes('completed');
        
        if (hasActivity) {
          // Create container for indicators
          const indicatorContainer = document.createElement('div');
          indicatorContainer.className = 'task-indicator-container-js';
          indicatorContainer.style.position = 'absolute';
          indicatorContainer.style.bottom = '2px';
          indicatorContainer.style.left = '0';
          indicatorContainer.style.right = '0';
          indicatorContainer.style.display = 'flex';
          indicatorContainer.style.justifyContent = 'center';
          indicatorContainer.style.gap = '4px';
          indicatorContainer.style.zIndex = '100';
          
          // Determine what types of indicators to add
          const hasCompleted = 
            cell.className.includes('completed') || 
            cell.className.includes('has-completed');
          
          const hasActive = 
            cell.className.includes('active') || 
            cell.className.includes('has-active') || 
            cell.className.includes('in-progress');
          
          const hasManyItems = 
            cell.className.includes('many-activities') || 
            cell.className.includes('items-3') || 
            cell.className.includes('items-4') || 
            cell.className.includes('items-5');
          
          // Add completed task indicator (green)
          if (hasCompleted) {
            const completedIndicator = document.createElement('div');
            completedIndicator.className = 'task-indicator-js completed-indicator';
            completedIndicator.style.width = '8px';
            completedIndicator.style.height = '8px';
            completedIndicator.style.borderRadius = '50%';
            completedIndicator.style.backgroundColor = '#10b981'; // Green
            completedIndicator.style.border = '1px solid white';
            completedIndicator.style.boxShadow = '0 0 4px rgba(16, 185, 129, 0.8)';
            indicatorContainer.appendChild(completedIndicator);
          }
          
          // Add active task indicator (blue)
          if (hasActive) {
            const activeIndicator = document.createElement('div');
            activeIndicator.className = 'task-indicator-js active-indicator';
            activeIndicator.style.width = '8px';
            activeIndicator.style.height = '8px';
            activeIndicator.style.borderRadius = '50%';
            activeIndicator.style.backgroundColor = '#3b82f6'; // Blue
            activeIndicator.style.border = '1px solid white';
            activeIndicator.style.boxShadow = '0 0 4px rgba(59, 130, 246, 0.8)';
            indicatorContainer.appendChild(activeIndicator);
          }
          
          // If neither specific type is detected but cell has activity, add a generic indicator
          if (!hasCompleted && !hasActive && hasActivity) {
            const genericIndicator = document.createElement('div');
            genericIndicator.className = 'task-indicator-js generic-indicator';
            genericIndicator.style.width = hasManyItems ? '10px' : '8px';
            genericIndicator.style.height = hasManyItems ? '10px' : '8px';
            genericIndicator.style.borderRadius = '50%';
            genericIndicator.style.backgroundColor = hasManyItems ? '#8b5cf6' : '#3b82f6'; // Purple for many, blue for regular
            genericIndicator.style.border = '1px solid white';
            genericIndicator.style.boxShadow = hasManyItems 
              ? '0 0 4px rgba(139, 92, 246, 0.8)' 
              : '0 0 4px rgba(59, 130, 246, 0.8)';
            indicatorContainer.appendChild(genericIndicator);
          }
          
          // Only add the container if it has any indicators
          if (indicatorContainer.children.length > 0) {
            cell.style.position = 'relative';
            cell.appendChild(indicatorContainer);
          }
        }
      });
    });
  }
  
  // Run immediately
  addVisibleTaskIndicators();
  
  // Run on window resize
  window.addEventListener('resize', addVisibleTaskIndicators);
  
  // Run when DOM content is loaded
  document.addEventListener('DOMContentLoaded', addVisibleTaskIndicators);
  
  // Run after a short delay to catch dynamically loaded content
  setTimeout(addVisibleTaskIndicators, 500);
  setTimeout(addVisibleTaskIndicators, 1000);
  setTimeout(addVisibleTaskIndicators, 2000);
  
  // Set up a mutation observer to detect changes in the DOM
  const observer = new MutationObserver(function(mutations) {
    addVisibleTaskIndicators();
  });
  
  // Start observing the document with the configured parameters
  observer.observe(document.body, { 
    childList: true, 
    subtree: true 
  });
})();
