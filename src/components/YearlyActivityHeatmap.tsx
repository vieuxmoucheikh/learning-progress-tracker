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
        0: 'bg-gray-800 dark-mode-color-0',
        1: 'bg-green-900/60 dark-mode-color-1',
        2: 'bg-green-700/80 dark-mode-color-2',
        3: 'bg-green-600 dark-mode-color-3',
        4: 'bg-green-500 dark-mode-color-4',
        5: 'bg-green-400 dark-mode-color-5',
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
  onYearChange 
}: YearlyActivityHeatmapProps) {
  const [currentYear, setCurrentYear] = useState(year);
  const [isClient, setIsClient] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // S'assurer que le rendu côté client est détecté
  useEffect(() => {
    setIsClient(true);
    setIsDarkMode(getThemeMode() === 'dark');

    // Observer les changements de thème
    const observer = new MutationObserver(() => {
      setIsDarkMode(getThemeMode() === 'dark');
    });
    
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'class'],
    });

    return () => observer.disconnect();
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

    return months.map(month => {
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
  }, [currentYear, activityData, isClient]);

  // Ne pas rendre côté serveur
  if (!isClient) return null;

  // Obtenir les couleurs adaptées au mode
  const activityColors = getActivityColors(isDarkMode);

  return (
    <div className="space-y-4 w-full overflow-hidden">
      {/* Navigation d'année avec un design amélioré */}
      <div className="flex items-center justify-between mb-2">
        <Button variant="outline" size="sm" onClick={() => handleYearChange('prev')}>
          <ChevronLeft className="h-4 w-4 mr-1" />
          {currentYear - 1}
        </Button>
        <h3 className="text-base font-medium text-gray-900 dark:text-white">
          {currentYear}
        </h3>
        <Button variant="outline" size="sm" onClick={() => handleYearChange('next')} 
          disabled={currentYear >= new Date().getFullYear()}>
          {currentYear + 1}
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>

      {/* Grille de calendrier avec contraste amélioré et optimisation mobile */}
      <div className="relative overflow-x-auto pb-2">
        <div className="min-w-[640px]">
          <div className="flex">
            <div className="w-8"></div> {/* Espace pour les mois */}
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
              <div key={monthIndex} className="flex mb-2">
                <div className="w-8 text-xs font-medium text-gray-600 dark:text-gray-300 flex items-center justify-end pr-2">
                  {monthData.month}
                </div>
                <div className="flex-1">
                  <div className="grid grid-cols-7 gap-1">
                    {monthData.days.map((day, dayIndex) => {
                      // Positionnement correct des jours dans la grille par semaine
                      const offset = dayIndex === 0 ? day.dayOfWeek : 0;
                      return (
                        <div
                          key={dayIndex}
                          className="relative"
                          style={{ gridColumnStart: dayIndex === 0 ? day.dayOfWeek + 1 : undefined }}
                        >
                          <TooltipProvider delayDuration={200}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div
                                  className={cn(
                                    "w-full aspect-square rounded-sm yearly-heatmap-cell",
                                    day.isToday 
                                      ? "ring-2 ring-blue-400 dark:ring-blue-500" 
                                      : "",
                                    day.count > 0 
                                      ? activityColors[day.activityLevel as keyof typeof activityColors] 
                                      : activityColors[0],
                                    "hover:opacity-80 transition-opacity",
                                    "cursor-pointer",
                                  )}
                                  style={{
                                    minWidth: '14px',
                                    minHeight: '14px'
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

      {/* Légende avec meilleure visibilité */}
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 pt-2 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <div className={cn("w-4 h-4 rounded shadow-inner border border-gray-200 dark:border-gray-700", activityColors[0])} />
          <span className="text-xs text-gray-600 dark:text-gray-300">Aucune activité</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={cn("w-4 h-4 rounded shadow-inner border border-gray-200 dark:border-gray-700", activityColors[1])} />
          <span className="text-xs text-gray-600 dark:text-gray-300">1 activité</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={cn("w-4 h-4 rounded shadow-inner border border-gray-200 dark:border-gray-700", activityColors[3])} />
          <span className="text-xs text-gray-600 dark:text-gray-300">2-4 activités</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={cn("w-4 h-4 rounded shadow-inner border border-gray-200 dark:border-gray-700", activityColors[5])} />
          <span className="text-xs text-gray-600 dark:text-gray-300">5+ activités</span>
        </div>
      </div>
    </div>
  );
}
