/**
 * Fix Mobile Navigation
 * 
 * This script directly manipulates the DOM to ensure mobile navigation works correctly
 * by using native browser scrolling capabilities while preventing vertical scroll issues.
 */

(function() {
  // Store the current scroll position
  let lastScrollY = 0;
  let isTabScrolling = false;
  
  // Run immediately and after DOM content loaded
  function fixMobileNav() {
    // Only run on mobile devices
    if (window.innerWidth >= 768) return;
    
    // Find the navigation container
    const navContainer = document.querySelector('.tab-navigation-items');
    if (!navContainer) return;
    
    // Store current vertical scroll position
    lastScrollY = window.scrollY;
    
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
      // Scroll the active tab into view without affecting vertical scroll
      setTimeout(() => {
        // Save current scroll position
        const currentScrollY = window.scrollY;
        
        // Set flag to indicate tab scrolling is in progress
        isTabScrolling = true;
        
        // Scroll the tab into view horizontally only
        const container = navContainer;
        const tabLeft = activeTab.offsetLeft;
        const containerWidth = container.clientWidth;
        const scrollLeft = tabLeft - (containerWidth / 2) + (activeTab.offsetWidth / 2);
        container.scrollLeft = scrollLeft;
        
        // Restore vertical scroll position
        window.scrollTo(0, currentScrollY);
        
        // Reset flag after a short delay
        setTimeout(() => {
          isTabScrolling = false;
        }, 100);
      }, 100);
    }
    
    // Prevent tab navigation from affecting vertical scroll
    navContainer.addEventListener('touchstart', function(e) {
      // Store the current vertical scroll position
      lastScrollY = window.scrollY;
    }, { passive: true });
    
    navContainer.addEventListener('touchmove', function(e) {
      // Check if the touch is primarily horizontal
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        if (!this.lastTouchX) {
          this.lastTouchX = touch.clientX;
          this.lastTouchY = touch.clientY;
          return;
        }
        
        const deltaX = Math.abs(touch.clientX - this.lastTouchX);
        const deltaY = Math.abs(touch.clientY - this.lastTouchY);
        
        // If horizontal movement is greater than vertical
        if (deltaX > deltaY && deltaX > 5) {
          // Prevent default to avoid page scrolling
          e.preventDefault();
        }
        
        this.lastTouchX = touch.clientX;
        this.lastTouchY = touch.clientY;
      }
    }, { passive: false });
    
    navContainer.addEventListener('touchend', function() {
      // Reset touch tracking
      this.lastTouchX = null;
      this.lastTouchY = null;
      
      // Restore vertical scroll position
      setTimeout(() => {
        window.scrollTo(0, lastScrollY);
      }, 10);
    }, { passive: true });
    
    // Add click event listeners to all tabs
    tabItems.forEach(item => {
      item.addEventListener('click', function(e) {
        // Save current scroll position
        const currentScrollY = window.scrollY;
        
        // Set flag to indicate tab scrolling is in progress
        isTabScrolling = true;
        
        // After a short delay, scroll the clicked tab into view horizontally only
        setTimeout(() => {
          const container = navContainer;
          const tabLeft = this.offsetLeft;
          const containerWidth = container.clientWidth;
          const scrollLeft = tabLeft - (containerWidth / 2) + (this.offsetWidth / 2);
          container.scrollLeft = scrollLeft;
          
          // Restore vertical scroll position
          window.scrollTo(0, currentScrollY);
          
          // Reset flag after a short delay
          setTimeout(() => {
            isTabScrolling = false;
          }, 100);
        }, 10);
      });
    });
  }
  
  // Prevent unwanted vertical scrolling when interacting with tabs
  window.addEventListener('scroll', function() {
    if (isTabScrolling && window.innerWidth < 768) {
      window.scrollTo(0, lastScrollY);
    }
  }, { passive: true });
  
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
