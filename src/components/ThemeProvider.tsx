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

  // Apply theme changes when theme state changes - simplified approach
  useEffect(() => {
    // 1. Add transitioning class to disable animations
    document.documentElement.classList.add('theme-transitioning');
    
    // 2. Set attribute on html element
    const attrName = attribute || 'data-theme';
    document.documentElement.setAttribute(attrName, theme);
    
    // 3. Store the preference
    localStorage.setItem('theme', theme);
    
    // 4. Add specific class for styling targeting
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    }

    // 5. Handle special styling for mobile
    const isMobile = window.innerWidth <= 768;
    if (theme === 'light' && isMobile) {
      document.documentElement.classList.add('mobile-light-theme');
    } else {
      document.documentElement.classList.remove('mobile-light-theme');
    }
    
    // 6. Re-enable transitions after a minimal delay
    // Use a shorter delay for a snappier feel
    const delay = isMobile ? 100 : 50;
    
    setTimeout(() => {
      document.documentElement.classList.remove('theme-transitioning');
    }, delay);
    
  }, [theme, attribute]);

  const toggleTheme = () => {
    // Apply transitioning class immediately before state update for instant response
    document.documentElement.classList.add('theme-transitioning');
    
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
