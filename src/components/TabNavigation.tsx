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
        <div className="hidden md:flex flex-col items-start gap-2 p-2 bg-gradient-to-r from-indigo-600 to-blue-600 dark:from-indigo-900 dark:to-blue-900 rounded-lg shadow-lg mb-4">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                ref={isActive ? activeTabRef : null}
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  "w-full text-sm font-medium py-2.5 px-4 flex items-center gap-3 transition-all rounded-lg",
                  isActive
                    ? "bg-white/15 text-white shadow-sm backdrop-blur-sm"
                    : "text-white/80 hover:text-white hover:bg-white/10"
                )}
              >
                <Icon className={cn(
                  "w-5 h-5 flex-shrink-0",
                  isActive ? "text-white" : "text-white/80"
                )} />
                <span>{tab.label}</span>
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
              className="h-full rounded-r-none bg-gradient-to-r from-indigo-600/90 to-transparent text-white"
              onClick={scrollLeft}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </div>
          
          <div 
            ref={scrollContainerRef}
            className="flex overflow-x-auto scrollbar-hide py-2 px-8 bg-gradient-to-r from-indigo-600 to-blue-600 dark:from-indigo-900 dark:to-blue-900 rounded-lg shadow-lg"
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
                    "flex-shrink-0 text-sm font-medium py-2 px-3 flex flex-col items-center justify-center gap-1 transition-all min-w-[70px] rounded-lg mx-1 relative",
                    isActive
                      ? "bg-white/15 text-white shadow-sm backdrop-blur-sm"
                      : "text-white/80 hover:text-white hover:bg-white/10"
                  )}
                >
                  <Icon className={cn(
                    "w-5 h-5",
                    isActive ? "text-white" : "text-white/80"
                  )} />
                  <span className="text-xs whitespace-nowrap">{tab.shortLabel}</span>
                  {isActive && (
                    <span className="absolute bottom-0.5 left-3 right-3 h-0.5 bg-white rounded-full"></span>
                  )}
                </button>
              );
            })}
          </div>
          
          <div className="absolute right-0 top-0 bottom-0 flex items-center z-10">
            <Button 
              variant="ghost" 
              size="icon"
              className="h-full rounded-l-none bg-gradient-to-l from-blue-600/90 to-transparent text-white"
              onClick={scrollRight}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </nav>
      
      {/* Content for mobile when flashcards tab is selected */}
      <div className="md:hidden flex-1 overflow-auto">
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
