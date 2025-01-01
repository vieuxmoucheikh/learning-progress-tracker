import { BarChart3, BookOpen, LayoutDashboard, Timer, Notebook } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCallback } from "react";

interface TabNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const tabs = [
  {
    id: "dashboard",
    label: "Dashboard",
    shortLabel: "Dashboard",
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
    shortLabel: "Analytics",
    icon: BarChart3
  },
  {
    id: "pomodoro",
    label: "Pomodoro",
    shortLabel: "Pomodoro",
    icon: Timer
  }
];

export function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  const handleTabChange = useCallback((tabId: string) => {
    requestAnimationFrame(() => {
      onTabChange(tabId);
    });
  }, [onTabChange]);

  return (
    <div className="flex justify-center mb-8 border-b overflow-x-auto w-full bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-900/95 backdrop-blur-sm">
      <nav className="flex -mb-px max-w-2xl w-full min-w-max px-0.5" aria-label="Tabs">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={cn(
                "flex-shrink-0 text-sm font-medium py-3 px-2 border-b-2 flex items-center justify-center gap-1.5 transition-all min-w-[70px]",
                "hover:bg-blue-50/50 dark:hover:bg-blue-950/30",
                isActive
                  ? "border-blue-500 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-blue-900/70 hover:text-blue-800 dark:text-blue-300/90 dark:hover:text-blue-200 hover:border-blue-200"
              )}
              style={{ transition: "border-color 0.15s ease-in-out, color 0.15s ease-in-out, background-color 0.15s ease-in-out" }}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className={cn(
                "w-4 h-4 flex-shrink-0",
                isActive ? "text-blue-500 dark:text-blue-400" : "text-blue-600/60 dark:text-blue-400/60"
              )} />
              <span className="hidden sm:inline whitespace-nowrap">{tab.label}</span>
              <span className="sm:hidden whitespace-nowrap text-[13px]">{tab.shortLabel}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
