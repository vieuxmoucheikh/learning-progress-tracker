import React, { useMemo, useEffect, useState } from 'react';
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

// Générer les années disponibles (5 ans en arrière et 2 ans en avant)
const generateAvailableYears = (): number[] => {
  const currentYear = new Date().getFullYear();
  return Array.from({ length: 8 }, (_, i) => currentYear - 5 + i);
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
  const availableYears = useMemo(generateAvailableYears, []);
  
  // Mise à jour de la largeur du conteneur et adaptation du scale
  useEffect(() => {
    const updateDimensions = () => {
      const container = document.querySelector('.yearly-activity-heatmap-container');
      if (container) {
        const width = container.clientWidth;
        setContainerWidth(width);
        
        // Calculer le facteur d'échelle si nécessaire
        const contentWidth = 800; // Largeur estimée du contenu complet
        if (width < contentWidth) {
          // Ajuster l'échelle pour que tout s'affiche
          setScale(Math.max(0.7, width / contentWidth));
        } else {
          setScale(1);
        }
      }
    };
    
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

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
  // Utiliser une valeur de comptage avec traitement explicite pour éviter des undefined
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
    if (availableYears.includes(newYear)) {
      handleYearChange(newYear);
    }
  };

  return (
    <div>
      {/* Year Selector Component - Sélecteur d'années amélioré */}
      <div className="year-selector-container">
        <button 
          className="year-selector w-full"
          onClick={() => setShowYearDropdown(!showYearDropdown)}
        >
          <Calendar className="h-4 w-4" />
          <span>{selectedYear}</span>
          <ChevronDown className={`h-4 w-4 transition-transform ${showYearDropdown ? 'transform rotate-180' : ''}`} />
          
          <div className="flex ml-auto">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                changeYear(-1);
              }}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
              disabled={!availableYears.includes(selectedYear - 1)}
            >
              <ChevronLeft className="h-3 w-3" />
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                changeYear(1);
              }}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
              disabled={!availableYears.includes(selectedYear + 1)}
            >
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        </button>
        
        <div className={`year-selector-dropdown ${showYearDropdown ? '' : 'hidden'}`}>
          {availableYears.map(year => (
            <div 
              key={year} 
              className={`year-option ${year === selectedYear ? 'active' : ''}`}
              onClick={() => handleYearChange(year)}
            >
              {year}
            </div>
          ))}
        </div>
      </div>

      {/* Heatmap Calendar Container */}
      <div className="yearly-activity-heatmap-container">
        <div 
          className="heatmap-responsive-wrapper"
          style={{ 
            transform: `scale(${scale})`, 
            transformOrigin: 'left top',
            width: scale === 1 ? '100%' : `${100 / scale}%`
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
                            borderClass
                          )}
                          style={{
                            backgroundColor: getColorIntensity(count),
                            width: `${cellSize}px`, 
                            height: `${cellSize}px`
                          }}
                          title={tooltipText}
                          aria-label={tooltipText}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
            
            {/* Legend - Now with better spacing and alignment */}
            <div className="heatmap-legend text-xs">
              <span className="text-gray-600 dark:text-gray-400 mr-2">Moins</span>
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
              <span className="text-gray-600 dark:text-gray-400 ml-2">Plus</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
