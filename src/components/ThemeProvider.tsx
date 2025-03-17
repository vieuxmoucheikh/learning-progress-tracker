import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import '../styles/mobile-light-mode-fixes.css';
import '../styles/critical-light-mode-fixes.css';

type Theme = 'light' | 'dark';

interface ThemeProviderProps {
  children: React.ReactNode;
  attribute?: string;
  defaultTheme?: string;
  enableSystem?: boolean;
}

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  isDark: boolean;
  isChanging: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children, attribute, defaultTheme, enableSystem }: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(() => {
    // Check if theme preference is stored in localStorage
    const storedTheme = localStorage.getItem('theme') as Theme;
    if (storedTheme === 'light' || storedTheme === 'dark') {
      return storedTheme;
    }
    
    // Check system preference if enabled
    if (enableSystem) {
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      return systemPrefersDark ? 'dark' : 'light';
    }
    
    // Default to light mode
    return defaultTheme === 'dark' ? 'dark' : 'light';
  });
  
  // Add a state to track if theme is changing to disable animations temporarily
  const [isChanging, setIsChanging] = useState(false);
  
  // Use refs to prevent multiple rapid theme changes
  const lastToggleTimeRef = useRef(0);
  const changeCountRef = useRef(0);
  const themeChangeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const forceRefreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Listen for system preference changes if enabled
  useEffect(() => {
    if (!enableSystem) return;
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setTheme(e.matches ? 'dark' : 'light');
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [enableSystem]);

  // Function to force a complete DOM reset when experiencing issues
  const forceCompleteReset = (newTheme: Theme) => {
    // Clear any existing timeouts
    if (themeChangeTimeoutRef.current) {
      clearTimeout(themeChangeTimeoutRef.current);
    }
    if (forceRefreshTimeoutRef.current) {
      clearTimeout(forceRefreshTimeoutRef.current);
    }
    
    // Force the theme to be correctly applied
    document.documentElement.classList.add('theme-transitioning');
    document.documentElement.setAttribute(attribute || 'data-theme', newTheme);
    document.documentElement.className = document.documentElement.className
      .replace(/\bdark\b/g, '')
      .replace(/\blight\b/g, '') + (newTheme === 'dark' ? ' dark' : ' light');
    
    // Force the correct background color
    if (newTheme === 'dark') {
      document.body.style.backgroundColor = '#0f172a';
      document.body.style.color = '#f8fafc';
      document.documentElement.style.backgroundColor = '#0f172a';
    } else {
      document.body.style.backgroundColor = '#ffffff';
      document.body.style.color = '#0f172a';
      document.documentElement.style.backgroundColor = '#ffffff';
    }
    
    // Force a complete DOM repaint by temporarily hiding the body
    document.body.style.display = 'none';
    document.body.offsetHeight; // Force a reflow
    document.body.style.display = '';
    
    // Remove the transitioning class after a delay
    forceRefreshTimeoutRef.current = setTimeout(() => {
      document.documentElement.classList.remove('theme-transitioning');
      setIsChanging(false);
      changeCountRef.current = 0;
    }, 100);
  };

  // Apply theme changes to document with improved handling
  useEffect(() => {
    // Begin transition - disable all animations
    setIsChanging(true);
    document.documentElement.classList.add('theme-transitioning');
    
    // Clear any previous timeouts
    if (themeChangeTimeoutRef.current) {
      clearTimeout(themeChangeTimeoutRef.current);
    }
    
    // Determine if we need to force a complete reset
    // This happens if there have been multiple theme changes in quick succession
    changeCountRef.current += 1;
    const now = Date.now();
    const isRapidChange = now - lastToggleTimeRef.current < 500;
    lastToggleTimeRef.current = now;
    
    if (isRapidChange && changeCountRef.current > 2) {
      // Too many rapid changes, force a complete refresh
      forceCompleteReset(theme);
      return;
    }
    
    // Regular theme change flow
    // Set attribute on html element - typically data-theme
    const attrName = attribute || 'data-theme';
    document.documentElement.setAttribute(attrName, theme);
    
    // Store the preference
    localStorage.setItem('theme', theme);
    
    // Add specific class for styling targeting
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    }

    // Handle special styling for mobile
    const isMobile = window.innerWidth <= 768;
    if (theme === 'light' && isMobile) {
      document.documentElement.classList.add('mobile-light-theme');
    } else {
      document.documentElement.classList.remove('mobile-light-theme');
    }
    
    // Handle direct body and root styling for immediate visual feedback
    if (theme === 'dark') {
      document.body.style.backgroundColor = '#0f172a';
      document.body.style.color = '#f8fafc';
    } else {
      document.body.style.backgroundColor = '#ffffff';
      document.body.style.color = '#0f172a';
    }
    
    // Apply immediate styles to fix theme toggle appearance issues
    const themeToggle = document.querySelector('.theme-toggle-button');
    if (themeToggle) {
      if (theme === 'dark') {
        themeToggle.classList.add('dark-mode-button');
        themeToggle.classList.remove('light-mode-button');
        
        // Force immediate icon state
        const sunIcon = themeToggle.querySelector('.icon-sun');
        const moonIcon = themeToggle.querySelector('.icon-moon');
        
        if (sunIcon) {
          (sunIcon as HTMLElement).style.color = '#94a3b8';
          (sunIcon as HTMLElement).style.opacity = '0.5';
          (sunIcon as HTMLElement).style.transform = 'scale(0.75)';
        }
        
        if (moonIcon) {
          (moonIcon as HTMLElement).style.color = '#3b82f6';
          (moonIcon as HTMLElement).style.opacity = '1';
          (moonIcon as HTMLElement).style.transform = 'scale(1)';
        }
      } else {
        themeToggle.classList.add('light-mode-button');
        themeToggle.classList.remove('dark-mode-button');
        
        // Force immediate icon state
        const sunIcon = themeToggle.querySelector('.icon-sun');
        const moonIcon = themeToggle.querySelector('.icon-moon');
        
        if (sunIcon) {
          (sunIcon as HTMLElement).style.color = '#f59e0b';
          (sunIcon as HTMLElement).style.opacity = '1';
          (sunIcon as HTMLElement).style.transform = 'scale(1)';
        }
        
        if (moonIcon) {
          (moonIcon as HTMLElement).style.color = '#94a3b8';
          (moonIcon as HTMLElement).style.opacity = '0.5';
          (moonIcon as HTMLElement).style.transform = 'scale(0.75)';
        }
      }
    }
    
    // Force a DOM reflow to immediately apply styles
    document.body.getBoundingClientRect();
    
    // Apply theme smoothly after a very short delay to allow DOM updates
    themeChangeTimeoutRef.current = setTimeout(() => {
      // Remove transitioning class to allow normal transitions
      document.documentElement.classList.remove('theme-transitioning');
      
      // Delay setting isChanging to false to ensure animations don't start too early
      setTimeout(() => {
        setIsChanging(false);
        
        // Reset change counter after successful theme change
        if (!isRapidChange) {
          changeCountRef.current = 0;
        }
      }, 50);
    }, 20);
    
    // Cleanup function
    return () => {
      if (themeChangeTimeoutRef.current) {
        clearTimeout(themeChangeTimeoutRef.current);
      }
      if (forceRefreshTimeoutRef.current) {
        clearTimeout(forceRefreshTimeoutRef.current);
      }
    };
  }, [theme, attribute]);

  // Improved theme toggle with debounce to prevent rapid toggling
  const toggleTheme = () => {
    if (isChanging) return; // Prevent toggling during transition
    
    const now = Date.now();
    const isRapidToggle = now - lastToggleTimeRef.current < 300;
    
    // Prevent rapid toggling
    if (isRapidToggle && changeCountRef.current > 1) {
      // If toggling too quickly, delay the next toggle
      return;
    }
    
    // Set isChanging first to prevent multiple toggles
    setIsChanging(true);
    
    // Toggle theme after very small delay to prevent flickering
    setTimeout(() => {
      setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
    }, 10);
  };

  const isDark = theme === 'dark';

  const value = {
    theme,
    setTheme,
    toggleTheme,
    isDark,
    isChanging
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
