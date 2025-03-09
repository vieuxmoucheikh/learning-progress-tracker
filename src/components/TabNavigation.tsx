import { useRef, useEffect } from "react";
import { 
  ChevronRight, 
  ChevronLeft,
  BarChart3, 
  Timer, 
  BookOpen, 
  Notebook,
  LayoutDashboard,
  Library
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from './ui/button';

// Define all available tabs
export const TAB_OPTIONS = {
  DASHBOARD: "dashboard",
  ITEMS: "items",
  ANALYTICS: "analytics",
  POMODORO: "pomodoro",
  LEARNING_CARDS: "learning-cards",
  FLASHCARDS: "flashcards"
};

type Tab = {
  id: string;
  label: string;
  shortLabel: string;
  icon: any;
};

interface TabNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const TabNavigation: React.FC<TabNavigationProps> = ({
  activeTab,
  onTabChange,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const activeTabRef = useRef<HTMLButtonElement>(null);
  
  const tabs: Tab[] = [
    { id: 'dashboard', label: 'Dashboard', shortLabel: 'Dashboard', icon: LayoutDashboard },
    { id: 'items', label: 'All Items', shortLabel: 'Items', icon: BookOpen },
    { id: 'analytics', label: 'Analytics', shortLabel: 'Stats', icon: BarChart3 },
    { id: 'pomodoro', label: 'Pomodoro', shortLabel: 'Timer', icon: Timer },
    { id: 'flashcards', label: 'Flashcards', shortLabel: 'Cards', icon: Library },
    { id: 'learning-cards', label: 'Learning', shortLabel: 'Learn', icon: Notebook },
  ];

  // Scroll active tab into view when it changes
  useEffect(() => {
    if (activeTabRef.current && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const activeTab = activeTabRef.current;
      
      // Calculate position to center the active tab
      const containerWidth = container.offsetWidth;
      const tabWidth = activeTab.offsetWidth;
      const tabLeft = activeTab.offsetLeft;
      const scrollLeft = tabLeft - (containerWidth / 2) + (tabWidth / 2);
      
      container.scrollTo({
        left: scrollLeft,
        behavior: 'smooth'
      });
    }
  }, [activeTab]);

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({
        left: -200,
        behavior: 'smooth'
      });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({
        left: 200, 
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="flex flex-col h-full">
      <nav className="relative">
        {/* Desktop Navigation - Vertical - Compact */}
        <div className="hidden md:flex flex-col items-start gap-1 p-1 bg-gradient-to-br from-indigo-600 via-blue-600 to-blue-500 dark:from-indigo-800 dark:via-blue-700 dark:to-blue-600 rounded-xl shadow-lg mb-4 border border-indigo-400/20 dark:border-indigo-700/30 w-auto h-[calc(100vh-10rem)] overflow-y-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                ref={isActive ? activeTabRef : null}
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  "w-full text-xs font-medium py-1.5 px-2 flex items-center gap-1.5 transition-all duration-200 rounded-lg group relative overflow-hidden",
                  isActive
                    ? "bg-white/20 text-white shadow-sm backdrop-blur-sm"
                    : "text-white/80 hover:text-white hover:bg-white/10"
                )}
                title={tab.label}
              >
                <div className={cn(
                  "absolute inset-0 opacity-0 bg-gradient-to-r from-white/10 to-transparent transition-opacity duration-300",
                  isActive ? "opacity-100" : "group-hover:opacity-50"
                )} />
                <div className="relative z-10 flex items-center gap-1.5">
                  <Icon className={cn(
                    "w-4 h-4 flex-shrink-0 transition-transform duration-300",
                    isActive ? "text-white" : "text-white/80 group-hover:scale-110"
                  )} />
                  <span className="transition-all duration-300">{tab.label}</span>
                </div>
                {isActive && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-white rounded-full" />
                )}
              </button>
            );
          })}
        </div>
        
        {/* Mobile Navigation - Horizontal with scroll */}
        <div className="relative md:hidden">
          <div className="absolute left-0 top-0 bottom-0 flex items-center z-10">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-full rounded-r-none bg-gradient-to-r from-indigo-600/90 to-transparent text-white dark:text-white shadow-none border-0 dark:from-indigo-800/90"
              onClick={scrollLeft}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </div>
          
          <div 
            ref={scrollContainerRef}
            className="flex overflow-x-auto scrollbar-hide py-3 px-10 bg-gradient-to-r from-indigo-600 via-blue-600 to-blue-500 dark:from-indigo-800 dark:via-blue-700 dark:to-blue-600 rounded-xl shadow-lg border border-indigo-400/20 dark:border-indigo-700/30"
          >
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  ref={isActive ? activeTabRef : null}
                  onClick={() => onTabChange(tab.id)}
                  className={cn(
                    "flex-shrink-0 text-sm font-medium py-2 px-3 flex flex-col items-center justify-center gap-1 transition-all duration-200 min-w-[70px] rounded-lg mx-1 relative group",
                    isActive
                      ? "bg-white/15 text-white dark:text-white shadow-sm backdrop-blur-sm"
                      : "text-white dark:text-white hover:text-white hover:bg-white/10"
                  )}
                >
                  <Icon className={cn(
                    "w-4 h-4 transition-transform duration-300",
                    isActive ? "text-white dark:text-white" : "text-white/80 dark:text-white/80 group-hover:scale-110"
                  )} />
                  <span className="text-xs whitespace-nowrap font-medium text-white dark:text-white">{tab.shortLabel}</span>
                  {isActive && (
                    <span className="absolute bottom-1 left-3 right-3 h-0.5 bg-white rounded-full" />
                  )}
                </button>
              );
            })}
          </div>
          
          <div className="absolute right-0 top-0 bottom-0 flex items-center z-10">
            <Button 
              variant="ghost" 
              size="icon"
              className="h-full rounded-l-none bg-gradient-to-l from-blue-600/90 to-transparent text-white dark:text-white shadow-none border-0 dark:from-blue-700/90"
              onClick={scrollRight}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </nav>
    </div>
  );
}
