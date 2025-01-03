import React from 'react';
import { cn } from '../lib/utils';
import { format, startOfWeek, addWeeks, addDays } from 'date-fns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

interface DayData {
  date: string;
  count: number;
  dayOfWeek?: number;
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
    const currentDate = new Date('2025-01-03T12:02:16+01:00');
    const startDate = new Date(currentDate.getFullYear(), 0, 1);
    startDate.setUTCHours(0, 0, 0, 0);
    
    const daysInYear = 365 + (currentDate.getFullYear() % 4 === 0 ? 1 : 0);
    const allDates: DayData[] = [];
    
    for (let i = 0; i < daysInYear; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      const dayData = data.find(a => a.date === dateStr);
      
      allDates.push({
        date: dateStr,
        count: dayData?.count || 0,
        dayOfWeek: date.getDay()
      });
    }

    return allDates;
  };

  const calendarData = generateCalendarData();

  const getColorForCount = (count: number) => {
    if (count === 0) return 'bg-gray-50 border-gray-100';
    if (count === 1) return 'bg-emerald-200 hover:bg-emerald-300 border-emerald-300';
    if (count <= 3) return 'bg-emerald-400 hover:bg-emerald-500 border-emerald-500';
    return 'bg-emerald-600 hover:bg-emerald-700 border-emerald-700';
  };

  const weeks: DayData[][] = [];
  for (let i = 0; i < 53; i++) {
    const week = calendarData.slice(i * 7, (i + 1) * 7);
    if (week.length > 0) {
      weeks.push(week);
    }
  }

  const getMonthLabels = () => {
    const labels: MonthLabel[] = [];
    let currentMonth = -1;
    
    weeks.forEach((week, weekIndex) => {
      const firstDayOfWeek = new Date(week[0].date);
      const month = firstDayOfWeek.getMonth();
      
      if (month !== currentMonth) {
        labels.push({
          text: MONTHS[month],
          index: weekIndex
        });
        currentMonth = month;
      }
    });
    
    return labels;
  };

  const monthLabels = getMonthLabels();

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
        <div className="sm:overflow-x-visible -mx-2 sm:mx-0">
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
                          minWidth: window.innerWidth <= 640 ? '20px' : '52px',
                          textAlign: 'center'
                        }}
                      >
                        {window.innerWidth <= 640 ? label.text.slice(0, 3) : label.text}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Main grid */}
              <div className="flex w-full">
                {/* Day labels */}
                <div className="flex flex-col gap-[2px] sm:gap-1 pr-2 sm:pr-3">
                  {DAYS.map((day, i) => (
                    <div 
                      key={day} 
                      className="h-[6px] sm:h-3.5 text-[8px] sm:text-xs text-gray-500 flex items-center"
                    >
                      {i % 2 === 0 ? day.slice(0, 1) : ''}
                    </div>
                  ))}
                </div>

                {/* Calendar grid */}
                <div className="flex-1 grid grid-cols-[repeat(52,1fr)] gap-[2px] sm:gap-1">
                  {weeks.map((week, weekIndex) => (
                    <div key={weekIndex} className="flex flex-col gap-[2px] sm:gap-1">
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
                                    minHeight: window.innerWidth <= 640 ? '6px' : '16px'
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
