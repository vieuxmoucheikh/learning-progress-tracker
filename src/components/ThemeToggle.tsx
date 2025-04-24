import { Moon, Sun } from 'lucide-react';
import { useTheme } from './ThemeProvider';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  
  // Only render the toggle client-side to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Don't render anything until mounted to prevent hydration mismatch
  if (!mounted) {
    return (
      <Button 
        variant="outline" 
        size="sm"
        className={cn(
          "relative h-8 w-[5.5rem] px-3 rounded-lg border",
          "bg-white dark:bg-gray-800",
          "border-gray-200 dark:border-gray-700",
          "overflow-hidden theme-toggle-button opacity-0"
        )}
        aria-hidden="true"
      >
        <div className="invisible">Theme</div>
      </Button>
    );
  }
  
  return (
    <Button 
      variant="outline" 
      size="sm"
      onClick={toggleTheme}
      className={cn(
        "relative h-8 w-[5.5rem] px-3 rounded-lg border transition-colors duration-300",
        "bg-white dark:bg-gray-800",
        "border-gray-200 dark:border-gray-700",
        "hover:bg-gray-100 dark:hover:bg-gray-700",
        "focus-visible:ring-2 focus-visible:ring-blue-500",
        "overflow-hidden theme-toggle-button",
        "text-foreground dark:text-gray-200" 
      )}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-1.5">
          <Sun className={cn(
            "h-4 w-4 transition-transform duration-300",
            theme === 'light' 
              ? "text-amber-500" 
              : "text-gray-400"
          )} />
          
          <span className={cn(
            "text-xs font-medium absolute transition-opacity duration-300",
            theme === 'light' 
              ? "opacity-100" 
              : "opacity-0"
          )}>
            Light
          </span>
        </div>
        
        <div className="flex items-center gap-1.5">
          <span className={cn(
            "text-xs font-medium absolute transition-opacity duration-300",
            theme === 'dark' 
              ? "opacity-100" 
              : "opacity-0"
          )}>
            Dark
          </span>
          
          <Moon className={cn(
            "h-4 w-4 transition-transform duration-300",
            theme === 'dark' 
              ? "text-blue-400" 
              : "text-gray-400"
          )} />
        </div>
      </div>
      
      <div className={cn(
        "absolute bottom-0 left-0 h-0.5 bg-gradient-to-r transition-transform duration-300",
        theme === 'light' 
          ? "from-amber-400 to-amber-500 w-1/2 translate-x-0" 
          : "from-blue-400 to-indigo-500 w-1/2 translate-x-full"
      )} />
      
      {/* Indicator dot */}
      <div className={cn(
        "absolute top-1/2 -translate-y-1/2 h-3 w-3 rounded-full transition-transform duration-300",
        theme === 'light' 
          ? "bg-amber-500 left-[20%]" 
          : "bg-blue-400 left-[80%]"
      )} />
    </Button>
  );
}
