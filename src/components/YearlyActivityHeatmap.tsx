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
  parseISO,
  eachDayOfInterval
} from 'date-fns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface DayData {
  date: string;
  count: number;
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
  data: Activity[];
  year?: number;
  onYearChange?: (year: number) => void;
}

const CURRENT_TIME = '2025-01-03T15:53:32+01:00';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function YearlyActivityHeatmap({ 
  data, 
  year = parseISO(CURRENT_TIME).getFullYear(),
  onYearChange 
}: YearlyActivityHeatmapProps) {
  const [selectedYear, setSelectedYear] = useState(year);

  const handleYearChange = (newYear: number) => {
    setSelectedYear(newYear);
    onYearChange?.(newYear);
  };

  // Generate calendar data with proper date handling
  const calendarData = useMemo(() => {
    const yearStart = startOfYear(new Date(selectedYear, 0, 1));
    const yearEnd = endOfYear(yearStart);
    const activityMap: { [key: string]: number } = {};

    // Process activities
    data.forEach(activity => {
      const activityDate = parseISO(activity.date);
      // Add timezone offset to match local time
      const localDate = new Date(activityDate.getTime() + activityDate.getTimezoneOffset() * 60000);
      if (isWithinInterval(localDate, { start: yearStart, end: yearEnd })) {
        const dateKey = format(localDate, 'yyyy-MM-dd');
        activityMap[dateKey] = (activityMap[dateKey] || 0) + activity.count;
      }
    });

    return activityMap;
  }, [selectedYear, data]);

  // Generate month labels
  const monthLabels = useMemo(() => {
    const labels: MonthLabel[] = [];
    const yearStart = startOfYear(new Date(selectedYear, 0, 1));
    let currentDate = yearStart;
    let currentWeek = 0;

    while (currentDate.getFullYear() === selectedYear) {
      if (currentDate.getDate() <= 7) {
        labels.push({
          text: format(currentDate, 'MMM'),
          index: currentWeek
        });
      }
      currentWeek += 1;
      currentDate = addWeeks(currentDate, 1);
    }

    return labels;
  }, [selectedYear]);

  // Generate weeks data
  const weeks = useMemo(() => {
    const weeks: WeekData[] = [];
    const yearStart = startOfYear(new Date(selectedYear, 0, 1));
    const yearEnd = endOfYear(yearStart);
    
    // Start from the first day of the first week of the year
    let currentDate = startOfWeek(yearStart, { weekStartsOn: 0 });
    
    while (currentDate <= yearEnd) {
      const week: WeekData = Array(7).fill(null);
      
      for (let i = 0; i < 7; i++) {
        const date = addDays(currentDate, i);
        const dateKey = format(date, 'yyyy-MM-dd');
        
        if (isWithinInterval(date, { start: yearStart, end: yearEnd })) {
          week[i] = {
            date: dateKey,
            count: calendarData[dateKey] || 0
          };
        }
      }
      
      weeks.push(week);
      currentDate = addWeeks(currentDate, 1);
    }
    
    return weeks;
  }, [selectedYear, calendarData]);

  // Calculate stats
  const stats = useMemo(() => {
    const totalActivities = Object.values(calendarData).reduce((sum, count) => sum + count, 0);
    const activeDays = Object.values(calendarData).filter(count => count > 0).length;
    const averagePerDay = activeDays > 0 ? totalActivities / activeDays : 0;
    
    return { totalActivities, activeDays, averagePerDay };
  }, [calendarData]);

  const { totalActivities, activeDays, averagePerDay } = stats;

  const getColorForCount = (count: number): string => {
    if (count === 0) return 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700';
    if (count <= 3) return 'bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-800';
    if (count <= 6) return 'bg-green-200 dark:bg-green-800/40 border-green-300 dark:border-green-700';
    if (count <= 9) return 'bg-green-300 dark:bg-green-700/50 border-green-400 dark:border-green-600';
    return 'bg-green-400 dark:bg-green-600/60 border-green-500 dark:border-green-500';
  };

  const renderLegend = () => (
    <div className="flex items-center gap-1 text-sm">
      <span className="text-gray-600 dark:text-gray-400 mr-2 text-xs">Less</span>
      {[0, 3, 6, 9, 12].map((count) => (
        <div
          key={count}
          className={cn(
            'w-3 h-3 rounded-sm border',
            getColorForCount(count)
          )}
        />
      ))}
      <span className="text-gray-600 dark:text-gray-400 ml-2 text-xs">More</span>
    </div>
  );

  return (
    <div className="w-full max-w-full space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
          <div className="text-blue-600 dark:text-blue-400 text-sm mb-1">Total Activities</div>
          <div className="text-2xl font-semibold">{totalActivities}</div>
        </div>
        <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
          <div className="text-purple-600 dark:text-purple-400 text-sm mb-1">Active Days</div>
          <div className="text-2xl font-semibold">{activeDays}</div>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
          <div className="text-green-600 dark:text-green-400 text-sm mb-1">Average Per Day</div>
          <div className="text-2xl font-semibold">{averagePerDay.toFixed(1)}</div>
        </div>
      </div>

      {/* Legend and Year Selector */}
      <div className="flex items-center justify-between">
        {renderLegend()}
        <div className="flex items-center gap-2 bg-white dark:bg-gray-800 rounded-md px-2 py-1 shadow-sm">
          <button
            onClick={() => handleYearChange(selectedYear - 1)}
            className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Previous year"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-medium min-w-[4rem] text-center">{selectedYear}</span>
          <button
            onClick={() => handleYearChange(selectedYear + 1)}
            className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Next year"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Calendar */}
      <div className="relative w-full overflow-x-auto">
        <div className="min-w-[750px]">
          {/* Month labels */}
          <div className="grid grid-cols-[auto_1fr] gap-2">
            <div className="w-8" /> {/* Offset for day labels */}
            <div className="grid grid-cols-[repeat(52,1fr)] relative">
              {monthLabels.map((label, i) => (
                <div
                  key={i}
                  className="absolute text-xs text-gray-500"
                  style={{ 
                    left: `${(label.index / 52) * 100}%`,
                    width: i < monthLabels.length - 1 
                      ? `${((monthLabels[i + 1].index - label.index) / 52) * 100}%` 
                      : `${((52 - label.index) / 52) * 100}%`
                  }}
                >
                  {label.text}
                </div>
              ))}
            </div>
          </div>

          {/* Main grid */}
          <div className="grid grid-cols-[auto_1fr] gap-2 mt-6">
            {/* Day labels */}
            <div className="flex flex-col gap-[3px]">
              {DAYS.map((day) => (
                <div 
                  key={day} 
                  className="h-[17px] text-xs text-gray-500 flex items-center"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-[repeat(52,1fr)] gap-[3px]">
              {weeks.map((week, weekIndex) => (
                <div key={weekIndex} className="flex flex-col gap-[3px]">
                  {week.map((day, dayIndex) => {
                    if (!day) {
                      return <div key={dayIndex} className="h-[17px]" />;
                    }
                    
                    const colorClass = getColorForCount(day.count);
                    const dateObj = parseISO(day.date);
                    const formattedDate = format(dateObj, 'MMMM d, yyyy');
                    
                    return (
                      <TooltipProvider key={dayIndex}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              className={cn(
                                'h-[17px] rounded-sm transition-colors duration-200',
                                'border',
                                colorClass,
                                day.count > 0 ? 'cursor-pointer hover:scale-110' : ''
                              )}
                            />
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-sm">
                            <p className="font-medium">{formattedDate}</p>
                            <p>
                              {day.count === 0
                                ? 'No activities'
                                : `${day.count} ${day.count === 1 ? 'activity' : 'activities'}`}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
