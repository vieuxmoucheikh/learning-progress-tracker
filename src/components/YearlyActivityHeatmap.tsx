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
    const currentDate = new Date('2025-01-03T11:36:25+01:00');
    const startDate = new Date(currentDate.getFullYear(), 0, 1);
    startDate.setUTCHours(0, 0, 0, 0);
    
    // Pre-calculate all dates and their activities
    const daysInYear = 365 + (currentDate.getFullYear() % 4 === 0 ? 1 : 0);
    const allDates: DayData[] = [];
    
    for (let i = 0; i < daysInYear; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      const dayData = data.find(a => a.date === dateStr);
      
      if (dayData && dayData.count > 0) {
        console.log('Found activity in calendar for date:', {
          date: dateStr,
          count: dayData.count,
          data: dayData
        });
      }
      
      allDates.push({
        date: dateStr,
        count: dayData?.count || 0,
        dayOfWeek: date.getDay()
      });
    }

    const activeDates = allDates.filter(d => d.count > 0);
    console.log('Calendar data generated:', {
      total: activeDates.length,
      dates: activeDates.map(d => ({ date: d.date, count: d.count }))
    });
    return allDates;
  };

  const calendarData = generateCalendarData();
  const hasActivities = calendarData.some(d => d.count > 0);
  console.log('Heatmap has activities:', hasActivities);

  const getColorForCount = (count: number) => {
    if (count === 0) return 'bg-gray-100 dark:bg-gray-800';
    if (count === 1) return 'bg-emerald-200 hover:bg-emerald-300 dark:bg-emerald-800 dark:hover:bg-emerald-700';
    if (count <= 3) return 'bg-emerald-400 hover:bg-emerald-500 dark:bg-emerald-600 dark:hover:bg-emerald-500';
    return 'bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-400 dark:hover:bg-emerald-300';
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
    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-2">
      <span>Less</span>
      {[0, 1, 2, 4].map(count => (
        <div
          key={count}
          className={cn(
            'w-3 h-3 rounded-sm',
            getColorForCount(count)
          )}
        />
      ))}
      <span>More</span>
    </div>
  );

  return (
    <div className="w-full space-y-2">
      {renderLegend()}
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          <div className="relative">
            {/* Month labels */}
            <div className="flex mb-2 relative">
              <div className="w-8" /> {/* Offset for day labels */}
              <div className="flex flex-1">
                {monthLabels.map((label, i) => (
                  <div
                    key={i}
                    className="absolute text-xs text-gray-500"
                    style={{ left: `${label.index * 16 + 20}px` }}
                  >
                    {label.text}
                  </div>
                ))}
              </div>
            </div>

            {/* Main grid */}
            <div className="flex">
              {/* Day labels */}
              <div className="flex flex-col gap-1 pr-2">
                {DAYS.map((day, i) => (
                  <div key={day} className="h-3 text-xs text-gray-500 flex items-center">
                    {i % 2 === 0 ? day : ''}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="flex gap-1">
                {weeks.map((week, weekIndex) => (
                  <div key={weekIndex} className="flex flex-col gap-1">
                    {week.map((day) => {
                      const colorClass = getColorForCount(day.count);
                      const dateObj = new Date(day.date);
                      const formattedDate = format(dateObj, 'MMMM d, yyyy');
                      
                      return (
                        <TooltipProvider key={day.date}>
                          <Tooltip>
                            <TooltipTrigger>
                              <div
                                className={cn(
                                  'w-3 h-3 rounded-sm transition-colors duration-200',
                                  colorClass,
                                  day.count > 0 ? 'cursor-pointer transform hover:scale-125' : ''
                                )}
                              />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="font-medium">{formattedDate}</p>
                              <p className="text-sm">
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
  );
}
