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
        "relative h-8 px-3 rounded-lg border",
        "bg-white dark:bg-gray-800",
        "border-gray-200 dark:border-gray-700",
        "hover:bg-gray-100 dark:hover:bg-gray-700",
        "focus-visible:ring-2 focus-visible:ring-blue-500",
        "theme-toggle-button",
        "text-foreground dark:text-gray-200" 
      )}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      {theme === 'light' ? (
        <div className="flex items-center gap-2">
          <Sun className="h-4 w-4 text-amber-500" />
          <span className="text-xs font-medium">Light Mode</span>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Moon className="h-4 w-4 text-blue-400" />
          <span className="text-xs font-medium">Dark Mode</span>
        </div>
      )}
    </Button>
  );
}
