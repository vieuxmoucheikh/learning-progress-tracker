// This script initializes the theme based on localStorage or system preference
// It needs to be included in the head of the document to prevent flashing
(function() {
  // Check if a theme is stored in localStorage
  const storedTheme = localStorage.getItem('theme');
  
  // If a theme is stored, apply it
  if (storedTheme === 'dark' || storedTheme === 'light') {
    document.documentElement.classList.add(storedTheme);
  } 
  // If no theme is stored or it's set to 'system', check system preference
  else {
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    document.documentElement.classList.add(systemTheme);
  }
})();
