import { Moon, Sun } from 'lucide-react';
import { useTheme } from './ThemeProvider';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  
  return (
    <Button 
      variant="outline" 
      size="sm"
      onClick={toggleTheme}
      className={cn(
        "relative h-8 px-3 rounded-lg border transition-all duration-300",
        "bg-white dark:bg-gray-800",
        "border-gray-200 dark:border-gray-700",
        "hover:bg-gray-100 dark:hover:bg-gray-700",
        "focus-visible:ring-2 focus-visible:ring-blue-500",
        "overflow-hidden theme-toggle-button",
        "text-foreground dark:text-gray-200" 
      )}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      <div className="flex items-center gap-2">
        <Sun className={cn(
          "h-4 w-4 transition-all duration-300 transform",
          theme === 'light' 
            ? "text-amber-500 scale-100 opacity-100" 
            : "text-gray-400 scale-90 opacity-60 translate-y-0"
        )} />
        
        <span className={cn(
          "text-xs font-medium transition-all duration-300 transform",
          theme === 'light' 
            ? "text-gray-900 dark:text-gray-200 translate-x-0 opacity-100" 
            : "text-gray-400 -translate-x-2 opacity-0"
        )}>
          {theme === 'light' ? 'Light' : ''}
        </span>
        
        <span className={cn(
          "text-xs font-medium transition-all duration-300 transform absolute",
          theme === 'dark' 
            ? "text-gray-200 translate-x-0 opacity-100" 
            : "text-gray-400 translate-x-2 opacity-0"
        )} style={{ left: '2.25rem' }}>
          {theme === 'dark' ? 'Dark' : ''}
        </span>
        
        <Moon className={cn(
          "h-4 w-4 transition-all duration-300 transform",
          theme === 'dark' 
            ? "text-blue-400 scale-100 opacity-100" 
            : "text-gray-400 scale-90 opacity-60 -translate-y-0"
        )} />
      </div>
      
      <div className={cn(
        "absolute bottom-0 left-0 h-0.5 bg-gradient-to-r transition-all duration-300",
        theme === 'light' 
          ? "from-amber-400 to-amber-500 w-1/2 translate-x-0" 
          : "from-blue-400 to-indigo-500 w-1/2 translate-x-full"
      )} />
    </Button>
  );
}
