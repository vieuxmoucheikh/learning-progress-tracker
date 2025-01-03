import React, { useState } from 'react';
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
  endOfWeek
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

  // Calculate month labels with correct positioning
  const monthLabels = eachMonthOfInterval({ start: firstWeekStart, end: lastWeekEnd })
    .map((date, index, array) => {
      const weekIndex = differenceInWeeks(date, firstWeekStart);
      return {
        text: format(date, 'MMM'),
        index: weekIndex,
      };
    });

  // Calculate stats once
  const totalActivities = Object.values(calendarData).reduce((sum, count) => sum + count, 0);
  const activeDays = Object.values(calendarData).filter(count => count > 0).length;
  const averagePerDay = activeDays > 0 ? totalActivities / activeDays : 0;

  const getColorForCount = (count: number) => {
    if (count === 0) return 'bg-gray-50 border-gray-100';
    if (count === 1) return 'bg-emerald-200 hover:bg-emerald-300 border-emerald-300';
    if (count <= 3) return 'bg-emerald-400 hover:bg-emerald-500 border-emerald-500';
    return 'bg-emerald-600 hover:bg-emerald-700 border-emerald-700';
  };

  const renderLegend = () => (
    <div className="flex items-center gap-1 text-sm text-gray-600 justify-center sm:justify-start">
      <span className="text-[10px] sm:text-xs">Less</span>
      {[0, 1, 2, 4].map(count => (
        <div
          key={count}
          className={cn(
            'w-3 h-3 rounded-sm border',
            getColorForCount(count)
          )}
        />
      ))}
      <span className="text-[10px] sm:text-xs">More</span>
    </div>
  );

  return (
    <div className="w-full max-w-full space-y-4 overflow-hidden col-span-full">
      {/* Statistics section - only show once */}
      <div className="mt-4 flex flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <div className="text-sm font-medium text-gray-500">Total Activities:</div>
          <div className="text-sm font-semibold">{totalActivities}</div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-sm font-medium text-gray-500">Active Days:</div>
          <div className="text-sm font-semibold">{activeDays}</div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-sm font-medium text-gray-500">Average Per Day:</div>
          <div className="text-sm font-semibold">{averagePerDay}</div>
        </div>
      </div>

      <div className="w-full">
        {/* Year navigation */}
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleYearChange(selectedYear - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-lg font-semibold">{selectedYear}</div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleYearChange(selectedYear + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="relative w-full">
          <div className="w-full">
            {/* Month labels */}
            <div className="flex mb-2">
              <div className="w-8 sm:w-10" /> {/* Offset for day labels */}
              <div className="flex-1">
                <div className="grid grid-cols-[repeat(53,1fr)] gap-[1px] sm:gap-1.5">
                  {monthLabels.map((label, i) => (
                    <div
                      key={i}
                      className="text-[8px] sm:text-xs text-gray-500 text-center"
                      style={{ 
                        gridColumnStart: label.index + 1,
                        gridColumnEnd: i < monthLabels.length - 1 ? monthLabels[i + 1].index + 1 : 54
                      }}
                    >
                      {window.innerWidth <= 640 ? label.text.slice(0, 1) : label.text}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Main grid */}
            <div className="flex">
              {/* Day labels */}
              <div className="flex flex-col gap-[1px] sm:gap-1.5 pr-2 sm:pr-3">
                {DAYS.map((day) => (
                  <div 
                    key={day} 
                    className="h-[4px] sm:h-4 text-[8px] sm:text-xs text-gray-500 flex items-center w-8 sm:w-10"
                  >
                    {window.innerWidth <= 640 ? day[0] : day}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="flex-1 grid grid-cols-[repeat(53,1fr)] gap-[1px] sm:gap-1.5">
                {weeks.map((week, weekIndex) => (
                  <div key={weekIndex} className="flex flex-col gap-[1px] sm:gap-1.5">
                    {week.map((day, dayIndex) => (
                      <TooltipProvider key={day.date}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              className={cn(
                                'h-[4px] sm:h-4 rounded-[1px] sm:rounded',
                                day.isCurrentYear
                                  ? getColorForCount(day.count)
                                  : 'bg-gray-100'
                              )}
                            />
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            <div className="text-xs">
                              <div>{format(parseISO(day.date), 'MMM d, yyyy')}</div>
                              <div>{day.count} activities</div>
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
