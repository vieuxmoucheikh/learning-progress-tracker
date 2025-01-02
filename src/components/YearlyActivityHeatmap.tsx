import React from 'react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';

interface DayData {
  date: string;
  count: number;
  dayOfWeek?: number;
}

interface YearlyActivityHeatmapProps {
  data: DayData[];
}

export function YearlyActivityHeatmap({ data }: YearlyActivityHeatmapProps) {
  const generateCalendarData = () => {
    const currentDate = new Date('2025-01-02T23:38:16+01:00');
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
        console.log('Found activity in calendar for date:', dateStr, dayData);
      }
      
      allDates.push({
        date: dateStr,
        count: dayData?.count || 0,
        dayOfWeek: date.getDay()
      });
    }

    const activeDates = allDates.filter(d => d.count > 0);
    console.log('Calendar data generated with activities:', activeDates);
    return allDates;
  };

  const calendarData = generateCalendarData();
  const hasActivities = calendarData.some(d => d.count > 0);
  console.log('Has activities:', hasActivities);

  const getColorForCount = (count: number) => {
    if (count === 0) return 'bg-gray-100 dark:bg-gray-800';
    if (count === 1) return 'bg-green-200 dark:bg-green-900';
    if (count <= 3) return 'bg-green-400 dark:bg-green-700';
    return 'bg-green-600 dark:bg-gray-500';
  };

  const weeks = [];
  for (let i = 0; i < 53; i++) {
    const week = calendarData.slice(i * 7, (i + 1) * 7);
    if (week.length > 0) {
      weeks.push(week);
    }
  }

  return (
    <div className="w-full overflow-x-auto">
      <div className="inline-block min-w-full">
        <div className="flex gap-1">
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="flex flex-col gap-1">
              {week.map((day) => {
                const colorClass = getColorForCount(day.count);
                const dateObj = new Date(day.date);
                const formattedDate = dateObj.toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric'
                });
                
                return (
                  <div
                    key={day.date}
                    className={`w-3 h-3 rounded-sm ${colorClass} transition-colors duration-200`}
                    title={`${formattedDate}: ${day.count} activities`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
