import React, { useRef, useEffect } from "react";
import { 
  ChevronRight, 
  ChevronLeft,
  Home, 
  BarChart3, 
  Timer, 
  BookOpen, 
  Library,
  Notebook,
  LayoutDashboard
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FlashcardsTab } from './FlashcardsTab';
import { FlashcardDeck } from '@/types';
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
  onTabChange: (tabId: string) => void;
  flashcards: FlashcardDeck[];
  onAddDeck: (data: { name: string; description: string }) => void;
  onStudyDeck: (deckId: string) => void;
  onEditDeck: (deckId: string) => void;
  onDeleteDeck: (deckId: string) => void;
}

export function TabNavigation({ 
  activeTab, 
  onTabChange,
  flashcards,
  onAddDeck,
  onStudyDeck,
  onEditDeck,
  onDeleteDeck
}: TabNavigationProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const activeTabRef = useRef<HTMLButtonElement>(null);
  
  const tabs: Tab[] = [
    { id: 'dashboard', label: 'Dashboard', shortLabel: 'Dashboard', icon: LayoutDashboard },
    { id: 'items', label: 'All Items', shortLabel: 'Items', icon: BookOpen },
    { id: 'analytics', label: 'Analytics', shortLabel: 'Stats', icon: BarChart3 },
    { id: 'pomodoro', label: 'Pomodoro', shortLabel: 'Timer', icon: Timer },
    { id: 'flashcards', label: 'Flashcards', shortLabel: 'Cards', icon: BookOpen },
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
        {/* Desktop Navigation - Vertical */}
        <div className="hidden md:flex flex-col items-start gap-3 p-3 bg-gradient-to-br from-indigo-600 via-blue-600 to-blue-500 dark:from-indigo-900 dark:via-blue-800 dark:to-blue-700 rounded-xl shadow-lg mb-4 border border-indigo-400/20 dark:border-indigo-700/30">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                ref={isActive ? activeTabRef : null}
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  "w-full text-sm font-medium py-3 px-4 flex items-center gap-3 transition-all duration-200 rounded-lg group relative overflow-hidden",
                  isActive
                    ? "bg-white/20 text-white shadow-sm backdrop-blur-sm"
                    : "text-white/80 hover:text-white hover:bg-white/10"
                )}
              >
                <div className={cn(
                  "absolute inset-0 opacity-0 bg-gradient-to-r from-white/10 to-transparent transition-opacity duration-300",
                  isActive ? "opacity-100" : "group-hover:opacity-50"
                )} />
                <div className="relative z-10 flex items-center gap-3">
                  <Icon className={cn(
                    "w-5 h-5 flex-shrink-0 transition-transform duration-300",
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
              className="h-full rounded-r-none bg-gradient-to-r from-indigo-600/90 to-transparent text-white shadow-none border-0"
              onClick={scrollLeft}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </div>
          
          <div 
            ref={scrollContainerRef}
            className="flex overflow-x-auto scrollbar-hide py-3 px-10 bg-gradient-to-r from-indigo-600 via-blue-600 to-blue-500 dark:from-indigo-900 dark:via-blue-800 dark:to-blue-700 rounded-xl shadow-lg border border-indigo-400/20 dark:border-indigo-700/30"
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
                    "flex-shrink-0 text-sm font-medium py-2.5 px-4 flex flex-col items-center justify-center gap-1.5 transition-all duration-200 min-w-[80px] rounded-lg mx-1.5 relative group",
                    isActive
                      ? "bg-white/15 text-white shadow-sm backdrop-blur-sm"
                      : "text-white/80 hover:text-white hover:bg-white/10"
                  )}
                >
                  <Icon className={cn(
                    "w-5 h-5 transition-transform duration-300",
                    isActive ? "text-white" : "text-white/80 group-hover:scale-110"
                  )} />
                  <span className="text-xs whitespace-nowrap font-medium">{tab.shortLabel}</span>
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
              className="h-full rounded-l-none bg-gradient-to-l from-blue-600/90 to-transparent text-white shadow-none border-0"
              onClick={scrollRight}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </nav>
      
      {/* Content for mobile when flashcards tab is selected */}
      <div className="md:hidden flex-1 overflow-y-auto h-[calc(100vh-130px)] pb-40" style={{ WebkitOverflowScrolling: 'touch' }}>
        {activeTab === 'flashcards' && (
          <FlashcardsTab 
            flashcards={flashcards}
            onAddDeck={onAddDeck}
            onStudyDeck={onStudyDeck}
            onEditDeck={onEditDeck}
            onDeleteDeck={onDeleteDeck}
          />
        )}
      </div>
    </div>
  );
}
