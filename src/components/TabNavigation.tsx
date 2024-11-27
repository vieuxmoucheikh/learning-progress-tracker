import { BarChart3, BookOpen, LayoutDashboard } from "lucide-react";
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
    icon: LayoutDashboard
  },
  {
    id: "items",
    label: "Learning Items",
    icon: BookOpen
  },
  {
    id: "analytics",
    label: "Analytics",
    icon: BarChart3
  }
];

export function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  const handleTabChange = useCallback((tabId: string) => {
    requestAnimationFrame(() => {
      onTabChange(tabId);
    });
  }, [onTabChange]);

  return (
    <div className="flex justify-center mb-8 border-b">
      <nav className="flex -mb-px max-w-2xl w-full" aria-label="Tabs">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={cn(
                "w-full text-sm font-medium py-4 px-1 border-b-2 flex items-center justify-center gap-2 transition-colors",
                isActive
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              )}
              style={{ transition: "border-color 0.15s ease-in-out, color 0.15s ease-in-out" }}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
