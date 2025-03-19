import React, { useState, useMemo } from 'react';
import { cn } from '../lib/utils';
import { 
  format, 
  addDays, 
  getDay,
  startOfWeek,
  addWeeks,
  isWithinInterval,
  startOfYear,
  endOfYear,
  isBefore,
  parseISO,
  eachWeekOfInterval,
  eachMonthOfInterval,
  differenceInWeeks,
  getYear,
  endOfWeek,
  getMonth
} from 'date-fns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './ui/button';

interface DayData {
  date: string;
  count: number;
  isOutsideMonth?: boolean;
  isCurrentYear: boolean;
}

type WeekData = (DayData | null)[];

interface MonthLabel {
  text: string;
  index: number;
}

interface Activity {
  date: string;
  count: number;
}

interface YearlyActivityHeatmapProps {
  data: Record<string, number>;
  year?: number;
  onYearChange?: (year: number) => void;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function YearlyActivityHeatmap({ 
  data: activityData, 
  year = new Date().getFullYear(),
  onYearChange 
}: YearlyActivityHeatmapProps) {
  const [selectedYear, setSelectedYear] = useState(year);
  
  const handleYearChange = (newYear: number) => {
    setSelectedYear(newYear);
    onYearChange?.(newYear);
  };

  const generateCalendarData = () => {
    const yearStart = startOfYear(new Date(selectedYear, 0, 1));
    const yearEnd = endOfYear(yearStart);
    const activityMap: { [key: string]: number } = {};

    // Initialize all dates with 0
    let currentDay = yearStart;
    while (isBefore(currentDay, addDays(yearEnd, 1))) {
      const dateKey = format(currentDay, 'yyyy-MM-dd');
      activityMap[dateKey] = 0;
      currentDay = addDays(currentDay, 1);
    }

    // Fill in the activity data
    Object.entries(activityData).forEach(([dateStr, count]) => {
      // Handle timezone offset for consistent date display
      const date = new Date(dateStr);
      const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
      const dateKey = format(localDate, 'yyyy-MM-dd');
      
      if (getYear(localDate) === selectedYear) {
        activityMap[dateKey] = count;
        console.log('Added activity to heatmap:', { 
          originalDate: dateStr,
          localDate: dateKey,
          count 
        });
      }
    });

    return activityMap;
  };

  const calendarData = useMemo(() => generateCalendarData(), [selectedYear, activityData]);

  // Calculate the start and end dates for the year
  const startDate = startOfYear(new Date(selectedYear, 0, 1));
  const endDate = endOfYear(startDate);

  // Calculate the start of the first week and end of the last week
  const firstWeekStart = startOfWeek(startDate);
  const lastWeekEnd = endOfWeek(endDate);

  // Generate weeks
  const weeks = useMemo(() => {
    const weekStarts = eachWeekOfInterval(
      { 
        start: firstWeekStart,
        end: lastWeekEnd
      },
      { weekStartsOn: 0 }
    );

    return weekStarts.map(weekStart => {
      const days: DayData[] = Array(7).fill(null).map((_, index) => {
        const date = addDays(weekStart, index);
        const dateStr = format(date, 'yyyy-MM-dd');
        const count = calendarData[dateStr] || 0;
        
        console.log('Processing day:', { 
          date: dateStr, 
          count,
          isCurrentYear: getYear(date) === selectedYear,
          hasActivity: count > 0
        });
        
        return {
          date: dateStr,
          count,
          isCurrentYear: getYear(date) === selectedYear
        };
      });
      return days;
    });
  }, [selectedYear, calendarData, firstWeekStart, lastWeekEnd]);

  const monthLabels = useMemo(() => {
    const labels: MonthLabel[] = [];
    let currentMonth = -1;

    weeks.forEach((week, weekIndex) => {
      const firstDayOfWeek = parseISO(week[0].date);
      const month = getMonth(firstDayOfWeek);

      if (month !== currentMonth && getYear(firstDayOfWeek) === selectedYear) {
        labels.push({
          text: format(firstDayOfWeek, 'MMM'),
          index: weekIndex
        });
        currentMonth = month;
      }
    });

    return labels;
  }, [weeks, selectedYear]);

  // Améliorer la fonction getColorForCount pour des couleurs plus visibles
  const getColorForCount = (count: number) => {
    if (count === 0) return 'bg-gray-200 dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 hover:bg-gray-300 dark:hover:bg-gray-600';
    if (count === 1) return 'bg-emerald-400 hover:bg-emerald-500 dark:bg-emerald-400 dark:hover:bg-emerald-300 border-2 border-emerald-500 dark:border-emerald-500';
    if (count <= 3) return 'bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-500 dark:hover:bg-emerald-400 border-2 border-emerald-600 dark:border-emerald-600';
    return 'bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500 border-2 border-emerald-700 dark:border-emerald-700';
  };

  return (
    <div className="w-full bg-white dark:bg-gray-800/30 backdrop-blur-sm rounded-lg shadow-md border border-gray-200 dark:border-white/10">
      {/* Year navigation */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-white/10">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSelectedYear(selectedYear - 1)}
          className="hover:bg-white/50 dark:hover:bg-white/10 border-gray-200 dark:border-white/10"
        >
          <ChevronLeft className="h-4 w-4 text-blue-500" />
        </Button>
        <div className="text-lg font-semibold text-gray-900 dark:text-white">{selectedYear}</div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSelectedYear(selectedYear + 1)}
          className="hover:bg-white/50 dark:hover:bg-white/10 border-gray-200 dark:border-white/10"
        >
          <ChevronRight className="h-4 w-4 text-blue-500" />
        </Button>
      </div>

      {/* Heatmap grid - structure révisée */}
      <div className="w-full p-4">
        {/* Conteneur principal avec défilement horizontal */}
        <div className="overflow-x-auto pb-2">
          <div className="min-w-max">
            {/* Zone d'en-tête pour les mois */}
            <div className="flex mb-2">
              {/* En-tête fixe des jours */}
              <div className="sticky left-0 bg-white dark:bg-gray-800/30 w-8 z-10" />
              
              {/* En-tête des mois qui défile avec le calendrier */}
              <div className="flex-1">
                <div className="grid grid-cols-[repeat(53,minmax(14px,1fr))] gap-[3px]">
                  {monthLabels.map((label, i) => (
                    <div
                      key={i}
                      className="text-gray-800 dark:text-gray-200 text-center font-medium text-xs whitespace-nowrap"
                      style={{ 
                        gridColumnStart: label.index + 1,
                        gridColumnEnd: i < monthLabels.length - 1 ? monthLabels[i + 1].index + 1 : 54
                      }}
                    >
                      {label.text}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Grille principale */}
            <div className="flex">
              {/* Étiquettes des jours - fixes */}
              <div className="flex flex-col gap-[3px] pr-2 sticky left-0 bg-white dark:bg-gray-800/30 z-10">
                {DAYS.map((day) => (
                  <div 
                    key={day} 
                    className="text-gray-800 dark:text-gray-200 flex items-center w-8 font-medium text-xs px-1"
                    style={{ 
                      height: 'min(2vw, 16px)',
                      minHeight: '14px'
                    }}
                  >
                    {day[0]}
                  </div>
                ))}
              </div>

              {/* Grille du calendrier */}
              <div className="flex-1">
                <div className="grid grid-cols-[repeat(53,minmax(14px,1fr))] gap-[3px]">
                  {weeks.map((week, weekIndex) => (
                    <div key={weekIndex} className="flex flex-col gap-[3px]">
                      {week.map((day, dayIndex) => (
                        <TooltipProvider key={day.date}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div
                                className={cn(
                                  'rounded-sm transition-colors duration-200 cursor-pointer',
                                  day.isCurrentYear
                                    ? getColorForCount(day.count)
                                    : 'bg-gray-200 dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 opacity-50'
                                )}
                                style={{ 
                                  height: 'min(2vw, 16px)',
                                  minHeight: '14px',
                                  minWidth: '14px'
                                }}
                              />
                            </TooltipTrigger>
                            <TooltipContent 
                              side="top"
                              className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border border-gray-200 dark:border-white/10"
                            >
                              <div className="text-xs">
                                <div className="font-medium text-gray-900 dark:text-white">
                                  {format(parseISO(day.date), 'MMM d, yyyy')}
                                </div>
                                <div className="text-gray-700 dark:text-gray-300">
                                  {day.count} {day.count === 1 ? 'activity' : 'activities'}
                                </div>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Légende - position fixe */}
        <div className="flex items-center gap-2 mt-4 justify-end">
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Less</span>
          <div className="w-3 h-3 rounded-sm bg-gray-200 dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600" />
          <div className="w-3 h-3 rounded-sm bg-emerald-400 dark:bg-emerald-400 border-2 border-emerald-500 dark:border-emerald-500" />
          <div className="w-3 h-3 rounded-sm bg-emerald-500 dark:bg-emerald-500 border-2 border-emerald-600 dark:border-emerald-600" />
          <div className="w-3 h-3 rounded-sm bg-emerald-600 dark:bg-emerald-600 border-2 border-emerald-700 dark:border-emerald-700" />
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">More</span>
        </div>
      </div>
    </div>
  );
}
