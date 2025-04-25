/**
 * Fix Mobile Navigation
 * 
 * This script directly manipulates the DOM to ensure mobile navigation works correctly
 * by using native browser scrolling capabilities.
 */

(function() {
  // Run immediately and after DOM content loaded
  function fixMobileNav() {
    // Only run on mobile devices
    if (window.innerWidth >= 768) return;
    
    // Find the navigation container
    const navContainer = document.querySelector('.tab-navigation-items');
    if (!navContainer) return;
    
    // Remove any problematic styles that might be interfering with scrolling
    navContainer.style.scrollBehavior = 'auto';
    navContainer.style.overflowX = 'auto';
    navContainer.style.overflowY = 'hidden';
    navContainer.style.whiteSpace = 'nowrap';
    navContainer.style.display = 'flex';
    navContainer.style.flexWrap = 'nowrap';
    navContainer.style.webkitOverflowScrolling = 'touch';
    
    // Find all tab items
    const tabItems = navContainer.querySelectorAll('.tab-navigation-item');
    tabItems.forEach(item => {
      // Ensure proper styling for each tab
      item.style.flex = '0 0 auto';
      item.style.display = 'inline-flex';
      item.style.alignItems = 'center';
      item.style.whiteSpace = 'nowrap';
    });
    
    // Find the active tab
    const activeTab = navContainer.querySelector('.tab-navigation-item.active');
    if (activeTab) {
      // Scroll the active tab into view
      setTimeout(() => {
        activeTab.scrollIntoView({
          inline: 'center',
          block: 'nearest',
          behavior: 'auto'
        });
      }, 100);
    }
    
    // Add click event listeners to all tabs
    tabItems.forEach(item => {
      item.addEventListener('click', function() {
        // After a short delay, scroll the clicked tab into view
        setTimeout(() => {
          this.scrollIntoView({
            inline: 'center',
            block: 'nearest',
            behavior: 'auto'
          });
        }, 10);
      });
    });
  }
  
  // Run immediately
  fixMobileNav();
  
  // Also run when DOM is fully loaded
  document.addEventListener('DOMContentLoaded', fixMobileNav);
  
  // Run again after a delay to ensure everything is loaded
  setTimeout(fixMobileNav, 500);
  setTimeout(fixMobileNav, 1000);
  
  // Run on resize
  window.addEventListener('resize', fixMobileNav);
  
  // Run when orientation changes (important for mobile)
  window.addEventListener('orientationchange', function() {
    setTimeout(fixMobileNav, 100);
  });
})();
