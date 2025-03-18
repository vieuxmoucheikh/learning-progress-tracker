/**
 * Counter Fix - Ensure top corner counters are always visible
 * This script applies critical styles to the activity counters in the top-right corner
 */

(function() {
  function applyCounterStyles() {
    // Create a style element
    const styleEl = document.createElement('style');
    styleEl.id = 'top-corner-counters-fix';
    
    // Apply ultra-specific styles targeting the top corner counters
    styleEl.textContent = `
      /* Ultra-specific styles for Active Tasks and Completed Today counters in dark mode */
      html[data-theme="dark"] header .flex.items-center span.text-xs.font-medium,
      html[data-theme="dark"] nav .flex.items-center span.text-xs.font-medium,
      html[data-theme="dark"] div[class*="header"] .flex.items-center span.text-xs.font-medium,
      html[data-theme="dark"] div[class*="navbar"] .flex.items-center span.text-xs.font-medium,
      html[data-theme="dark"] div[class*="top-bar"] .flex.items-center span.text-xs.font-medium,
      html[data-theme="dark"] div.flex.items-center.justify-end span.text-xs.font-medium {
        color: white !important;
        background-color: #0f172a !important;
        font-weight: 700 !important;
        padding: 5px 10px !important;
        border: 2px solid !important;
        border-radius: 9999px !important;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5) !important;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.4) !important;
        margin: 0 4px !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        min-width: 28px !important;
        height: auto !important;
        line-height: 1 !important;
        position: relative !important;
        z-index: 50 !important;
      }
      
      /* Active Tasks - Blue counter */
      html[data-theme="dark"] header .flex.items-center span.text-xs.font-medium.bg-blue-500\\/10,
      html[data-theme="dark"] nav .flex.items-center span.text-xs.font-medium.bg-blue-500\\/10,
      html[data-theme="dark"] div[class*="header"] .flex.items-center span.text-xs.font-medium.bg-blue-500\\/10,
      html[data-theme="dark"] div[class*="navbar"] .flex.items-center span.text-xs.font-medium.bg-blue-500\\/10,
      html[data-theme="dark"] div[class*="top-bar"] .flex.items-center span.text-xs.font-medium.bg-blue-500\\/10,
      html[data-theme="dark"] div.flex.items-center.justify-end span.text-xs.font-medium.bg-blue-500\\/10 {
        background-color: rgb(37, 99, 235) !important;
        border-color: #60a5fa !important;
      }
      
      /* Completed Today - Green counter */
      html[data-theme="dark"] header .flex.items-center span.text-xs.font-medium.bg-green-500\\/10,
      html[data-theme="dark"] nav .flex.items-center span.text-xs.font-medium.bg-green-500\\/10,
      html[data-theme="dark"] div[class*="header"] .flex.items-center span.text-xs.font-medium.bg-green-500\\/10,
      html[data-theme="dark"] div[class*="navbar"] .flex.items-center span.text-xs.font-medium.bg-green-500\\/10,
      html[data-theme="dark"] div[class*="top-bar"] .flex.items-center span.text-xs.font-medium.bg-green-500\\/10,
      html[data-theme="dark"] div.flex.items-center.justify-end span.text-xs.font-medium.bg-green-500\\/10 {
        background-color: rgb(22, 163, 74) !important;
        border-color: #4ade80 !important;
      }
      
      /* Improved text labels next to counters */
      html[data-theme="dark"] header .flex.items-center span:not(.text-xs.font-medium),
      html[data-theme="dark"] nav .flex.items-center span:not(.text-xs.font-medium),
      html[data-theme="dark"] div[class*="header"] .flex.items-center span:not(.text-xs.font-medium),
      html[data-theme="dark"] div[class*="navbar"] .flex.items-center span:not(.text-xs.font-medium),
      html[data-theme="dark"] div[class*="top-bar"] .flex.items-center span:not(.text-xs.font-medium),
      html[data-theme="dark"] div.flex.items-center.justify-end span:not(.text-xs.font-medium) {
        color: #e2e8f0 !important;
        font-weight: 600 !important;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.4) !important;
      }
      
      /* Container fixes to ensure proper spacing */
      html[data-theme="dark"] header .flex.items-center,
      html[data-theme="dark"] nav .flex.items-center,
      html[data-theme="dark"] div[class*="header"] .flex.items-center,
      html[data-theme="dark"] div[class*="navbar"] .flex.items-center,
      html[data-theme="dark"] div[class*="top-bar"] .flex.items-center,
      html[data-theme="dark"] div.flex.items-center.justify-end {
        gap: 8px !important;
        align-items: center !important;
        justify-content: center !important;
      }
    `;
    
    // Replace existing style or add new one
    const existingStyle = document.getElementById('top-corner-counters-fix');
    if (existingStyle) {
      existingStyle.replaceWith(styleEl);
    } else {
      document.head.appendChild(styleEl);
    }
  }
  
  // Apply styles immediately
  applyCounterStyles();
  
  // Setup a MutationObserver to detect DOM changes and reapply styles
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'childList' || mutation.type === 'attributes') {
        // Check if any counters were added or modified
        const counters = document.querySelectorAll('.text-xs.font-medium.bg-blue-500\\/10, .text-xs.font-medium.bg-green-500\\/10');
        if (counters.length > 0) {
          applyCounterStyles();
          break;
        }
      }
    }
  });
  
  // Start observing DOM changes when document is fully loaded
  window.addEventListener('load', () => {
    observer.observe(document.body, { 
      childList: true, 
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style']
    });
    
    // Also reapply styles periodically to make sure they're not lost
    setInterval(applyCounterStyles, 2000);
  });
  
  // For immediate application, also observe current DOM
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    observer.observe(document.body, { 
      childList: true, 
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style']
    });
  }
})();
