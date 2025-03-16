import React from 'react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface Tab {
  id: string;
  label: string;
  icon: LucideIcon;
}

interface TabNavigationProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
  tabs?: Tab[];
}

export const TabNavigation: React.FC<TabNavigationProps> = ({ 
  activeTab, 
  onTabChange,
  tabs = []
}) => {
  // Si aucun onglet n'est fourni, utiliser une liste vide (pour éviter les erreurs)
  const tabsToRender = tabs.length > 0 ? tabs : [];

  return (
    <nav className="h-full p-4 space-y-4 bg-slate-50 dark:bg-slate-900">
      <div className="flex flex-col items-center md:items-start">
        <h2 className="text-xl font-bold mb-6 text-slate-800 dark:text-slate-100">
          Learning Tracker
        </h2>
        
        <div className="space-y-2 w-full">
          {tabsToRender.map((tab) => {
            const Icon = tab.icon;
            return (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? "default" : "ghost"}
                className={cn(
                  "w-full justify-start gap-2",
                  activeTab === tab.id
                    ? "bg-blue-600 text-white"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100"
                )}
                onClick={() => onTabChange(tab.id)}
              >
                <Icon className="h-5 w-5" />
                <span>{tab.label}</span>
              </Button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
