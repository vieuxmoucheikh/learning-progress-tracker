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

  // Scroll active tab into view when it changes or when component loads
  useEffect(() => {
    if (activeTabRef.current && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const activeTab = activeTabRef.current;
      
      // Calculate position to center the active tab
      const containerWidth = container.offsetWidth;
      const tabWidth = activeTab.offsetWidth;
      const tabLeft = activeTab.offsetLeft;
      const scrollLeft = tabLeft - (containerWidth / 2) + (tabWidth / 2);
      
      // Use requestAnimationFrame to ensure smooth scrolling after render
      requestAnimationFrame(() => {
        container.scrollTo({
          left: scrollLeft,
          behavior: 'smooth'
        });
      });
    }
  }, [activeTab]);
  
  // Add touch events for better mobile scrolling
  const handleTouchStart = (e: React.TouchEvent) => {
    if (scrollContainerRef.current) {
      // Store the initial touch position
      scrollContainerRef.current.dataset.touchStartX = e.touches[0].clientX.toString();
    }
  };
  
  const handleTouchMove = (e: React.TouchEvent) => {
    if (scrollContainerRef.current && scrollContainerRef.current.dataset.touchStartX) {
      const touchStartX = parseInt(scrollContainerRef.current.dataset.touchStartX);
      const currentX = e.touches[0].clientX;
      const diff = touchStartX - currentX;
      
      // Scroll the container
      scrollContainerRef.current.scrollLeft += diff;
      
      // Update the touch start position
      scrollContainerRef.current.dataset.touchStartX = currentX.toString();
    }
  };

  return (
    <div className="tab-navigation-container">
      <div className="flex justify-center mb-2 mt-1 md:mb-6 md:mt-0">
        <h2 className="text-white font-bold text-xl hidden md:block">Learning Tracker</h2>
        {/* Suppression du texte "Menu" sur mobile */}
      </div>
      <div 
        className="tab-navigation-items" 
        ref={scrollContainerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
      >
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
            aria-current={activeTab === tab.id ? 'page' : undefined}
          >
            <span className="flex-shrink-0">{tab.icon}</span>
            <span className="inline text-sm font-medium">{tab.id === activeTab ? tab.label : tab.shortLabel}</span>
          </button>
        ))}
      </div>
      <div className="hidden md:block mt-auto mx-4 mb-4">
        <div className="px-3 py-2 text-xs bg-white bg-opacity-10 rounded text-white text-center">
          <span className="block opacity-80">Getting Started?</span>
          <span className="block mt-1 font-semibold">Add your first learning item with the "+ Add Item" button</span>
        </div>
      </div>
    </div>
  );
};
