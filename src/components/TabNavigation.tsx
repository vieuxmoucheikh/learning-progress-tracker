import React from 'react';
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
import './TabNavigation.css';

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
    { id: 'dashboard', label: 'Dashboard', shortLabel: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { id: 'items', label: 'All Items', shortLabel: 'Items', icon: <BookOpen size={20} /> },
    { id: 'analytics', label: 'Analytics', shortLabel: 'Stats', icon: <BarChart3 size={20} /> },
    { id: 'pomodoro', label: 'Pomodoro', shortLabel: 'Timer', icon: <Timer size={20} /> },
    { id: 'flashcards', label: 'Flashcards', shortLabel: 'Cards', icon: <Library size={20} /> },
    { id: 'learning-cards', label: 'Learning', shortLabel: 'Learn', icon: <Notebook size={20} /> },
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

  return (
    <div className="tab-navigation-container">
      <div className="flex justify-center mb-2 mt-1 md:mb-6 md:mt-0">
        <h2 className="text-white font-bold text-xl hidden md:block">Learning Tracker</h2>
        <h2 className="text-white font-bold text-lg md:hidden">Menu</h2>
      </div>
      <div className="tab-navigation-items" ref={scrollContainerRef}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            ref={tab.id === activeTab ? activeTabRef : null}
            onClick={() => onTabChange(tab.id)}
            className={`
              px-4 py-3 text-sm md:text-base whitespace-nowrap
              tab-navigation-item
              ${activeTab === tab.id ? 'active' : ''}
              flex items-center gap-3 transition-all
            `}
          >
            <span className="flex-shrink-0">{tab.icon}</span>
            <span className="inline">{tab.id === activeTab ? tab.label : tab.shortLabel}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
