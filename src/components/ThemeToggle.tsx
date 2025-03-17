import { Moon, Sun } from 'lucide-react';
import { useTheme } from './ThemeProvider';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { useEffect, useRef } from 'react';

export function ThemeToggle() {
  const { theme, toggleTheme, isChanging } = useTheme();
  const buttonRef = useRef<HTMLButtonElement>(null);
  
  // Stabiliser le bouton en cas de basculements multiples
  useEffect(() => {
    // Attribuer les classes correctes en fonction du thème
    if (buttonRef.current) {
      if (theme === 'light') {
        buttonRef.current.classList.add('light-mode-button');
        buttonRef.current.classList.remove('dark-mode-button');
      } else {
        buttonRef.current.classList.add('dark-mode-button');
        buttonRef.current.classList.remove('light-mode-button');
      }
    }
  }, [theme]);
  
  return (
    <Button 
      variant="outline" 
      size="sm"
      onClick={toggleTheme}
      disabled={isChanging}
      ref={buttonRef}
      className={cn(
        "relative h-8 px-3 rounded-lg border",
        "theme-toggle-button",
        theme === 'light' 
          ? "bg-white border-gray-200 text-gray-900" 
          : "bg-gray-800 border-gray-700 text-gray-200",
        isChanging && "opacity-50 pointer-events-none"
      )}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      <div className="flex items-center gap-2 relative">
        <Sun className={cn(
          "h-4 w-4 icon-sun",
          theme === 'light' 
            ? "text-amber-500 opacity-100 scale-100" 
            : "text-gray-400 opacity-50 scale-75"
        )} />
        
        <div className="w-10 overflow-hidden relative">
          <span className={cn(
            "text-xs font-medium absolute left-0 whitespace-nowrap transition-transform",
            theme === 'light' 
              ? "opacity-100 translate-x-0" 
              : "opacity-0 -translate-x-6"
          )}>
            Light
          </span>
          
          <span className={cn(
            "text-xs font-medium absolute left-0 whitespace-nowrap transition-transform",
            theme === 'dark' 
              ? "opacity-100 translate-x-0" 
              : "opacity-0 translate-x-6"
          )}>
            Dark
          </span>
        </div>
        
        <Moon className={cn(
          "h-4 w-4 icon-moon",
          theme === 'dark' 
            ? "text-blue-400 opacity-100 scale-100" 
            : "text-gray-400 opacity-50 scale-75"
        )} />
      </div>
      
      <div className={cn(
        "absolute bottom-0 left-0 h-0.5 bg-gradient-to-r",
        theme === 'light' 
          ? "from-amber-400 to-amber-500 w-1/2 translate-x-0" 
          : "from-blue-400 to-indigo-500 w-1/2 translate-x-full"
      )} />
    </Button>
  );
}
