import React, { useRef, useEffect } from "react";
import { BarChart3, BookOpen, LayoutDashboard, Timer, Notebook, Library } from "lucide-react";
import { cn } from "@/lib/utils";
import { FlashcardsTab } from './FlashcardsTab';
import { LucideIcon } from "lucide-react";

interface Tab {
  id: string;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
}

interface TabNavigationProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

const tabs: Tab[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    shortLabel: "Home",
    icon: LayoutDashboard
  },
  {
    id: "items",
    label: "Learning Items",
    shortLabel: "Items",
    icon: BookOpen
  },
  {
    id: "learning-cards",
    label: "Learning Cards",
    shortLabel: "Cards",
    icon: Notebook
  },
  {
    id: "analytics",
    label: "Analytics",
    shortLabel: "Stats",
    icon: BarChart3
  },
  {
    id: "pomodoro",
    label: "Pomodoro",
    shortLabel: "Timer",
    icon: Timer
  },
  {
    id: "flashcards",
    label: "Flashcards",
    shortLabel: "Flash",
    icon: Library
  }
];

export const TabNavigation: React.FC<TabNavigationProps> = ({
  activeTab,
  onTabChange,
}) => {
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const activeTabRef = useRef<HTMLButtonElement>(null);
  const indicatorRef = useRef<HTMLDivElement>(null);

  // Scroll to active tab when it changes and update indicator position
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

      // Update indicator position
      if (indicatorRef.current) {
        indicatorRef.current.style.width = `${activeTabElement.offsetWidth}px`;
        indicatorRef.current.style.transform = `translateX(${activeTabElement.offsetLeft}px)`;
      }
    }
  }, [activeTab]);

  // Add CSS for hiding scrollbars
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
      <nav className="flex justify-center mb-8 w-full bg-card shadow-sm relative">
        <div 
          ref={tabsContainerRef}
          className="flex max-w-2xl w-full overflow-x-auto px-0.5 sm:px-1 hide-scrollbar relative"
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
                  "flex-shrink-0 text-sm font-medium py-4 px-3 sm:px-5 flex items-center justify-center gap-2 transition-all duration-200 ease-in-out min-w-[80px] sm:min-w-[100px] relative z-10",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
                aria-selected={isActive}
              >
                <Icon className={cn(
                  "w-5 h-5 flex-shrink-0 transition-all duration-200",
                  isActive ? "text-primary" : "text-muted-foreground"
                )} />
                <span className="whitespace-nowrap font-medium">{tab.shortLabel}</span>
              </button>
            );
          })}
          
          {/* Animated indicator */}
          <div 
            ref={indicatorRef}
            className="absolute bottom-0 h-0.5 bg-primary transition-all duration-300 ease-in-out"
            style={{ height: '2px' }}
          />
        </div>
      </nav>
      <div className="flex-1 overflow-auto">
        {activeTab === 'flashcards' && <FlashcardsTab />}
        {/* Add your other tab content here */}
      </div>
    </div>
  );
};
