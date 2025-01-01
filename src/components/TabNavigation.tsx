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
    <div className="flex justify-center mb-8 border-b overflow-x-auto w-full bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
      <nav className="flex -mb-px max-w-2xl w-full min-w-max px-1" aria-label="Tabs">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={cn(
                "flex-shrink-0 text-sm font-medium py-3 px-2.5 border-b-2 flex items-center justify-center gap-1.5 transition-all",
                "hover:bg-gray-50 dark:hover:bg-gray-800/50",
                isActive
                  ? "border-blue-500 text-blue-700 dark:text-blue-300"
                  : "border-transparent text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100 hover:border-gray-300"
              )}
              style={{ transition: "border-color 0.15s ease-in-out, color 0.15s ease-in-out, background-color 0.15s ease-in-out" }}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className={cn(
                "w-4 h-4 flex-shrink-0",
                isActive ? "text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-gray-400"
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
