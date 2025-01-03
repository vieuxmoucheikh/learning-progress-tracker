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

interface Activity {
  date: string;
  count: number;
}

interface YearlyActivityHeatmapProps {
  data: Activity[];
  year?: number;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function YearlyActivityHeatmap({ data, year = new Date().getFullYear() }: YearlyActivityHeatmapProps) {
  console.log('YearlyActivityHeatmap received data:', data);
  
  const generateCalendarData = () => {
    const yearStart = new Date(year, 0, 1); // January 1st of the selected year
    const yearEnd = new Date(year, 11, 31); // December 31st of the selected year
    const activityMap: { [key: string]: number } = {};

    // Initialize all dates with 0
    let currentDay = yearStart;
    while (currentDay <= yearEnd) {
      const dateKey = format(currentDay, 'yyyy-MM-dd');
      activityMap[dateKey] = 0;
      currentDay = addDays(currentDay, 1);
    }

    // Fill in the activity data
    data.forEach(activity => {
      const activityDate = new Date(activity.date);
      if (activityDate.getFullYear() === year) {
        const dateKey = format(activityDate, 'yyyy-MM-dd');
        activityMap[dateKey] = activity.count;
      }
    });

    return activityMap;
  };

  const calendarData = generateCalendarData();
  const weeks: DayData[][] = [];
  
  // Find the first day of the year
  const firstDayOfYear = new Date(year, 0, 1);
  const lastDayOfYear = new Date(year, 11, 31);
  
  // Create weeks array
  let currentDate = firstDayOfYear;
  let currentWeek: DayData[] = Array(7).fill(null);
  
  // Fill in the calendar
  while (currentDate <= lastDayOfYear) {
    const weekDay = getDay(currentDate);
    
    // Start a new week if it's Sunday and we have data in the current week
    if (weekDay === 0 && currentWeek.some(day => day !== null)) {
      weeks.push([...currentWeek]);
      currentWeek = Array(7).fill(null);
    }
    
    currentWeek[weekDay] = {
      date: format(currentDate, 'yyyy-MM-dd'),
      count: calendarData[format(currentDate, 'yyyy-MM-dd')] || 0,
      isOutsideMonth: false
    };
    
    // Push the last week if we're at the end of the year
    if (isSameDay(currentDate, lastDayOfYear)) {
      weeks.push([...currentWeek]);
    }
    
    currentDate = addDays(currentDate, 1);
  }

  const getMonthLabels = () => {
    const labels: MonthLabel[] = [];
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
            'w-3 h-3 rounded-sm border',
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
                      {week.map((day, dayIndex) => {
                        if (!day) return <div key={dayIndex} className="aspect-square w-full" />;
                        
                        const colorClass = getColorForCount(day.count);
                        const dateObj = new Date(day.date);
                        const formattedDate = format(dateObj, 'MMMM d, yyyy');
                        
                        return (
                          <TooltipProvider key={dayIndex}>
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
