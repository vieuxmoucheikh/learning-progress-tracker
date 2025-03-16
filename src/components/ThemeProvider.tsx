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

    // Detect if the device is mobile
    const isMobile = window.innerWidth <= 768;
    
    if (theme === 'light' && isMobile) {
      // Apply specific styles for light mode on mobile
      document.documentElement.setAttribute('data-mobile-light', 'true');
    } else {
      document.documentElement.removeAttribute('data-mobile-light');
    }
    
    // Update the data-theme attribute
    document.documentElement.setAttribute('data-theme', theme);

    // Appliquer des correctifs spécifiques pour le mode clair sur mobile
    if (theme === 'light' && window.innerWidth <= 768) {
      // Forcer l'application des styles en mode clair
      document.body.style.backgroundColor = '#f8fafc'; // slate-50
      document.documentElement.style.backgroundColor = '#f8fafc';
      
      // Ajouter une classe spécifique pour cibler avec CSS
      document.documentElement.classList.add('mobile-light-mode');
      document.documentElement.setAttribute('data-mobile-light', 'true');
    } else {
      document.documentElement.classList.remove('mobile-light-mode');
      document.documentElement.removeAttribute('data-mobile-light');
    }
    
    // Injecter un style inline pour garantir le bon fond en mode clair sur mobile
    if (theme === 'light') {
      const style = document.createElement('style');
      style.id = 'emergency-light-mode-fix';
      style.textContent = `
        @media (max-width: 768px) {
          html[data-theme="light"], 
          html[data-theme="light"] body {
            background-color: #f8fafc !important;
          }
          html[data-theme="light"] .card,
          html[data-theme="light"] [class*="Card"],
          html[data-theme="light"] [class*="-card"],
          html[data-theme="light"] .dark\\:bg-gray-800,
          html[data-theme="light"] [class*="mastered-card"],
          html[data-theme="light"] [class*="learning-item-card"] {
            background-color: #ffffff !important;
            background: #ffffff !important;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05) !important;
          }

          /* Enfants directs des cartes */
          html[data-theme="light"] .card > div,
          html[data-theme="light"] [class*="card"] > div,
          html[data-theme="light"] [class*="Card"] > div,
          html[data-theme="light"] [class*="-card"] > div {
            background-color: #ffffff !important;
            background: #ffffff !important;
            background-image: none !important;
          }
        }
      `;
      
      // Supprimer l'ancien style s'il existe
      const oldStyle = document.getElementById('emergency-light-mode-fix');
      if (oldStyle) oldStyle.remove();
      
      document.head.appendChild(style);
      
      // Appliquer directement pour les cartes existantes en mode mobile
      if (window.innerWidth <= 768) {
        setTimeout(() => {
          const cards = document.querySelectorAll('.card, [class*="Card"], [class*="-card"], [class*="card"], .mastered-card, .dark\\:bg-gray-800');
          cards.forEach(card => {
            (card as HTMLElement).style.backgroundColor = '#ffffff';
            (card as HTMLElement).style.background = '#ffffff';
          });
        }, 100);
      }
    } else {
      // Supprimer le style d'urgence si on n'est pas en mode clair
      const style = document.getElementById('emergency-light-mode-fix');
      if (style) style.remove();
    }

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
