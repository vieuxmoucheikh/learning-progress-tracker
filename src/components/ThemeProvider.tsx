import React, { createContext, useContext, useEffect, useState } from 'react';
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

  // Apply theme changes to document with improved handling
  useEffect(() => {
    // Begin transition - disable all animations
    setIsChanging(true);
    document.documentElement.classList.add('theme-transitioning');
    
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
    
    // Handle direct body and root styling
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
        themeToggle.classList.add('dark-theme-active');
        themeToggle.classList.remove('light-theme-active');
      } else {
        themeToggle.classList.add('light-theme-active');
        themeToggle.classList.remove('dark-theme-active');
      }
    }
    
    // Apply theme smoothly after a very short delay to allow DOM updates
    const applyTheme = () => {
      // Force a browser paint/reflow before removing transition class
      document.body.getBoundingClientRect();
      
      // Remove transitioning class to allow normal transitions
      document.documentElement.classList.remove('theme-transitioning');
      
      // Delay setting isChanging to false to ensure animations don't start too early
      setTimeout(() => {
        setIsChanging(false);
      }, 50);
    };
    
    // Apply with a slight delay to allow CSS transitions to work
    setTimeout(applyTheme, 20);
    
  }, [theme, attribute]);

  // Improved theme toggle with debounce to prevent rapid toggling
  const toggleTheme = () => {
    if (isChanging) return; // Prevent toggling during transition
    
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
