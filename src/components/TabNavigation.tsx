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
  const [velocity, setVelocity] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const [lastTouchTimestamp, setLastTouchTimestamp] = useState(0);
  const [touchStarted, setTouchStarted] = useState(false);
  const [preventClick, setPreventClick] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const activeTabRef = useRef<HTMLButtonElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const touchMoveCountRef = useRef(0);
  const prefersReducedMotion = useRef(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  
  // Nettoyage des animations à la sortie
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Fonction de défilement fluide optimisée avec easing cubic-bezier
  const smoothScrollTo = useCallback((element: HTMLElement, to: number, duration: number = 300) => {
    // Si l'utilisateur préfère des mouvements réduits, effectuer un défilement instantané
    if (prefersReducedMotion.current) {
      element.scrollLeft = to;
      return;
    }
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    const start = element.scrollLeft;
    const change = to - start;
    const startTime = performance.now();
    
    // Ajouter une classe pour désactiver les transitions pendant le défilement
    if (element.classList) {
      element.classList.add('scrolling');
    }
    
    // Fonction d'animation avec easing cubic-bezier personnalisé
    const animateScroll = (currentTime: number) => {
      const elapsedTime = currentTime - startTime;
      
      if (elapsedTime >= duration) {
        element.scrollLeft = to;
        
        // Retirer la classe après le défilement
        if (element.classList) {
          setTimeout(() => {
            element.classList.remove('scrolling');
          }, 50);
        }
        return;
      }

      // Easing function: cubicBezier(0.33, 1, 0.68, 1) - délicieux et naturel
      const t = elapsedTime / duration;
      let progress;
      
      // Implémentation personnalisée de cubic-bezier pour une animation super fluide
      const x1 = 0.33, y1 = 1, x2 = 0.68, y2 = 1;
      
      // Calcul approximatif de cubic-bezier
      const calcBezier = (t: number, p1: number, p2: number) => {
        return 3 * t * (1 - t) * (1 - t) * p1 + 3 * t * t * (1 - t) * p2 + t * t * t;
      };
      
      progress = calcBezier(t, y1, y2);
      
      element.scrollLeft = start + change * progress;
      animationFrameRef.current = requestAnimationFrame(animateScroll);
    };
    
    animationFrameRef.current = requestAnimationFrame(animateScroll);
  }, []);
  
  // Détection du mode mobile avec debounce
  useEffect(() => {
    let resizeTimer: NodeJS.Timeout;
    
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        const newIsMobile = window.innerWidth < 768;
        setIsMobile(newIsMobile);
        
        // Réinitialiser la position de défilement lors du changement de mode
        if (!newIsMobile && scrollContainerRef.current) {
          scrollContainerRef.current.scrollLeft = 0;
        }
      }, 100); // Debounce de 100ms
    };

    // Détecter les préférences de mouvement réduit
    const motionMediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleMotionPreferenceChange = (e: MediaQueryListEvent) => {
      prefersReducedMotion.current = e.matches;
    };

    window.addEventListener('resize', handleResize);
    motionMediaQuery.addEventListener('change', handleMotionPreferenceChange);
    
    // Appel initial
    handleResize();
    
    return () => {
      window.removeEventListener('resize', handleResize);
      motionMediaQuery.removeEventListener('change', handleMotionPreferenceChange);
      clearTimeout(resizeTimer);
    };
  }, []);

  // Centre automatiquement l'onglet actif dans la vue avec un délai
  useEffect(() => {
    if (isMobile && activeTabRef.current && scrollContainerRef.current) {
      // Délai court pour s'assurer que le DOM est bien rendu
      const timeoutId = setTimeout(() => {
        if (!activeTabRef.current || !scrollContainerRef.current) return;
        
        const container = scrollContainerRef.current;
        const activeElement = activeTabRef.current;
        
        // Obtenir les positions et dimensions
        const containerWidth = container.clientWidth;
        const activeElementWidth = activeElement.clientWidth;
        const activeElementLeft = activeElement.offsetLeft;
        
        // Calculer la position de défilement pour centrer l'élément actif
        const scrollPosition = activeElementLeft - (containerWidth / 2) + (activeElementWidth / 2);
        
        // Utiliser notre fonction de défilement améliorée avec une durée plus longue
        // pour une animation plus douce lors du changement d'onglet
        smoothScrollTo(container, scrollPosition, 500);
      }, 50);
      
      return () => clearTimeout(timeoutId);
    }
  }, [activeTab, isMobile, smoothScrollTo]);

  // Gestion du défilement par inertie améliorée avec physique raffinée
  useEffect(() => {
    if (!isScrolling || !scrollContainerRef.current) return;
    
    let lastTime = performance.now();
    let momentumScroll = (currentTime: number) => {
      const deltaTime = currentTime - lastTime;
      lastTime = currentTime;
      
      if (!scrollContainerRef.current || Math.abs(velocity) < 0.5) {
        setIsScrolling(false);
        snapToNearestTab(); // Snap à la fin du défilement par inertie
        return;
      }
      
      // Appliquer une friction dépendante du temps pour un comportement plus naturel
      // Formule améliorée pour une sensation plus réaliste
      const friction = Math.pow(0.92, deltaTime / 16); // Friction légèrement plus importante pour un meilleur contrôle
      const newVelocity = velocity * friction;
      
      // Déplacement avec compensation du temps écoulé pour une animation indépendante du framerate
      scrollContainerRef.current.scrollLeft += newVelocity * (deltaTime / 16);
      setVelocity(newVelocity);
      
      animationFrameRef.current = requestAnimationFrame(momentumScroll);
    };
    
    animationFrameRef.current = requestAnimationFrame(momentumScroll);
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isScrolling, velocity]);

  // Gérer le début du toucher avec prévention des événements multiples
  const handleTouchStart = (e: React.TouchEvent) => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    // Éviter les manipulations involontaires
    if (e.touches.length !== 1) return;
    
    // Réinitialiser l'état
    touchMoveCountRef.current = 0;
    setVelocity(0);
    setIsScrolling(false);
    setTouchStartX(e.touches[0].clientX);
    setLastTouchTimestamp(e.timeStamp);
    setTouchStarted(true);
    setPreventClick(false);
    
    // Ajouter une classe pour stylisation pendant le défilement
    if (scrollContainerRef.current) {
      scrollContainerRef.current.classList.add('touch-active');
    }
  };

  // Gérer le mouvement du toucher avec optimisations
  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX === null || !scrollContainerRef.current || !touchStarted) return;
    
    // Ignorer les gestes multi-touch
    if (e.touches.length !== 1) return;
    
    const touchX = e.touches[0].clientX;
    const diff = touchStartX - touchX;
    const timeElapsed = e.timeStamp - lastTouchTimestamp;
    
    // Compteur de mouvements pour déterminer s'il s'agit d'un scroll intentionnel
    touchMoveCountRef.current += 1;
    
    // Détecter si l'utilisateur fait défiler intentionnellement
    if (touchMoveCountRef.current > 3 && Math.abs(diff) > 10) {
      setPreventClick(true);
    }
    
    // Ne pas traiter les mouvements mineurs pour éviter les déclenchements accidentels
    if (Math.abs(diff) < 1) return;
    
    // Calculer la vélocité (pour le défilement par inertie)
    // Formule optimisée pour une meilleure réactivité
    const newVelocity = timeElapsed > 0 ? (diff / timeElapsed) * 16 : 0;
    
    // Appliquer le défilement en fonction de la distance parcourue par le doigt
    scrollContainerRef.current.scrollLeft += diff;
    
    // Mettre à jour l'état pour le prochain mouvement
    setTouchStartX(touchX);
    setLastTouchTimestamp(e.timeStamp);
    setVelocity(newVelocity);
    
    // Prévenir le défilement de la page seulement si le mouvement est significatif
    if (Math.abs(diff) > 5) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  // Gérer la fin du toucher avec optimisations
  const handleTouchEnd = () => {
    if (!touchStarted) return;
    
    setTouchStarted(false);
    
    // Retirer la classe de stylisation
    if (scrollContainerRef.current) {
      scrollContainerRef.current.classList.remove('touch-active');
    }
    
    // Activer le défilement par inertie si la vélocité est suffisante
    if (Math.abs(velocity) > 0.5 && scrollContainerRef.current) {
      setIsScrolling(true);
    } else {
      setIsScrolling(false);
      // Snap seulement si la vélocité est faible (pas un swipe rapide)
      snapToNearestTab();
    }
    
    setTouchStartX(null);
    
    // Réinitialiser après un court délai pour permettre le clic si c'était intentionnel
    setTimeout(() => {
      setPreventClick(false);
    }, 300);
  };

  // Fonction pour s'aligner automatiquement sur l'onglet le plus proche - optimisée
  const snapToNearestTab = useCallback(() => {
    if (!scrollContainerRef.current || prefersReducedMotion.current) return;
    
    const container = scrollContainerRef.current;
    const scrollLeft = container.scrollLeft;
    const containerWidth = container.clientWidth;
    const containerCenter = scrollLeft + containerWidth / 2;
    
    // Trouver l'onglet le plus proche du centre
    const tabs = Array.from(container.children) as HTMLElement[];
    
    if (tabs.length === 0) return;
    
    let closestTab = tabs[0];
    let minDistance = Infinity;
    
    for (const tab of tabs) {
      const tabCenter = tab.offsetLeft + tab.offsetWidth / 2;
      const distance = Math.abs(tabCenter - containerCenter);
      
      if (distance < minDistance) {
        minDistance = distance;
        closestTab = tab;
      }
    }
    
    // Faire défiler jusqu'à l'onglet le plus proche
    const tabCenter = closestTab.offsetLeft + closestTab.offsetWidth / 2;
    const scrollTo = tabCenter - containerWidth / 2;
    
    // Animation plus douce pour le snap
    smoothScrollTo(container, scrollTo, 350);
  }, [smoothScrollTo]);

  // Gestionnaire de défilement terminé
  const handleScrollEnd = useCallback(() => {
    // Snap à la fin d'un défilement manuel (sans inertie)
    if (!isScrolling && scrollContainerRef.current) {
      snapToNearestTab();
    }
  }, [isScrolling, snapToNearestTab]);

  // Détecter la fin du défilement
  useEffect(() => {
    if (!scrollContainerRef.current) return;
    
    let timeout: NodeJS.Timeout;
    const container = scrollContainerRef.current;
    
    const handleScroll = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        if (!isScrolling) {
          handleScrollEnd();
        }
      }, 150);
    };
    
    container.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      container.removeEventListener('scroll', handleScroll);
      clearTimeout(timeout);
    };
  }, [handleScrollEnd, isScrolling]);
  
  // Gestionnaire de clic conditionnel pour éviter les clics accidentels pendant le défilement
  const handleTabClick = useCallback((tabId: string) => {
    if (preventClick) return;
    onTabChange(tabId);
  }, [preventClick, onTabChange]);

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
        className={`tab-navigation-items ${isScrolling ? 'scrolling' : ''}`}
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
            onClick={() => handleTabClick(tab.id)}
            className={`
              tab-navigation-item
              ${activeTab === tab.id ? 'active' : ''}
              flex items-center gap-2 transition-all
              ${isScrolling ? 'touch-none' : ''}
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
