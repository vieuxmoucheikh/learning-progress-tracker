import React, { createContext, useContext, useEffect, useState } from 'react';
import '../styles/mobile-light-mode-fixes.css';
import '../styles/critical-light-mode-fixes.css'; // Ajout de nos correctifs critiques

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

  // Listen for system preference changes if enabled
  useEffect(() => {
    if (!enableSystem) return;
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setTheme(e.matches ? 'dark' : 'light');
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [enableSystem, setTheme]);

  // Apply theme changes to document
  useEffect(() => {
    // Store the preference
    localStorage.setItem('theme', theme);
    
    // Add transitioning class before changing to prevent flicker
    document.documentElement.classList.add('theme-transitioning');
    
    // Set data-theme attribute
    document.documentElement.setAttribute(attribute || 'data-theme', theme);
    
    // Also set class for compatibility
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
    
    // Apply theme smoothly
    const applyTheme = () => {
      // Remove transitioning class after styles are applied
      setTimeout(() => {
        document.documentElement.classList.remove('theme-transitioning');
      }, 150);
    };
    
    // Apply with a slight delay to allow CSS transitions to work
    setTimeout(applyTheme, 10);
    
  }, [theme, attribute]);

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  const isDark = theme === 'dark';

  const value = {
    theme,
    setTheme,
    toggleTheme,
    isDark,
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
