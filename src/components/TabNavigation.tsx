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
  }
];

export function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  const handleTabChange = useCallback((tabId: string) => {
    requestAnimationFrame(() => {
      onTabChange(tabId);
    });
  }, [onTabChange]);

  return (
    <div className="flex justify-center mb-8 border-b overflow-x-auto w-full bg-gradient-to-r from-blue-600 to-blue-500">
      <nav className="flex -mb-px max-w-2xl w-full min-w-max px-1" aria-label="Tabs">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={cn(
                "flex-shrink-0 text-sm font-medium py-3 px-4 border-b-2 flex items-center justify-center gap-2 transition-all min-w-[90px]",
                "hover:bg-white/10",
                isActive
                  ? "border-white text-white"
                  : "border-transparent text-white/80 hover:text-white hover:border-white/30"
              )}
              style={{ transition: "border-color 0.15s ease-in-out, color 0.15s ease-in-out, background-color 0.15s ease-in-out" }}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className={cn(
                "w-4 h-4 flex-shrink-0",
                isActive ? "text-white" : "text-white/80"
              )} />
              <span className="whitespace-nowrap">{tab.shortLabel}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
