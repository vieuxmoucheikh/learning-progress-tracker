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
    Object.keys(activityData).forEach(date => {
      const activityDate = parseISO(date);
      if (activityDate.getFullYear() === selectedYear) {
        const dateKey = format(activityDate, 'yyyy-MM-dd');
        activityMap[dateKey] = activityData[date];
      }
    });

    return activityMap;
  };

  const calendarData = generateCalendarData();

  // Calculate the start and end dates for the year
  const startDate = startOfYear(new Date(selectedYear, 0, 1));
  const endDate = endOfYear(startDate);

  // Calculate the start of the first week and end of the last week
  const firstWeekStart = startOfWeek(startDate, { weekStartsOn: 1 });
  const lastWeekEnd = endOfWeek(endDate, { weekStartsOn: 1 });

  // Generate all weeks including partial weeks from previous and next years
  const weeks = eachWeekOfInterval(
    { 
      start: firstWeekStart,
      end: lastWeekEnd 
    },
    { weekStartsOn: 1 }
  ).map(weekStart => {
    return DAYS.map((_, dayIndex) => {
      const date = addDays(weekStart, dayIndex);
      const formattedDate = format(date, 'yyyy-MM-dd');
      return {
        date: formattedDate,
        count: calendarData[formattedDate] || 0,
        isCurrentYear: getYear(date) === selectedYear
      };
    });
  });

  // Generate month labels
  const monthLabels = useMemo(() => {
    const labels: { text: string; index: number }[] = [];
    let currentMonth = -1;

    weeks.forEach((week, weekIndex) => {
      const firstDayOfWeek = parseISO(week[0].date);
      const month = getMonth(firstDayOfWeek);
      
      if (month !== currentMonth) {
        labels.push({
          text: format(firstDayOfWeek, 'MMM'),
          index: weekIndex
        });
        currentMonth = month;
      }
    });

    return labels;
  }, [weeks]);

  const getColorForCount = (count: number) => {
    if (count === 0) return 'bg-gray-100 dark:bg-gray-800';
    if (count === 1) return 'bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 dark:hover:bg-blue-800';
    if (count <= 3) return 'bg-blue-300 hover:bg-blue-400 dark:bg-blue-700 dark:hover:bg-blue-600';
    return 'bg-blue-500 hover:bg-blue-600 dark:bg-blue-500 dark:hover:bg-blue-400';
  };

  return (
    <div className="w-full bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
      {/* Year navigation */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSelectedYear(selectedYear - 1)}
          className="hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">{selectedYear}</div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSelectedYear(selectedYear + 1)}
          className="hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Heatmap grid */}
      <div className="w-full p-4">
        <div className="w-full" style={{ fontSize: 'min(1.5vw, 12px)' }}>
          {/* Month labels */}
          <div className="flex mb-2">
            <div className="w-6" /> {/* Offset for day labels */}
            <div className="flex-1">
              <div className="grid grid-cols-[repeat(53,1fr)] gap-[2px]">
                {monthLabels.map((label, i) => (
                  <div
                    key={i}
                    className="text-gray-400 dark:text-gray-500 text-center font-medium"
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

          {/* Main grid */}
          <div className="flex w-full">
            {/* Day labels */}
            <div className="flex flex-col gap-[2px] pr-2">
              {DAYS.map((day) => (
                <div 
                  key={day} 
                  className="text-gray-400 dark:text-gray-500 flex items-center w-6 font-medium"
                  style={{ 
                    height: 'min(1.5vw, 16px)',
                    maxHeight: '16px'
                  }}
                >
                  {day[0]}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="flex-1">
              <div className="grid grid-cols-[repeat(53,1fr)] gap-[2px]">
                {weeks.map((week, weekIndex) => (
                  <div key={weekIndex} className="flex flex-col gap-[2px]">
                    {week.map((day, dayIndex) => (
                      <TooltipProvider key={day.date}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              className={cn(
                                'rounded-sm transition-colors duration-200',
                                day.isCurrentYear
                                  ? getColorForCount(day.count)
                                  : 'bg-gray-50 dark:bg-gray-800'
                              )}
                              style={{ 
                                height: 'min(1.5vw, 16px)',
                                minHeight: '8px'
                              }}
                            />
                          </TooltipTrigger>
                          <TooltipContent 
                            side="top"
                            className="bg-gray-900 dark:bg-gray-800 text-white border-gray-800"
                          >
                            <div className="text-xs">
                              <div className="font-medium">{format(parseISO(day.date), 'MMM d, yyyy')}</div>
                              <div className="text-gray-300">{day.count} activities</div>
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
    </div>
  );
}
