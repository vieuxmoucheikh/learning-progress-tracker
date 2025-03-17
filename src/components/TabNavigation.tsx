import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const activeTabRef = useRef<HTMLButtonElement>(null);
  const lastScrollLeft = useRef<number>(0);
  const scrollAnimationRef = useRef<number | null>(null);
  
  const smoothScrollTo = useCallback((element: HTMLElement, to: number, duration: number) => {
    if (scrollAnimationRef.current) {
      cancelAnimationFrame(scrollAnimationRef.current);
    }
    
    const start = element.scrollLeft;
    const change = to - start;
    const startTime = performance.now();
    
    const animateScroll = (currentTime: number) => {
      const elapsedTime = currentTime - startTime;
      
      if (elapsedTime >= duration) {
        element.scrollLeft = to;
        return;
      }
      
      // Easing function: easeInOutCubic
      const t = elapsedTime / duration;
      const progress = t < 0.5 
        ? 4 * t * t * t 
        : 1 - Math.pow(-2 * t + 2, 3) / 2;
      
      element.scrollLeft = start + change * progress;
      scrollAnimationRef.current = requestAnimationFrame(animateScroll);
    };
    
    scrollAnimationRef.current = requestAnimationFrame(animateScroll);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (scrollAnimationRef.current) {
        cancelAnimationFrame(scrollAnimationRef.current);
      }
    };
  }, []);

  // Défilement automatique pour centrer l'onglet actif sur mobile
  useEffect(() => {
    if (isMobile && activeTabRef.current && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const activeElement = activeTabRef.current;
      
      // Obtenir les positions et dimensions
      const containerWidth = container.clientWidth;
      const activeElementWidth = activeElement.clientWidth;
      const activeElementLeft = activeElement.offsetLeft;
      
      // Calculer la position de défilement pour centrer l'élément actif
      const scrollPosition = activeElementLeft - (containerWidth / 2) + (activeElementWidth / 2);
      
      // Utiliser notre fonction de défilement personnalisée
      smoothScrollTo(container, scrollPosition, 500);
    }
  }, [activeTab, isMobile, smoothScrollTo]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (scrollAnimationRef.current) {
      cancelAnimationFrame(scrollAnimationRef.current);
    }
    setIsDragging(true);
    setTouchStartX(e.touches[0].clientX);
    if (scrollContainerRef.current) {
      lastScrollLeft.current = scrollContainerRef.current.scrollLeft;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || touchStartX === null || !scrollContainerRef.current) return;
    
    e.preventDefault(); // Empêcher le défilement de la page pendant le mouvement
    const container = scrollContainerRef.current;
    const touchX = e.touches[0].clientX;
    const diff = touchStartX - touchX;
    
    container.scrollLeft = lastScrollLeft.current + diff;
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    setTouchStartX(null);
    
    if (!scrollContainerRef.current) return;
    
    // Snap to the nearest tab when touch ends
    const container = scrollContainerRef.current;
    const containerWidth = container.clientWidth;
    const scrollLeft = container.scrollLeft;
    
    // Find the tab that is most visible (closest to center)
    const tabs = Array.from(container.children) as HTMLElement[];
    let closestTab = null;
    let minDistance = Infinity;
    
    for (const tab of tabs) {
      const tabLeft = tab.offsetLeft;
      const tabCenter = tabLeft + tab.offsetWidth / 2;
      const containerCenter = scrollLeft + containerWidth / 2;
      const distance = Math.abs(tabCenter - containerCenter);
      
      if (distance < minDistance) {
        minDistance = distance;
        closestTab = tab;
      }
    }
    
    if (closestTab) {
      const tabCenter = closestTab.offsetLeft + closestTab.offsetWidth / 2;
      const containerCenter = containerWidth / 2;
      const scrollTo = tabCenter - containerCenter;
      
      smoothScrollTo(container, scrollTo, 300);
    }
  };

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
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
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
