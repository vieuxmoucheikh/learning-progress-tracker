import React, { useState, useEffect, useRef } from 'react';
import { Brain, LayoutDashboard, BookOpen, Calendar, ListTodo, BarChart2, FlaskConical, Activity } from 'lucide-react';
import './TabNavigation.css';

export const TAB_OPTIONS = {
  DASHBOARD: 'dashboard',
  ITEMS: 'items',
  LEARNING_CARDS: 'learning-cards',
  CALENDAR: 'calendar',
  POMODORO: 'pomodoro',
  ANALYTICS: 'analytics',
  FLASHCARDS: 'flashcards'
};

interface TabNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

// Simplified version without complex animations and calculations
export const TabNavigation: React.FC<TabNavigationProps> = ({ activeTab, onTabChange }) => {
  const [isMobile, setIsMobile] = useState(true); // Default to mobile
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const activeTabRef = useRef<HTMLButtonElement>(null);
  
  // Simple media query for mobile detection
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    // Initial check
    handleResize();
    
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Simple scroll to active tab
  useEffect(() => {
    if (isMobile && activeTabRef.current && scrollContainerRef.current) {
      try {
        activeTabRef.current.scrollIntoView({
          inline: 'center',
          behavior: 'auto'
        });
      } catch (error) {
        console.error('Error scrolling:', error);
      }
    }
  }, [activeTab, isMobile]);

  const tabs = [
    {
      id: TAB_OPTIONS.DASHBOARD,
      label: 'Dashboard',
      shortLabel: 'Dashboard',
      icon: <LayoutDashboard size={20} />,
      description: 'Vue d\'ensemble de tous vos apprentissages'
    },
    {
      id: TAB_OPTIONS.ITEMS,
      label: 'Learning Items',
      shortLabel: 'Items',
      icon: <ListTodo size={20} />,
      description: 'Gérer vos éléments d\'apprentissage'
    },
    {
      id: TAB_OPTIONS.LEARNING_CARDS,
      label: 'Learning Cards',
      shortLabel: 'Cards',
      icon: <BookOpen size={20} />,
      description: 'Consulter vos cartes d\'apprentissage'
    },
    {
      id: TAB_OPTIONS.CALENDAR,
      label: 'Calendar',
      shortLabel: 'Calendar',
      icon: <Calendar size={20} />,
      description: 'Visualiser votre calendrier d\'apprentissage'
    },
    {
      id: TAB_OPTIONS.POMODORO,
      label: 'Pomodoro',
      shortLabel: 'Pomodoro',
      icon: <Activity size={20} />,
      description: 'Technique Pomodoro pour la gestion du temps'
    },
    {
      id: TAB_OPTIONS.FLASHCARDS,
      label: 'Flashcards',
      shortLabel: 'Flashcards',
      icon: <FlaskConical size={20} />,
      description: 'Créer et étudier des cartes mémoire'
    },
    {
      id: TAB_OPTIONS.ANALYTICS,
      label: 'Analytics',
      shortLabel: 'Analytics',
      icon: <BarChart2 size={20} />,
      description: 'Analyser vos progrès d\'apprentissage'
    }
  ];

  return (
    <div className="tab-navigation-container">
      <div className="mobile-logo-container">
        <div className="mobile-logo">
          <Brain className="logo-icon" />
        </div>
      </div>
      
      <div 
        className="tab-navigation-items"
        ref={scrollContainerRef}
        role="tablist"
        aria-orientation={isMobile ? "horizontal" : "vertical"}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            ref={tab.id === activeTab ? activeTabRef : null}
            onClick={() => onTabChange(tab.id)}
            className={`tab-navigation-item ${activeTab === tab.id ? 'active' : ''}`}
            role="tab"
            aria-selected={activeTab === tab.id}
          >
            <span className="nav-icon">{tab.icon}</span>
            <span className="nav-text">
              {isMobile ? tab.shortLabel : tab.label}
            </span>
          </button>
        ))}
      </div>
      
      <div className="getting-started-tip-container">
        <div className="getting-started-tip">
          <span className="tip-heading">Nouveau ici ?</span>
          <span className="tip-text">
            Commencez par ajouter un élément avec "Add Item"
          </span>
        </div>
      </div>
    </div>
  );
};
