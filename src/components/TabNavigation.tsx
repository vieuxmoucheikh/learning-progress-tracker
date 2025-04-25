import React, { useRef, useEffect, useState } from 'react';
import { Brain, LayoutDashboard, Activity, FlaskConical, FlameKindling, Clock, List } from 'lucide-react';
import './TabNavigation.css';

export const TAB_OPTIONS = {
  DASHBOARD: 'dashboard',
  ANALYTICS: 'analytics',
  FLASHCARDS: 'flashcards',
  LEARNING_CARDS: 'learning-cards',
  POMODORO: 'pomodoro',
  ITEMS: 'items'
};

interface TabNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const TabNavigation: React.FC<TabNavProps> = ({ activeTab, onTabChange }) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const activeTabRef = useRef<HTMLButtonElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Liste des onglets avec leurs icônes et descriptions
  const tabs = [
    {
      id: TAB_OPTIONS.DASHBOARD,
      label: 'Dashboard',
      shortLabel: 'Dashboard',
      icon: <LayoutDashboard size={20} />,
      description: 'Vue d\'ensemble de vos progrès d\'apprentissage'
    },
    {
      id: TAB_OPTIONS.ITEMS,
      label: 'All Items',
      shortLabel: 'Items',
      icon: <List size={20} />,
      description: 'Voir tous vos éléments d\'apprentissage'
    },
    {
      id: TAB_OPTIONS.ANALYTICS,
      label: 'Analytics',
      shortLabel: 'Stats',
      icon: <Activity size={20} />,
      description: 'Visualisez vos progrès et statistiques'
    },
    {
      id: TAB_OPTIONS.FLASHCARDS,
      label: 'Flashcards',
      shortLabel: 'Flash',
      icon: <FlaskConical size={20} />,
      description: 'Pratiquez avec des cartes mémoire'
    },
    {
      id: TAB_OPTIONS.LEARNING_CARDS,
      label: 'Learning Cards',
      shortLabel: 'Learn',
      icon: <FlameKindling size={20} />,
      description: 'Consultez vos fiches d\'apprentissage'
    },
    {
      id: TAB_OPTIONS.POMODORO,
      label: 'Pomodoro',
      shortLabel: 'Pomodoro',
      icon: <Clock size={20} />,
      description: 'Utilisez la technique Pomodoro pour concentrer votre travail'
    },
  ];

  // Scroll to active tab when it changes or on mobile resize
  useEffect(() => {
    if (activeTabRef.current && scrollContainerRef.current) {
      setTimeout(() => {
        if (activeTabRef.current && scrollContainerRef.current) {
          // Simple direct scrolling without animations or calculations
          activeTabRef.current.scrollIntoView({ 
            inline: 'center',
            block: 'nearest'
          });
        }
      }, 100); // Short delay to ensure rendering is complete
    }
  }, [activeTab, isMobile]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      const newIsMobile = window.innerWidth < 768;
      setIsMobile(newIsMobile);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Simple tab click handler
  const handleTabClick = (tabId: string) => {
    onTabChange(tabId);
  };

  return (
    <div className="tab-navigation-container">
      <div className="mobile-logo-container">
        <div className="mobile-logo">
          <Brain className="logo-icon" />
        </div>
      </div>
      
      {/* Simplified navigation items container */}
      <div 
        className="tab-navigation-items" 
        ref={scrollContainerRef}
        role="tablist"
        aria-orientation={isMobile ? "horizontal" : "vertical"}
        aria-label="Navigation principale"
      >
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            ref={tab.id === activeTab ? activeTabRef : null}
            onClick={() => handleTabClick(tab.id)}
            className={`tab-navigation-item ${activeTab === tab.id ? 'active' : ''}`}
            style={{ '--item-index': index } as React.CSSProperties}
            tabIndex={0}
            aria-current={activeTab === tab.id ? 'page' : undefined}
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-label={tab.description || tab.label}
            title={tab.description}
          >
            <span className="nav-icon">{tab.icon}</span>
            <span className="nav-text">
              {isMobile ? tab.shortLabel : tab.label}
            </span>
          </button>
        ))}
      </div>
      
      {/* Message d'aide au bas du menu en version desktop */}
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

export default TabNavigation;
