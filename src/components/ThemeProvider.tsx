"use client";

declare global {
  interface Window {
    syncThemeAttributes?: () => void;
  }
}

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { type ThemeProviderProps } from "next-themes";
import { useTheme as useNextTheme } from "next-themes";

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  // Force sync theme attributes on theme change
  React.useEffect(() => {
    // Call the syncThemeAttributes function whenever theme changes
    const syncAttributes = () => {
      if (window.syncThemeAttributes) {
        window.syncThemeAttributes();
      }
    };

    // Initial sync
    syncAttributes();

    // Setup an observer for theme changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.attributeName === "data-theme" ||
          mutation.attributeName === "class"
        ) {
          syncAttributes();
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme", "class"],
    });

    return () => observer.disconnect();
  }, []);

  return (
    <NextThemesProvider
      attribute="data-theme"
      defaultTheme="system"
      enableSystem
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}
export function useTheme() {
  return useNextTheme();
}
