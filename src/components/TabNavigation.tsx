import React from "react";
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
  return (
    <div className="flex flex-col h-full">
      <nav className="flex justify-center mb-8 border-b overflow-x-auto w-full bg-gradient-to-r from-blue-600 to-blue-500 p-0.5 sm:p-1">
        <div className="flex -mb-px max-w-2xl w-full min-w-max px-0.5 sm:px-1">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  "flex-shrink-0 text-sm font-medium py-3 px-2.5 sm:px-4 border-b-2 flex items-center justify-center gap-1.5 sm:gap-2 transition-all min-w-[72px] sm:min-w-[90px]",
                  "hover:bg-white/10",
                  isActive
                    ? "border-white text-white"
                    : "border-transparent text-white/80 hover:text-white hover:border-white/30"
                )}
              >
                <Icon className={cn(
                  "w-4 h-4 flex-shrink-0",
                  isActive ? "text-white" : "text-white/80"
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
