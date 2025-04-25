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
    return null;
  }
  
  return (
    <Button 
      variant="outline" 
      size="sm"
      onClick={toggleTheme}
      className={cn(
        "relative h-8 px-3 rounded-lg border flex items-center justify-between gap-1",
        "bg-white dark:bg-gray-800",
        "border-gray-200 dark:border-gray-700",
        "hover:bg-gray-100 dark:hover:bg-gray-700",
        "focus-visible:ring-2 focus-visible:ring-blue-500",
        "overflow-hidden theme-toggle-button min-w-[6.5rem]",
        "text-foreground dark:text-gray-200" 
      )}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-1">
          <Sun className={cn(
            "h-4 w-4",
            theme === 'light' ? "text-amber-500" : "text-gray-400"
          )} />
          <span className="text-xs font-medium">Light</span>
        </div>
        
        <div className="mx-1 h-4 w-px bg-gray-300 dark:bg-gray-600" />
        
        <div className="flex items-center gap-1">
          <Moon className={cn(
            "h-4 w-4",
            theme === 'dark' ? "text-blue-400" : "text-gray-400"
          )} />
          <span className="text-xs font-medium">Dark</span>
        </div>
      </div>
      
      {/* Indicator for current theme */}
      <div className={cn(
        "absolute bottom-0 left-0 h-0.5 bg-gradient-to-r",
        theme === 'light' 
          ? "from-amber-400 to-amber-500 w-[calc(50%-0.5rem)] translate-x-0" 
          : "from-blue-400 to-indigo-500 w-[calc(50%-0.5rem)] translate-x-[calc(100%+1rem)]"
      )} />
    </Button>
  );
}
