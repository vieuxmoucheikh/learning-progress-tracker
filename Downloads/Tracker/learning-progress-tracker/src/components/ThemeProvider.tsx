import React, { createContext, useContext, useEffect, useState } from 'react';

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

  useEffect(() => {
    const root = window.document.documentElement;
    
    // Remove any existing theme classes
    root.classList.remove('light', 'dark');

    // Apply the theme
    root.classList.add(theme);
    
    // Set data attribute for components that use it
    if (attribute) {
      root.setAttribute(attribute, theme);
    } else {
      // Default attribute for compatibility with various libraries
      root.setAttribute('data-theme', theme);
    }

    // Apply theme class to body as well for better coverage
    document.body.classList.remove('light', 'dark');
    document.body.classList.add(theme);

    // Force update for any components that might not be responding to theme changes
    document.body.setAttribute('style', `color-scheme: ${theme};`);
    
    // Update meta theme-color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute(
        'content',
        theme === 'dark' ? '#1e293b' : '#ffffff'
      );
    } else {
      // Create meta tag if it doesn't exist
      const meta = document.createElement('meta');
      meta.name = 'theme-color';
      meta.content = theme === 'dark' ? '#1e293b' : '#ffffff';
      document.head.appendChild(meta);
    }

    // Add viewport meta tag for proper mobile rendering if it doesn't exist
    let viewportMeta = document.querySelector('meta[name="viewport"]');
    if (!viewportMeta) {
      const meta = document.createElement('meta');
      meta.setAttribute('name', 'viewport');
      meta.setAttribute('content', 'width=device-width, initial-scale=1.0, viewport-fit=cover');
      document.head.appendChild(meta);
    }

    // Apply specific fixes for mobile devices
    const applyMobileSpecificFixes = () => {
      // Fix for iOS devices that might have issues with background color
      if (theme === 'light') {
        document.body.setAttribute('style', 'background-color: #ffffff;');
      } else {
        document.body.setAttribute('style', 'background-color: #1e293b;');
      }
    };

    // Apply mobile fixes
    applyMobileSpecificFixes();

    // Store the theme preference in localStorage
    localStorage.setItem('theme', theme);
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
