import React, { useRef, useEffect, useState } from 'react';
import { Brain, LayoutDashboard, Activity, FlaskConical, FlameKindling, Clock } from 'lucide-react';
import './TabNavigation.css';

export const TAB_OPTIONS = {
  DASHBOARD: 'dashboard',
  ANALYTICS: 'analytics',
  FLASHCARDS: 'flashcards',
  LEARNING_CARDS: 'learning-cards',
  POMODORO: 'pomodoro'
};

interface TabNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const TabNavigation: React.FC<TabNavProps> = ({ activeTab, onTabChange }) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const activeTabRef = useRef<HTMLButtonElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const lastTouchX = useRef<number | null>(null);
  
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
      id: TAB_OPTIONS.ANALYTICS,
      label: 'Analytics',
      shortLabel: 'Stats',
      icon: <Activity size={20} />,
      description: 'Visualisez vos progrès et statistiques'
    },
    {
      id: TAB_OPTIONS.FLASHCARDS,
      label: 'Flashcards',
      shortLabel: 'Cards',
      icon: <FlaskConical size={20} />,
      description: 'Pratiquez avec des cartes mémoire'
    },
    {
      id: TAB_OPTIONS.LEARNING_CARDS,
      label: 'Learning Cards',
      shortLabel: 'Cards',
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

  // Gestion du scroll vers l'onglet actif sur mobile
  useEffect(() => {
    if (isMobile && activeTabRef.current && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const activeTab = activeTabRef.current;
      
      // Calculer la position de défilement pour centrer l'élément
      const scrollLeft = activeTab.offsetLeft - (container.clientWidth / 2) + (activeTab.clientWidth / 2);
      
      // Appliquer le défilement avec une animation fluide
      container.scrollTo({
        left: scrollLeft,
        behavior: 'smooth'
      });
    }
  }, [activeTab, isMobile]);

  // Détection des changements de taille d'écran pour les adaptations responsive
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Gestion du défilement tactile horizontal sur mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    lastTouchX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (scrollContainerRef.current && lastTouchX.current !== null) {
      const touchXDiff = lastTouchX.current - e.touches[0].clientX;
      scrollContainerRef.current.scrollLeft += touchXDiff;
      lastTouchX.current = e.touches[0].clientX;
    }
  };

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
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
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
              flex items-center gap-2 transition-all
            `}
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
