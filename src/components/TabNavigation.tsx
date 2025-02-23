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
    shortLabel: "Dashboard",
    icon: LayoutDashboard
  },
  {
    id: "items",
    label: "Items",
    shortLabel: "Items",
    icon: BookOpen
  },
  {
    id: "analytics",
    label: "Analytics",
    shortLabel: "Analytics",
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
      <nav className="flex space-x-4 p-4 border-b">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              )}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>
      <div className="flex-1 overflow-auto">
        {activeTab === 'flashcards' && <FlashcardsTab />}
        {/* Add your other tab content here */}
      </div>
    </div>
  );
};
