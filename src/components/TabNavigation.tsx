import React, { useRef, useEffect, useState } from "react";
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
  onAddDeck: (data: { name: string; description: string; }) => Promise<any> | void;
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
  const [showFullLabels, setShowFullLabels] = useState(true);
  const activeTabRef = useRef<HTMLButtonElement>(null);
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  // Check if tabs are overflowing
  useEffect(() => {
    const checkOverflow = () => {
      if (tabsContainerRef.current) {
        const isNowOverflowing = 
          tabsContainerRef.current.scrollWidth > tabsContainerRef.current.clientWidth;
        setIsOverflowing(isNowOverflowing);
        setShowFullLabels(window.innerWidth >= 768); // Show full labels on tablets and larger
      }
    };

    checkOverflow();
    window.addEventListener('resize', checkOverflow);
    return () => window.removeEventListener('resize', checkOverflow);
  }, []);

  // Scroll active tab into view
  useEffect(() => {
    if (activeTabRef.current && tabsContainerRef.current) {
      const container = tabsContainerRef.current;
      const activeTab = activeTabRef.current;
      
      // Calculate position to center the active tab
      const scrollLeft = activeTab.offsetLeft - (container.clientWidth / 2) + (activeTab.clientWidth / 2);
      container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
    }
  }, [activeTab]);

  // Define the tabs
  const tabs: Tab[] = [
    { id: 'dashboard', label: 'Dashboard', shortLabel: 'Dashboard', icon: LayoutDashboard },
    { id: 'items', label: 'Learning Items', shortLabel: 'Items', icon: BookOpen },
    { id: 'flashcards', label: 'Flashcards', shortLabel: 'Cards', icon: Library },
    { id: 'pomodoro', label: 'Pomodoro Timer', shortLabel: 'Timer', icon: Timer },
    { id: 'analytics', label: 'Analytics', shortLabel: 'Stats', icon: BarChart3 },
    { id: 'notes', label: 'Study Notes', shortLabel: 'Notes', icon: Notebook },
  ];

  return (
    <div className="flex flex-col h-full">
      <nav className="sticky top-0 z-10 bg-gradient-to-r from-blue-600 to-indigo-600 shadow-md">
        <div 
          ref={tabsContainerRef}
          className="flex overflow-x-auto hide-scrollbar py-1 px-2"
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
                  "flex-shrink-0 text-sm font-medium py-2.5 px-3 sm:px-4 flex items-center justify-center gap-1.5 sm:gap-2 transition-all rounded-lg mx-0.5 relative",
                  isActive
                    ? "bg-white/15 text-white shadow-sm backdrop-blur-sm"
                    : "text-white/80 hover:text-white hover:bg-white/10 dark:text-white/70 dark:hover:text-white"
                )}
              >
                <Icon className={cn(
                  "w-4 h-4 flex-shrink-0",
                  isActive ? "text-white dark:text-white" : "text-white/80 dark:text-white/70"
                )} />
                <span className={cn(
                  "whitespace-nowrap transition-opacity",
                  isOverflowing && !showFullLabels ? "hidden sm:inline" : ""
                )}>
                  {showFullLabels ? tab.label : tab.shortLabel}
                </span>
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
