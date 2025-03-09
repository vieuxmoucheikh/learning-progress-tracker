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
    { id: 'dashboard', label: 'Dashboard', shortLabel: 'Dashboard', icon: <LayoutDashboard size={18} /> },
    { id: 'items', label: 'All Items', shortLabel: 'Items', icon: <BookOpen size={18} /> },
    { id: 'analytics', label: 'Analytics', shortLabel: 'Stats', icon: <BarChart3 size={18} /> },
    { id: 'pomodoro', label: 'Pomodoro', shortLabel: 'Timer', icon: <Timer size={18} /> },
    { id: 'flashcards', label: 'Flashcards', shortLabel: 'Cards', icon: <Library size={18} /> },
    { id: 'learning-cards', label: 'Learning', shortLabel: 'Learn', icon: <Notebook size={18} /> },
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
              flex items-center gap-2 transition-all
            `}
          >
            <span className="flex-shrink-0">{tab.icon}</span>
            <span className="md:inline inline">{tab.shortLabel}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
