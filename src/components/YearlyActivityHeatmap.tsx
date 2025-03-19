import React, { useMemo, useEffect, useState, useRef } from 'react';
import { format, parseISO, getDay, addDays, startOfYear, endOfYear } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { ChevronDown, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

interface HeatmapProps {
  data: { date: string; count: number }[];
  year: number;
  isDarkMode?: boolean;
  onYearChange?: (year: number) => void;
}

const DAYS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
const MONTHS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

// Générer une plage d'années plus large (15 ans en arrière et 10 ans en avant)
const generateAvailableYears = (): number[] => {
  const currentYear = new Date().getFullYear();
  const recentYears = Array.from({ length: 15 }, (_, i) => currentYear - 14 + i);
  const futureYears = Array.from({ length: 10 }, (_, i) => currentYear + 1 + i);
  return [...recentYears, ...futureYears];
};

export function YearlyActivityHeatmap({ 
  data, 
  year, 
  isDarkMode = false,
  onYearChange 
}: HeatmapProps) {
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const [scale, setScale] = useState<number>(1);
  const [showYearDropdown, setShowYearDropdown] = useState(false);
  const [selectedYear, setSelectedYear] = useState(year);
  const [tooltipContent, setTooltipContent] = useState<string>('');
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [isScrollActive, setIsScrollActive] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const selectorRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const heatmapContainerRef = useRef<HTMLDivElement>(null);
  
  // Générer des années avec classification
  const availableYears = useMemo(() => {
    const years = generateAvailableYears();
    const currentYear = new Date().getFullYear();
    
    // Classer les années par type
    return years.map(year => ({
      year,
      type: year < currentYear ? 'history' : 
            year === currentYear ? 'current' : 'future'
    }));
  }, []);
  
  // Fermer le dropdown lorsqu'on clique à l'extérieur
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node) && 
        selectorRef.current && 
        !selectorRef.current.contains(event.target as Node)
      ) {
        setShowYearDropdown(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  // Détecter le défilement horizontal pour l'indicateur
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      if (container.scrollLeft > 0) {
        setIsScrollActive(true);
      } else {
        setIsScrollActive(false);
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, []);
  
  // Vérifier si on est sur mobile
  const isMobile = useMemo(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth <= 768;
    }
    return false;
  }, []);

  // Mise à jour de la largeur du conteneur et adaptation du scale
  useEffect(() => {
    const updateDimensions = () => {
      const container = heatmapContainerRef.current;
      if (!container) return;
      
      // Stocker la largeur du conteneur
      const width = container.clientWidth;
      setContainerWidth(width);
      
      // Ne pas utiliser de scaling automatique sur mobile
      if (window.innerWidth <= 768) {
        setScale(1);
      } else {
        // Sur desktop uniquement, calculer le facteur d'échelle
        const contentWidth = 800; // Largeur estimée du contenu
        if (width < contentWidth) {
          setScale(Math.max(0.7, width / contentWidth));
        } else {
          setScale(1);
        }
      }
    };
    
    updateDimensions();
    
    // Ajouter un délai pour s'assurer que les dimensions sont correctes après le rendu complet
    const timeoutId = setTimeout(updateDimensions, 100);
    
    window.addEventListener('resize', updateDimensions);
    return () => {
      window.removeEventListener('resize', updateDimensions);
      clearTimeout(timeoutId);
    };
  }, []);
  
  // Fonction pour déterminer la taille des cellules adaptée au type d'appareil
  const cellSize = useMemo(() => {
    if (isMobile) return 10; // Taille fixe sur mobile pour stabilité
    if (containerWidth < 400) return 8;
    if (containerWidth < 640) return 10;
    return 12;
  }, [containerWidth, isMobile]);
  
  // Effet pour forcer le scroll si on est sur mobile
  useEffect(() => {
    if (isMobile && containerRef.current) {
      // Ajouter un délai pour laisser le temps au navigateur de calculer les dimensions
      setTimeout(() => {
        if (containerRef.current) {
          // Forcer un petit scroll pour activer le défilement tactile sur iOS
          containerRef.current.scrollLeft = 1;
        }
      }, 200);
    }
  }, [isMobile]);

  // Palette de couleurs adaptée au mode clair/sombre
  const colorScale = useMemo(() => {
    return {
      light: {
        0: '#f3f4f6', // Gris très clair pour les jours sans activité
        1: '#dbeafe', // Bleu très clair
        2: '#bfdbfe', // Bleu clair
        3: '#93c5fd', // Bleu moyen
        4: '#60a5fa', // Bleu normal
        5: '#3b82f6', // Bleu vif
      },
      dark: {
        0: '#1f2937', // Fond sombre pour les jours sans activité
        1: '#1e3a8a', // Bleu sombre
        2: '#1d4ed8', // Bleu foncé
        3: '#2563eb', // Bleu moyen
        4: '#3b82f6', // Bleu standard
        5: '#60a5fa', // Bleu vif
      }
    };
  }, []);

  // Génération de la structure de données pour la heatmap
  const { daysGrid, monthLabels } = useMemo(() => {
    // Create a map for quick lookup of counts by date
    const countsMap: Record<string, number> = {};
    data.forEach(item => {
      countsMap[item.date] = item.count;
    });

    const startDate = startOfYear(new Date(selectedYear, 0, 1));
    const endDate = endOfYear(new Date(selectedYear, 11, 31));
    
    let currentDate = startDate;
    const days = [];
    const monthPositions: { month: number; position: number }[] = [];
    
    let weekIndex = 0;
    let dayIndex = getDay(startDate); // 0-6, where 0 is Sunday
    
    // First, let's add empty cells for days before the 1st of January
    for (let i = 0; i < dayIndex; i++) {
      days.push({ empty: true });
    }
    
    // Now add actual days
    while (currentDate <= endDate) {
      const formattedDate = format(currentDate, 'yyyy-MM-dd');
      // S'assurer que count est toujours un nombre (0 par défaut)
      const count = countsMap[formattedDate] || 0;
      
      // Record the start position of each month
      if (currentDate.getDate() === 1) {
        monthPositions.push({
          month: currentDate.getMonth(),
          position: days.length,
        });
      }
      
      days.push({
        date: formattedDate,
        count,
        dayOfWeek: dayIndex,
        weekIndex,
      });
      
      // Move to the next day
      currentDate = addDays(currentDate, 1);
      dayIndex = (dayIndex + 1) % 7;
      if (dayIndex === 0) {
        weekIndex++;
      }
    }
    
    // Generate month labels with their positions
    const monthLabels = monthPositions.map(pos => ({
      month: MONTHS[pos.month],
      position: Math.floor(pos.position / 7),
    }));
    
    // Organize days into a grid
    const daysGrid = [];
    for (let i = 0; i <= weekIndex; i++) {
      const week = days.filter((d) => !d.empty && d.weekIndex === i);
      daysGrid.push(week);
    }
    
    return { daysGrid, monthLabels };
  }, [data, selectedYear]);
  
  // Fonction qui détermine la couleur en fonction du nombre d'activités
  const getColorIntensity = (count: number) => {
    // S'assurer que count est toujours un nombre valide
    const safeCount = typeof count === 'number' ? count : 0;
    
    const thresholds = [0, 1, 2, 4, 6, 8]; // Seuils d'intensité
    const palette = isDarkMode ? colorScale.dark : colorScale.light;
    
    for (let i = thresholds.length - 1; i >= 0; i--) {
      if (safeCount >= thresholds[i]) {
        return palette[i as keyof typeof palette];
      }
    }
    return palette[0];
  };

  // Obtention de la date du jour pour la mettre en évidence
  const today = format(new Date(), 'yyyy-MM-dd');
  
  // Déterminer la taille des cellules en fonction de l'échelle et de la taille du conteneur
  const cellSize = useMemo(() => {
    // Sur mobile, utiliser une taille fixe pour permettre un défilement fluide
    if (window.innerWidth <= 768) return 10;
    // Sinon, adapter au conteneur
    if (containerWidth < 400) return 8;
    if (containerWidth < 640) return 10;
    return 12;
  }, [containerWidth]);

  // Handler pour le changement d'année
  const handleYearChange = (newYear: number) => {
    setSelectedYear(newYear);
    setShowYearDropdown(false);
    if (onYearChange) {
      onYearChange(newYear);
    }
  };

  // Handler pour incrémenter/décrémenter l'année
  const changeYear = (increment: number) => {
    const newYear = selectedYear + increment;
    // S'assurer que l'année existe dans notre liste
    if (availableYears.some(y => y.year === newYear)) {
      handleYearChange(newYear);
    }
  };

  // Gestionnaires pour le tooltip personnalisé
  const handleCellMouseEnter = (
    e: React.MouseEvent<HTMLDivElement>, 
    date: string, 
    count: number
  ) => {
    if (window.innerWidth <= 768) return; // Désactiver sur mobile
    
    const rect = e.currentTarget.getBoundingClientRect();
    const tooltipX = rect.left + rect.width / 2;
    const tooltipY = rect.top;
    
    // Format date for tooltip - Make it human-friendly
    const formattedDate = format(parseISO(date), 'EEEE d MMMM yyyy', { locale: fr });
    const tooltipText = `
      <div class="tooltip-date">${formattedDate}</div>
      <div><span class="tooltip-count">${count}</span> activité${count !== 1 ? 's' : ''}</div>
    `;
    
    setTooltipContent(tooltipText);
    setTooltipPosition({ x: tooltipX, y: tooltipY });
    setTooltipVisible(true);
  };
  
  const handleCellMouseLeave = () => {
    setTooltipVisible(false);
  };

  return (
    <div>
      {/* Year Selector Component - Sélecteur d'années amélioré */}
      <div className="year-selector-container">
        <button 
          ref={selectorRef}
          className="year-selector w-full"
          onClick={() => setShowYearDropdown(!showYearDropdown)}
        >
          <div className="year-display">
            <Calendar className="h-4 w-4" />
            <span>{selectedYear}</span>
            <ChevronDown className={`h-4 w-4 transition-transform ${showYearDropdown ? 'transform rotate-180' : ''}`} />
          </div>
          
          <div className="year-nav-buttons">
            <button 
              className="year-nav-button"
              onClick={(e) => {
                e.stopPropagation();
                changeYear(-1);
              }}
              disabled={!availableYears.some(y => y.year === selectedYear - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button 
              className="year-nav-button"
              onClick={(e) => {
                e.stopPropagation();
                changeYear(1);
              }}
              disabled={!availableYears.some(y => y.year === selectedYear + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </button>
        
        <div 
          ref={dropdownRef}
          className={`year-selector-dropdown ${showYearDropdown ? '' : 'hidden'}`}
        >
          {/* Grouper les années par type */}
          <div className="year-selector-section-title">Années récentes</div>
          {availableYears
            .filter(y => y.type === 'history' || y.type === 'current')
            .map(({ year, type }) => (
              <div 
                key={year} 
                className={`year-option ${type} ${year === selectedYear ? 'active' : ''}`}
                onClick={() => handleYearChange(year)}
              >
                {year} {year === new Date().getFullYear() ? '(actuel)' : ''}
              </div>
            ))
          }
          
          <div className="year-selector-section-title">Années futures</div>
          {availableYears
            .filter(y => y.type === 'future')
            .map(({ year }) => (
              <div 
                key={year} 
                className={`year-option future ${year === selectedYear ? 'active' : ''}`}
                onClick={() => handleYearChange(year)}
              >
                {year}
              </div>
            ))
          }
        </div>
      </div>

      {/* Tooltip personnalisé */}
      <div 
        ref={tooltipRef}
        className={`calendar-tooltip ${tooltipVisible ? 'visible' : ''}`}
        style={{
          left: `${tooltipPosition.x}px`,
          top: `${tooltipPosition.y}px`,
          display: tooltipVisible ? 'block' : 'none'
        }}
        dangerouslySetInnerHTML={{ __html: tooltipContent }}
      />

      {/* Heatmap Calendar Container avec défilement horizontal */}
      <div 
        className={`yearly-activity-heatmap-container ${isScrollActive ? 'scroll-active' : ''}`}
        ref={(el) => {
          containerRef.current = el;
          heatmapContainerRef.current = el; // Ajouter la double référence
        }}
        data-is-mobile={isMobile ? "true" : "false"} // Attribut pour cibler en CSS
      >
        <div 
          className="heatmap-responsive-wrapper"
          style={{ 
            transform: window.innerWidth > 768 ? `scale(${scale})` : 'none',
            transformOrigin: 'left top',
            width: window.innerWidth > 768 && scale !== 1 ? `${100 / scale}%` : 'auto'
          }}
        >
          <div className="min-w-max relative">
            {/* Month labels on top - Now using absolute positioning for better alignment */}
            <div className="month-labels">
              {monthLabels.map((label, idx) => (
                <div
                  key={`month-${idx}`}
                  className="month-label"
                  style={{
                    left: `${label.position * (cellSize + 2) + 24}px` // Ajuster en fonction de la taille des cellules
                  }}
                >
                  {label.month}
                </div>
              ))}
            </div>
            
            {/* Grid with improved styling */}
            <div className="yearly-heatmap-grid mt-6">
              {/* Day labels - Now with fixed width for better alignment */}
              <div className="flex flex-col justify-around mr-2 w-6">
                {DAYS.map((day, idx) => (
                  <div 
                    key={day} 
                    className="text-xs text-gray-500 dark:text-gray-400 flex items-center justify-center"
                    style={{ height: `${cellSize + 2}px` }}
                  >
                    {window.innerWidth > 500 ? day : day[0]}
                  </div>
                ))}
              </div>
              
              {/* Calendar grid - Now with consistent spacing */}
              <div className="grid grid-flow-col gap-1" style={{ gap: '2px' }}>
                {daysGrid.map((week, weekIdx) => (
                  <div key={`week-${weekIdx}`} className="heatmap-week grid gap-1" style={{ gap: '2px' }}>
                    {Array(7).fill(0).map((_, dayIdx) => {
                      const day = week.find(d => d.dayOfWeek === dayIdx);
                      if (!day) {
                        return <div key={`empty-${dayIdx}`} style={{ width: `${cellSize}px`, height: `${cellSize}px` }} />;
                      }
                      
                      const isToday = day.date === today;
                      const borderClass = isToday 
                        ? 'ring-2 ring-blue-500 dark:ring-blue-400 ring-offset-1 ring-offset-white dark:ring-offset-gray-900' 
                        : '';
                      
                      // Assurons-nous que count est toujours un nombre
                      const count = typeof day.count === 'number' ? day.count : 0;
                      const level = count === 0 ? 0 : count === 1 ? 1 : count < 3 ? 2 : count < 5 ? 3 : count < 7 ? 4 : 5;
                      
                      // Format date for tooltip - Make it human-friendly
                      const tooltipDate = day.date ? 
                        format(parseISO(day.date), 'EEEE d MMMM yyyy', { locale: fr }) : '';
                      const tooltipText = `${tooltipDate}: ${count} activité${count !== 1 ? 's' : ''}`;
                      
                      return (
                        <div
                          key={day.date || `empty-${dayIdx}`}
                          className={cn(
                            "heatmap-cell rounded-sm transition-colors",
                            `heatmap-cell-level-${level}`,
                            "transform hover:scale-110 cursor-pointer",
                            borderClass,
                            isToday ? "today" : ""
                          )}
                          style={{
                            backgroundColor: getColorIntensity(count),
                            width: `${cellSize}px`, 
                            height: `${cellSize}px`
                          }}
                          title={tooltipText}
                          aria-label={tooltipText}
                          onMouseEnter={(e) => handleCellMouseEnter(e, day.date, count)}
                          onMouseLeave={handleCellMouseLeave}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
            
            {/* Legend - Now with better spacing and alignment */}
            <div className="heatmap-legend text-xs">
              <span className="heatmap-legend-label">Moins</span>
              {[0, 1, 2, 3, 4, 5].map((level) => (
                <div
                  key={level}
                  className={cn(
                    "heatmap-legend-color mx-0.5",
                    `heatmap-cell-level-${level}`
                  )}
                  style={{ 
                    backgroundColor: isDarkMode ? colorScale.dark[level as keyof typeof colorScale.dark] : colorScale.light[level as keyof typeof colorScale.light],
                    width: `${cellSize - 2}px`, 
                    height: `${cellSize - 2}px`
                  }}
                />
              ))}
              <span className="heatmap-legend-label">Plus</span>
            </div>
          </div>
        </div>
        
        {/* Indicateur visuel de défilement pour mobile */}
        {isMobile && (
          <div className="mobile-scroll-indicator">
            <div className="scroll-dot"></div>
            <div className="scroll-dot"></div>
            <div className="scroll-dot"></div>
          </div>
        )}
      </div>
    </div>
  );
}
