import { useState, useEffect, useMemo } from 'react';
import { format, parseISO, getYear, startOfYear, subYears, addYears, eachMonthOfInterval, eachDayOfInterval } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Info } from 'lucide-react';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { cn } from '@/lib/utils';

// Typage amélioré pour les données d'activité
interface ActivityData {
  date: string;
  count: number;
}

interface YearlyActivityHeatmapProps {
  data: ActivityData[];
  year?: number;
  onYearChange?: (year: number) => void;
  compact?: boolean; // Option pour afficher une version compacte
}

// Fonction améliorée pour une meilleure détection du thème
const getThemeMode = (): 'light' | 'dark' => {
  if (typeof window === 'undefined') return 'light';
  
  // Vérifie d'abord l'attribut data-theme sur html
  const htmlTheme = document.documentElement.getAttribute('data-theme');
  if (htmlTheme === 'dark') return 'dark';
  if (htmlTheme === 'light') return 'light';
  
  // Puis vérifie la préférence du système
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

// Couleurs optimisées avec classes CSS pour une meilleure compatibilité
const getActivityColors = (isDarkMode: boolean) => {
  return isDarkMode 
    ? {
        0: 'bg-gray-800/90 dark-mode-color-0',
        1: 'bg-green-900/70 dark-mode-color-1',
        2: 'bg-green-800/80 dark-mode-color-2',
        3: 'bg-green-700/90 dark-mode-color-3',
        4: 'bg-green-600 dark-mode-color-4',
        5: 'bg-green-500 dark-mode-color-5',
      }
    : {
        0: 'bg-gray-100 light-mode-color-0',
        1: 'bg-green-100 light-mode-color-1',
        2: 'bg-green-200 light-mode-color-2',
        3: 'bg-green-300 light-mode-color-3', 
        4: 'bg-green-500 light-mode-color-4',
        5: 'bg-green-600 light-mode-color-5',
      };
};

export function YearlyActivityHeatmap({ 
  data: activityData, 
  year = new Date().getFullYear(),
  onYearChange,
  compact = false
}: YearlyActivityHeatmapProps) {
  const [currentYear, setCurrentYear] = useState(year);
  const [isClient, setIsClient] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // S'assurer que le rendu côté client est détecté et vérifier la taille de l'écran
  useEffect(() => {
    setIsClient(true);
    setIsDarkMode(getThemeMode() === 'dark');
    
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    // Initialiser
    handleResize();
    
    // Observer les changements de taille d'écran
    window.addEventListener('resize', handleResize);

    // Observer les changements de thème
    const observer = new MutationObserver(() => {
      setIsDarkMode(getThemeMode() === 'dark');
    });
    
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'class'],
    });

    return () => {
      window.removeEventListener('resize', handleResize);
      observer.disconnect();
    };
  }, []);

  // Gérer les changements d'année
  const handleYearChange = (direction: 'prev' | 'next') => {
    const newYear = direction === 'prev' ? currentYear - 1 : currentYear + 1;
    setCurrentYear(newYear);
    if (onYearChange) onYearChange(newYear);
  };

  // Génération améliorée des données du calendrier
  const calendarData = useMemo(() => {
    if (!isClient) return [];

    const startDate = startOfYear(new Date(currentYear, 0, 1));
    const months = eachMonthOfInterval({
      start: startDate,
      end: new Date(currentYear, 11, 31)
    });

    // Si compact est true, on ne garde que les 6 derniers mois pour les mobiles
    const filteredMonths = compact && isMobile 
      ? months.slice(months.length - 6) 
      : months;

    return filteredMonths.map(month => {
      const daysInMonth = eachDayOfInterval({
        start: new Date(month.getFullYear(), month.getMonth(), 1),
        end: new Date(month.getFullYear(), month.getMonth() + 1, 0)
      });

      return {
        month: format(month, 'MMM', { locale: fr }),
        days: daysInMonth.map(day => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const activity = activityData.find(a => a.date === dateStr);
          const isToday = format(new Date(), 'yyyy-MM-dd') === dateStr;
          
          // Amélioré: calcul du niveau d'activité pour couleurs plus visibles
          let activityLevel = 0;
          if (activity) {
            if (activity.count >= 10) activityLevel = 5;
            else if (activity.count >= 5) activityLevel = 4;
            else if (activity.count >= 3) activityLevel = 3;
            else if (activity.count >= 2) activityLevel = 2;
            else if (activity.count >= 1) activityLevel = 1;
          }

          return {
            date: dateStr,
            dayOfMonth: day.getDate(),
            dayOfWeek: day.getDay(),
            activityLevel,
            count: activity ? activity.count : 0,
            isToday
          };
        })
      };
    });
  }, [currentYear, activityData, isClient, compact, isMobile]);

  // Ne pas rendre côté serveur
  if (!isClient) return null;

  // Obtenir les couleurs adaptées au mode
  const activityColors = getActivityColors(isDarkMode);

  // Calcul de la taille des cellules en fonction du mode compact et de l'appareil
  const cellSize = compact 
    ? isMobile ? 8 : 10 // Plus petit en mode compact
    : isMobile ? 10 : 12; // Taille normale
    
  const cellGap = compact || isMobile ? 1 : 2;

  return (
    <div className="space-y-3 w-full yearly-heatmap-container">
      {/* Navigation d'année avec un design amélioré */}
      <div className="flex items-center justify-between mb-1">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => handleYearChange('prev')}
          className="h-7 px-2 text-xs"
        >
          <ChevronLeft className="h-3 w-3 mr-1" />
          {currentYear - 1}
        </Button>
        <h3 className="text-sm font-medium text-gray-900 dark:text-white">
          {currentYear}
        </h3>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => handleYearChange('next')} 
          disabled={currentYear >= new Date().getFullYear()}
          className="h-7 px-2 text-xs"
        >
          {currentYear + 1}
          <ChevronRight className="h-3 w-3 ml-1" />
        </Button>
      </div>

      {/* Grille de calendrier avec contraste amélioré et optimisation mobile */}
      <div className="relative overflow-x-auto heatmap-scroll-container pb-1">
        <div className={cn(
          "min-w-fit",
          compact && "heatmap-compact", 
          isMobile && "heatmap-mobile"
        )}>
          <div className="flex">
            <div className="w-6"></div> {/* Espace pour les mois */}
            <div className="flex flex-1 justify-around text-xs font-medium text-gray-600 dark:text-gray-300">
              <div>L</div>
              <div>M</div>
              <div>M</div>
              <div>J</div>
              <div>V</div>
              <div>S</div>
              <div>D</div>
            </div>
          </div>
          <div className="mt-1">
            {calendarData.map((monthData, monthIndex) => (
              <div key={monthIndex} className="flex mb-1">
                <div className="w-6 text-2xs font-medium text-gray-600 dark:text-gray-300 flex items-center justify-end pr-1">
                  {monthData.month}
                </div>
                <div className="flex-1">
                  <div 
                    className="grid gap-x-1" 
                    style={{ 
                      gridTemplateColumns: "repeat(7, minmax(auto, 1fr))",
                      gap: `${cellGap}px`
                    }}
                  >
                    {monthData.days.map((day, dayIndex) => {
                      // Positionnement correct des jours dans la grille par semaine
                      return (
                        <div
                          key={dayIndex}
                          className="relative"
                          style={{ 
                            gridColumnStart: dayIndex === 0 ? day.dayOfWeek + 1 : undefined,
                          }}
                        >
                          <TooltipProvider delayDuration={200}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div
                                  className={cn(
                                    "aspect-square rounded-sm yearly-heatmap-cell",
                                    day.isToday 
                                      ? "ring-1 ring-blue-400 dark:ring-blue-500" 
                                      : "",
                                    day.count > 0 
                                      ? activityColors[day.activityLevel as keyof typeof activityColors] 
                                      : activityColors[0],
                                    "cursor-pointer",
                                    "transition-all duration-200 hover:opacity-80 hover:scale-110",
                                  )}
                                  style={{
                                    width: `${cellSize}px`,
                                    height: `${cellSize}px`,
                                  }}
                                />
                              </TooltipTrigger>
                              <TooltipContent 
                                side="top"
                                className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border border-gray-100 dark:border-gray-700/80 shadow-lg"
                              >
                                <div className="text-xs">
                                  <div className="font-medium text-gray-900 dark:text-white">
                                    {format(parseISO(day.date), 'dd MMMM yyyy', { locale: fr })}
                                  </div>
                                  <div className="text-gray-700 dark:text-gray-300">
                                    {day.count} {day.count === 1 ? 'activité' : 'activités'}
                                  </div>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Légende avec meilleure visibilité - compact en mobile */}
      {!compact && (
        <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 pt-1 text-2xs border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-1.5">
            <div className={cn("w-3 h-3 rounded", activityColors[0])} />
            <span className="text-gray-600 dark:text-gray-300">Aucune</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className={cn("w-3 h-3 rounded", activityColors[1])} />
            <span className="text-gray-600 dark:text-gray-300">1</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className={cn("w-3 h-3 rounded", activityColors[3])} />
            <span className="text-gray-600 dark:text-gray-300">2-4</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className={cn("w-3 h-3 rounded", activityColors[5])} />
            <span className="text-gray-600 dark:text-gray-300">5+</span>
          </div>
        </div>
      )}
    </div>
  );
}
