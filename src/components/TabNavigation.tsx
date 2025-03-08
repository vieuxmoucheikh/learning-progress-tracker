import React, { useRef, useEffect } from "react";
import { BarChart3, BookOpen, LayoutDashboard, Timer, Notebook, Library } from "lucide-react";
import { cn } from "@/lib/utils";
import { FlashcardsTab } from './FlashcardsTab';
import { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { FlashcardDeck } from '@/types';

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
  onAddDeck: () => void;
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
  const tabs: Tab[] = [
    {
      id: TAB_OPTIONS.DASHBOARD,
      label: "Dashboard",
      shortLabel: "Home",
      icon: LayoutDashboard
    },
    {
      id: TAB_OPTIONS.ITEMS,
      label: "Learning Items",
      shortLabel: "Items",
      icon: BookOpen
    },
    {
      id: TAB_OPTIONS.LEARNING_CARDS,
      label: "Learning Cards",
      shortLabel: "Cards",
      icon: Notebook
    },
    {
      id: TAB_OPTIONS.ANALYTICS,
      label: "Analytics",
      shortLabel: "Stats",
      icon: BarChart3
    },
    {
      id: TAB_OPTIONS.POMODORO,
      label: "Pomodoro",
      shortLabel: "Timer",
      icon: Timer
    },
    {
      id: TAB_OPTIONS.FLASHCARDS,
      label: "Flashcards",
      shortLabel: "Flashcards",
      icon: Library
    }
  ];

  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const activeTabRef = useRef<HTMLButtonElement>(null);

  // Scroll to active tab when it changes
  useEffect(() => {
    if (tabsContainerRef.current && activeTabRef.current) {
      const container = tabsContainerRef.current;
      const activeTabElement = activeTabRef.current;
      
      // Calculate the scroll position to center the active tab
      const scrollLeft = activeTabElement.offsetLeft - (container.offsetWidth / 2) + (activeTabElement.offsetWidth / 2);
      
      // Ensure we don't scroll past the beginning
      const finalScrollLeft = Math.max(0, scrollLeft);
      
      // Smooth scroll to the position
      container.scrollTo({
        left: finalScrollLeft,
        behavior: 'smooth'
      });
    }
  }, [activeTab]);

  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .hide-scrollbar::-webkit-scrollbar {
        display: none;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <div className="flex flex-col h-full">
      <nav className="flex justify-center mb-8 w-full bg-gradient-to-r from-blue-600 to-blue-500 dark:from-blue-700 dark:to-blue-600 p-2 rounded-lg shadow-md">
        <div 
          ref={tabsContainerRef}
          className="flex max-w-2xl w-full overflow-x-auto px-1 hide-scrollbar"
          style={{ 
            scrollbarWidth: 'none', 
            msOverflowStyle: 'none',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                ref={isActive ? activeTabRef : null}
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  "flex-shrink-0 text-sm font-medium py-2.5 px-3 sm:px-4 flex items-center justify-center gap-1.5 sm:gap-2 transition-all min-w-[72px] sm:min-w-[90px] rounded-lg mx-0.5 relative",
                  isActive
                    ? "bg-white/15 text-white shadow-sm backdrop-blur-sm"
                    : "text-white/80 hover:text-white hover:bg-white/10 dark:text-white/70 dark:hover:text-white"
                )}
              >
                <Icon className={cn(
                  "w-4 h-4 flex-shrink-0",
                  isActive ? "text-white dark:text-white" : "text-white/80 dark:text-white/70"
                )} />
                <span className="whitespace-nowrap">{tab.shortLabel}</span>
                {isActive && (
                  <span className="absolute bottom-1 left-3 right-3 h-0.5 bg-white rounded-full"></span>
                )}
              </button>
            );
          })}
        </div>
      </nav>
      <div className="flex-1 overflow-auto">
        {activeTab === 'flashcards' && (
          <FlashcardsTab 
            flashcards={flashcards}
            onAddDeck={onAddDeck}
            onStudyDeck={onStudyDeck}
            onEditDeck={onEditDeck}
            onDeleteDeck={onDeleteDeck}
          />
        )}
        {/* Add your other tab content here */}
      </div>
    </div>
  );
}
