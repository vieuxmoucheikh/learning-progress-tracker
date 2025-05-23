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
      variant="ghost" 
      size="icon"
      onClick={toggleTheme}
      className={cn(
        "w-9 h-9 rounded-full",
        "bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800",
        "border-0",
        "focus-visible:ring-2 focus-visible:ring-blue-500",
        "theme-toggle-button"
      )}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      {theme === 'light' ? (
        <Sun className="h-5 w-5 text-amber-500" />
      ) : (
        <Moon className="h-5 w-5 text-blue-400" />
      )}
    </Button>
  );
}
