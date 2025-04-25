/**
 * Mobile Navigation Helper Script
 * 
 * This script improves the scrolling experience for the mobile navigation menu
 * by adding touch event handling and preventing unwanted scrolling behaviors.
 */

(function() {
  // Wait for DOM to be fully loaded
  document.addEventListener('DOMContentLoaded', function() {
    initMobileNavigation();
  });

  // Also run immediately in case the DOM is already loaded
  if (document.readyState === 'interactive' || document.readyState === 'complete') {
    initMobileNavigation();
  }

  function initMobileNavigation() {
    // Find the navigation container
    const navContainer = document.querySelector('.tab-navigation-container');
    const navItems = document.querySelector('.tab-navigation-items');
    
    if (!navContainer || !navItems) {
      // Try again later if elements aren't found
      setTimeout(initMobileNavigation, 500);
      return;
    }

    // Add class to body when interacting with navigation
    navItems.addEventListener('touchstart', function() {
      document.body.classList.add('tab-navigation-active');
    }, { passive: true });

    // Remove class when touch interaction ends
    ['touchend', 'touchcancel'].forEach(event => {
      navItems.addEventListener(event, function() {
        // Delay removal slightly to ensure smooth scrolling completes
        setTimeout(() => {
          document.body.classList.remove('tab-navigation-active');
        }, 300);
      }, { passive: true });
    });

    // Improve scroll behavior by preventing body scrolling during navigation swipes
    navItems.addEventListener('touchmove', function(e) {
      // Check if horizontal scrolling is happening
      const touchStartX = e.touches[0].clientX;
      const touchStartY = e.touches[0].clientY;
      
      // Store the initial touch position for this touchmove sequence
      if (!this.lastTouchX) {
        this.lastTouchX = touchStartX;
        this.lastTouchY = touchStartY;
        return;
      }
      
      // Calculate the horizontal and vertical differences
      const deltaX = Math.abs(touchStartX - this.lastTouchX);
      const deltaY = Math.abs(touchStartY - this.lastTouchY);
      
      // If horizontal movement is greater than vertical and significant enough
      if (deltaX > deltaY && deltaX > 10) {
        // Prevent default to avoid page scrolling
        e.preventDefault();
      }
      
      // Update last touch positions
      this.lastTouchX = touchStartX;
      this.lastTouchY = touchStartY;
    }, { passive: false }); // passive: false is needed to be able to call preventDefault()

    // Reset touch tracking when touch sequence ends
    ['touchend', 'touchcancel'].forEach(event => {
      navItems.addEventListener(event, function() {
        this.lastTouchX = null;
        this.lastTouchY = null;
      }, { passive: true });
    });

    // Ensure active tab is properly centered on resize
    window.addEventListener('resize', function() {
      const activeTab = document.querySelector('.tab-navigation-item.active');
      if (activeTab && window.innerWidth < 768) {
        centerActiveTab(activeTab, navItems);
      }
    }, { passive: true });

    // Center active tab initially
    const activeTab = document.querySelector('.tab-navigation-item.active');
    if (activeTab && window.innerWidth < 768) {
      // Slight delay to ensure everything is rendered
      setTimeout(() => {
        centerActiveTab(activeTab, navItems);
      }, 100);
    }
  }

  function centerActiveTab(activeTab, container) {
    // Calculate the position to center the active tab
    const scrollLeft = activeTab.offsetLeft - (container.clientWidth / 2) + (activeTab.clientWidth / 2);
    
    // Use requestAnimationFrame for smoother scrolling
    requestAnimationFrame(() => {
      container.scrollTo({
        left: scrollLeft,
        behavior: 'smooth'
      });
    });
  }
})();
