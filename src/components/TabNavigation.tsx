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

export const TabNavigation: React.FC<TabNavigationProps> = ({ activeTab, onTabChange }) => {
  // Détection mobile simplifiée
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const activeTabRef = useRef<HTMLButtonElement>(null);
  
  // Version simplifiée de la détection mobile pour accélérer le chargement
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Centrer l'onglet actif de manière simplifiée
  useEffect(() => {
    if (isMobile && activeTabRef.current && scrollContainerRef.current) {
      try {
        const container = scrollContainerRef.current;
        const activeElement = activeTabRef.current;
        
        // Utiliser scrollIntoView qui est plus fiable et performant sur mobile
        activeElement.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center'
        });
      } catch (error) {
        console.error('Scroll error:', error);
      }
    }
  }, [activeTab, isMobile]);

  const tabs = [
    {
      id: TAB_OPTIONS.DASHBOARD,
      label: 'Dashboard',
      shortLabel: 'Dashboard',
      icon: <LayoutDashboard className="w-5 h-5" />,
      description: 'Vue d\'ensemble de tous vos apprentissages'
    },
    {
      id: TAB_OPTIONS.ITEMS,
      label: 'Learning Items',
      shortLabel: 'Items',
      icon: <ListTodo className="w-5 h-5" />,
      description: 'Gérer vos éléments d\'apprentissage'
    },
    {
      id: TAB_OPTIONS.LEARNING_CARDS,
      label: 'Learning Cards',
      shortLabel: 'Cards',
      icon: <BookOpen className="w-5 h-5" />,
      description: 'Consulter vos cartes d\'apprentissage'
    },
    {
      id: TAB_OPTIONS.CALENDAR,
      label: 'Calendar',
      shortLabel: 'Calendar',
      icon: <Calendar className="w-5 h-5" />,
      description: 'Visualiser votre calendrier d\'apprentissage'
    },
    {
      id: TAB_OPTIONS.POMODORO,
      label: 'Pomodoro',
      shortLabel: 'Pomodoro',
      icon: <Activity className="w-5 h-5" />,
      description: 'Technique Pomodoro pour la gestion du temps'
    },
    {
      id: TAB_OPTIONS.FLASHCARDS,
      label: 'Flashcards',
      shortLabel: 'Flashcards',
      icon: <FlaskConical className="w-5 h-5" />,
      description: 'Créer et étudier des cartes mémoire'
    },
    {
      id: TAB_OPTIONS.ANALYTICS,
      label: 'Analytics',
      shortLabel: 'Analytics',
      icon: <BarChart2 className="w-5 h-5" />,
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
              flex items-center gap-2
            `}
            style={{ '--item-index': index } as React.CSSProperties}
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
