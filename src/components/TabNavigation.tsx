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
  Library,
  Brain,
  GraduationCap
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
  icon: React.ReactNode;
  description?: string; // Description optionnelle pour l'accessibilité
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
    { 
      id: 'dashboard', 
      label: 'Dashboard', 
      shortLabel: 'Dashboard', 
      icon: <LayoutDashboard size={20} />,
      description: 'Vue d\'ensemble de vos activités d\'apprentissage'
    },
    { 
      id: 'items', 
      label: 'All Items', 
      shortLabel: 'Items', 
      icon: <BookOpen size={20} />,
      description: 'Liste de toutes vos ressources d\'apprentissage'
    },
    { 
      id: 'analytics', 
      label: 'Analytics', 
      shortLabel: 'Stats', 
      icon: <BarChart3 size={20} />,
      description: 'Visualisation de votre progression'
    },
    { 
      id: 'pomodoro', 
      label: 'Pomodoro', 
      shortLabel: 'Timer', 
      icon: <Timer size={20} />,
      description: 'Technique de gestion du temps'
    },
    { 
      id: 'flashcards', 
      label: 'Flashcards', 
      shortLabel: 'Cards', 
      icon: <Library size={20} />,
      description: 'Vos cartes mémoire'
    },
    { 
      id: 'learning-cards', 
      label: 'Learning', 
      shortLabel: 'Learn', 
      icon: <GraduationCap size={20} />,
      description: 'Vos cartes d\'apprentissage'
    },
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
      {/* Logo ou branding - supprimer le texte Learning Tracker */}
      <div className="flex justify-center items-center mt-1 mb-2 md:mt-0">
        <div className="p-2 rounded-full bg-white/10 md:hidden">
          <Brain className="w-6 h-6 text-white" />
        </div>
      </div>
      
      <div 
        className="tab-navigation-items" 
        ref={scrollContainerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        role="tablist"
        aria-orientation="horizontal"
        aria-label="Navigation principale"
      >
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            ref={tab.id === activeTab ? activeTabRef : null}
            onClick={() => onTabChange(tab.id)}
            className={`
              tab-navigation-item
              ${activeTab === tab.id ? 'active' : ''}
              flex items-center gap-2 transition-all
            `}
            style={{ '--item-index': index } as React.CSSProperties}
            aria-current={activeTab === tab.id ? 'page' : undefined}
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-label={tab.description || tab.label}
            title={tab.description}
          >
            <span className="flex-shrink-0">{tab.icon}</span>
            <span className="inline text-sm font-medium md:font-semibold">
              {tab.id === activeTab ? tab.label : tab.shortLabel}
            </span>
          </button>
        ))}
      </div>
      
      {/* Message d'aide au bas du menu en version desktop */}
      <div className="hidden md:block mt-auto mx-4 mb-4">
        <div className="px-3 py-2 text-xs getting-started-tip">
          <span className="block font-medium text-white/80">Nouveau ici ?</span>
          <span className="block mt-1 font-semibold text-white">
            Commencez par ajouter un élément avec "Add Item"
          </span>
        </div>
      </div>
    </div>
  );
};
