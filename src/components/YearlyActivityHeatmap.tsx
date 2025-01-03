import React from 'react';
import { cn } from '../lib/utils';
import { 
  format, 
  startOfWeek, 
  addWeeks, 
  addDays, 
  startOfYear, 
  endOfYear, 
  isSameYear, 
  getDay, 
  getMonth, 
  isSameDay, 
  subDays 
} from 'date-fns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

interface DayData {
  date: string;
  count: number;
  isOutsideMonth?: boolean;
}

interface MonthLabel {
  text: string;
  index: number;
}

interface YearlyActivityHeatmapProps {
  data: DayData[];
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function YearlyActivityHeatmap({ data }: YearlyActivityHeatmapProps) {
  console.log('YearlyActivityHeatmap received data:', data);
  
  const generateCalendarData = () => {
    const currentDate = new Date('2025-01-03T12:27:59+01:00');
    const yearStart = startOfYear(currentDate);
    const yearEnd = endOfYear(currentDate);
    const data: { [key: string]: number } = {};

    let currentDay = yearStart;
    while (isSameYear(currentDay, yearStart)) {
      const dateKey = format(currentDay, 'yyyy-MM-dd');
      data[dateKey] = 0;
      currentDay = addDays(currentDay, 1);
    }

    return data;
  };

  const calendarData = generateCalendarData();

  const weeks: DayData[][] = [];
  
  // Find the first day of the first week of 2025
  const firstDayOfYear = new Date('2025-01-01');
  const yearEnd = endOfYear(firstDayOfYear);
  const dayOfWeek = getDay(firstDayOfYear); // 0 for Sunday, 1 for Monday, etc.
  
  // Create weeks array
  let currentDate = firstDayOfYear;
  let currentWeek: DayData[] = Array(7).fill(null);
  
  // Fill in any days before January 1st with null
  for (let i = 0; i < dayOfWeek; i++) {
    currentWeek[i] = {
      date: format(subDays(firstDayOfYear, dayOfWeek - i), 'yyyy-MM-dd'),
      count: 0,
      isOutsideMonth: true
    };
  }
  
  // Fill in the rest of the year
  while (isSameYear(currentDate, firstDayOfYear)) {
    const weekDay = getDay(currentDate);
    if (weekDay === 0 && currentWeek.some(day => day !== null)) {
      weeks.push(currentWeek);
      currentWeek = Array(7).fill(null);
    }
    
    currentWeek[weekDay] = {
      date: format(currentDate, 'yyyy-MM-dd'),
      count: calendarData[format(currentDate, 'yyyy-MM-dd')] || 0,
      isOutsideMonth: false
    };
    
    if (isSameDay(currentDate, yearEnd)) {
      // Fill in any remaining days in the last week
      for (let i = weekDay + 1; i < 7; i++) {
        currentWeek[i] = {
          date: format(addDays(currentDate, i - weekDay), 'yyyy-MM-dd'),
          count: 0,
          isOutsideMonth: true
        };
      }
      weeks.push(currentWeek);
    }
    
    currentDate = addDays(currentDate, 1);
  }

  const getMonthLabels = () => {
    const labels: MonthLabel[] = [];
    let currentDate = firstDayOfYear;
    let currentMonth = -1;

    weeks.forEach((week, weekIndex) => {
      week.forEach((day) => {
        if (!day || day.isOutsideMonth) return;
        const date = new Date(day.date);
        const month = getMonth(date);
        if (month !== currentMonth) {
          labels.push({
            text: format(date, 'MMMM'),
            index: weekIndex
          });
          currentMonth = month;
        }
      });
    });

    return labels;
  };

  const monthLabels = getMonthLabels();

  const getColorForCount = (count: number) => {
    if (count === 0) return 'bg-gray-50 border-gray-100';
    if (count === 1) return 'bg-emerald-200 hover:bg-emerald-300 border-emerald-300';
    if (count <= 3) return 'bg-emerald-400 hover:bg-emerald-500 border-emerald-500';
    return 'bg-emerald-600 hover:bg-emerald-700 border-emerald-700';
  };

  const renderLegend = () => (
    <div className="flex items-center gap-1 text-sm text-gray-600 mb-4 justify-center sm:justify-start">
      <span className="text-[10px] sm:text-xs">Less</span>
      {[0, 1, 2, 4].map(count => (
        <div
          key={count}
          className={cn(
            'w-1.5 h-1.5 sm:w-3 sm:h-3 rounded-sm',
            getColorForCount(count)
          )}
        />
      ))}
      <span className="text-[10px] sm:text-xs">More</span>
    </div>
  );

  return (
    <div className="w-full max-w-full space-y-4 overflow-hidden">
      {renderLegend()}
      <div className="relative w-full">
        <div className="w-full">
          <div className="w-full">
            <div className="relative max-w-full">
              {/* Month labels */}
              <div className="flex mb-6 sm:mb-8 relative">
                <div className="w-4 sm:w-6" /> {/* Offset for day labels */}
                <div className="flex-1 relative">
                  <div className="flex absolute left-0 right-0">
                    {monthLabels.map((label, i) => (
                      <div
                        key={i}
                        className="flex-1 text-[8px] sm:text-xs text-gray-500"
                        style={{ 
                          minWidth: window.innerWidth <= 640 ? '16px' : '56px',
                          textAlign: 'center'
                        }}
                      >
                        {window.innerWidth <= 640 ? label.text.slice(0, 1) : label.text}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Main grid */}
              <div className="flex w-full">
                {/* Day labels */}
                <div className="flex flex-col gap-[1px] sm:gap-1.5 pr-1 sm:pr-3">
                  {DAYS.map((day, i) => (
                    <div 
                      key={day} 
                      className="h-[4px] sm:h-4 text-[8px] sm:text-xs text-gray-500 flex items-center"
                    >
                      {i % 2 === 0 ? day.slice(0, 1) : ''}
                    </div>
                  ))}
                </div>

                {/* Calendar grid */}
                <div className="flex-1 grid grid-cols-[repeat(52,1fr)] gap-[1px] sm:gap-1.5">
                  {weeks.map((week, weekIndex) => (
                    <div key={weekIndex} className="flex flex-col gap-[1px] sm:gap-1.5">
                      {week.map((day) => {
                        const colorClass = getColorForCount(day.count);
                        const dateObj = new Date(day.date);
                        const formattedDate = format(dateObj, 'MMMM d, yyyy');
                        
                        return (
                          <TooltipProvider key={day.date}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div
                                  className={cn(
                                    'aspect-square w-full rounded-[1px] sm:rounded-sm transition-colors duration-200',
                                    'border',
                                    colorClass,
                                    day.count > 0 ? 'cursor-pointer transform hover:scale-110' : ''
                                  )}
                                  style={{
                                    minHeight: window.innerWidth <= 640 ? '4px' : '17px'
                                  }}
                                />
                              </TooltipTrigger>
                              <TooltipContent side="top" className="text-[10px] sm:text-sm">
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
      </div>
    </div>
  );
}
