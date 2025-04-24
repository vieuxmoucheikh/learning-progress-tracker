import React, { createContext, useContext, useEffect, useState } from 'react';
import '../styles/mobile-light-mode-fixes.css';
import '../styles/critical-light-mode-fixes.css';
import '../styles/theme-transition.css';
import '../styles/theme-sync.css';
import '../styles/theme-switch-fixes.css';

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
  }, [enableSystem]);

  // Apply theme changes when theme state changes
  useEffect(() => {
    // First, add transitioning class to disable animations during theme change
    document.documentElement.classList.add('theme-transitioning');
    
    // Force a reflow to ensure the transitioning class is applied before changes
    // This helps prevent flickering
    document.documentElement.offsetHeight;
    
    // Set attribute on html element
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
    
    // Force another reflow to ensure all changes are applied
    document.documentElement.offsetHeight;
    
    // Three-phase approach for smoother transitions:
    // 1. Apply theme changes immediately with transitions disabled
    // 2. Wait for browser to process the changes
    // 3. Re-enable transitions after changes are fully applied
    
    // For mobile, use a longer delay to ensure styles are fully applied
    const delay = isMobile ? 300 : 100;
    
    setTimeout(() => {
      // Use double requestAnimationFrame to ensure we're in a new paint cycle
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          document.documentElement.classList.remove('theme-transitioning');
        });
      });
    }, delay);
    
  }, [theme, attribute]);

  const toggleTheme = () => {
    setTheme(prevTheme => {
      const newTheme = prevTheme === 'light' ? 'dark' : 'light';
      
      // Dispatch theme change event for our helper script
      const themeChangeEvent = new CustomEvent('themeChanged', {
        detail: { theme: newTheme }
      });
      document.dispatchEvent(themeChangeEvent);
      
      return newTheme;
    });
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
