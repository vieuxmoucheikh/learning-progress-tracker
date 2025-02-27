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
    shortLabel: "Flashcards",
    icon: Library
  }
];

export const TabNavigation: React.FC<TabNavigationProps> = ({
  activeTab,
  onTabChange,
}) => {
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
      <nav className="flex justify-center mb-8 border-b w-full bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 dark:from-blue-600 dark:via-blue-700 dark:to-blue-800 p-0.5 sm:p-1 shadow-md relative overflow-hidden">
        {/* Add subtle pattern overlay */}
        <div className="absolute inset-0 opacity-10 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICAgIDxwYXRoIGQ9Ik0yOS41IDUyLjVDNDMuNTgxIDUyLjUgNTUgNDEuMDgxIDU1IDI3UzQzLjU4MSAxLjUgMjkuNSAxLjVDMTUuNDE5IDEuNSA0IDEyLjkxOSA0IDI3UzE1LjQxOSA1Mi41IDI5LjUgNTIuNXoiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLXdpZHRoPSIxIiBzdHJva2UtZGFzaGFycmF5PSIxLDUiLz4KPC9zdmc+Cg==')]"></div>
        
        {/* Add subtle top highlight */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>
        
        <div 
          ref={tabsContainerRef}
          className="flex -mb-px max-w-2xl w-full overflow-x-auto px-0.5 sm:px-1 hide-scrollbar relative z-10"
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
                  "flex-shrink-0 text-sm font-medium py-3 px-2.5 sm:px-4 border-b-2 flex items-center justify-center gap-1.5 sm:gap-2 transition-all min-w-[72px] sm:min-w-[90px] relative",
                  "hover:bg-white/10 dark:hover:bg-white/5",
                  isActive
                    ? "border-white text-white dark:border-white dark:text-white after:absolute after:bottom-0 after:left-0 after:right-0 after:h-1 after:bg-white after:rounded-t-md"
                    : "border-transparent text-white/80 hover:text-white hover:border-white/30 dark:text-white/70 dark:hover:text-white dark:hover:border-white/30"
                )}
              >
                {/* Add subtle glow effect for active tab */}
                {isActive && (
                  <span className="absolute inset-0 bg-white/10 rounded-t-md blur-[1px] -z-10"></span>
                )}
                <Icon className={cn(
                  "w-4 h-4 flex-shrink-0",
                  isActive ? "text-white dark:text-white" : "text-white/80 dark:text-white/70"
                )} />
                <span className="whitespace-nowrap">{tab.shortLabel}</span>
              </button>
            );
          })}
        </div>
      </nav>
      <div className="flex-1 overflow-auto">
        {activeTab === 'flashcards' && <FlashcardsTab />}
        {/* Add your other tab content here */}
      </div>
    </div>
  );
};
