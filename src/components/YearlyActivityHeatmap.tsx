import React from 'react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';

interface YearlyActivityHeatmapProps {
  data: { date: string; count: number }[];
}

export function YearlyActivityHeatmap({ data }: YearlyActivityHeatmapProps) {
  const getColorIntensity = (count: number) => {
    if (count === 0) return 'bg-gray-800 dark:bg-gray-800';
    if (count <= 1) return 'bg-blue-900/90 dark:bg-blue-900/90';
    if (count <= 2) return 'bg-blue-800/90 dark:bg-blue-800/90';
    if (count <= 3) return 'bg-blue-700/90 dark:bg-blue-700/90';
    if (count <= 4) return 'bg-blue-600/90 dark:bg-blue-600/90';
    if (count <= 5) return 'bg-blue-500/90 dark:bg-blue-500/90';
    return 'bg-blue-400/90 dark:bg-blue-400/90';
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Generate calendar grid data
  const generateCalendarData = () => {
    // Get the year from the first activity date or use current year
    const year = data[0]?.date ? new Date(data[0].date).getFullYear() : new Date().getFullYear();
    const startDate = new Date(year, 0, 1);
    startDate.setHours(0, 0, 0, 0);
    
    const daysInYear = 365 + (startDate.getFullYear() % 4 === 0 ? 1 : 0);
    const allDates = [];
    
    for (let i = 0; i < daysInYear; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      const dayData = data.find(d => d.date === dateStr);
      
      allDates.push({
        date: dateStr,
        count: dayData?.count || 0,
        dayOfWeek: date.getDay()
      });
    }
    
    return allDates;
  };

  const calendarData = generateCalendarData();

  return (
    <div className="border border-gray-800 rounded-lg p-4 bg-black/50 shadow-sm overflow-hidden">
      <div className="w-full">
        {/* Month labels */}
        <div className="flex mb-2">
          <div className="w-8" /> {/* Spacer for weekday labels */}
          <div className="flex-1 grid grid-cols-12 gap-0">
            {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((month) => (
              <div key={month} className="text-xs text-gray-400 whitespace-nowrap">
                {month}
              </div>
            ))}
          </div>
        </div>

        {/* Activity grid */}
        <div className="flex flex-col gap-[1px]">
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, dayIndex) => (
            <div key={day} className="flex items-center gap-[1px] min-w-0">
              <div className="w-8 text-xs text-gray-400">{day}</div>
              <div className="flex-1 flex gap-[1px] min-w-0">
                {calendarData
                  .filter(date => {
                    const dayOfWeek = new Date(date.date).getDay();
                    return dayOfWeek === (dayIndex === 0 ? 1 : dayIndex === 6 ? 0 : dayIndex);
                  })
                  .map((date) => (
                    <div
                      key={date.date}
                      className={`h-4 min-w-[1rem] flex-shrink-0 ${getColorIntensity(date.count)}`}
                      title={`${formatDate(date.date)}: ${date.count} activities`}
                    />
                  ))}
              </div>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-1 mt-4 text-xs text-gray-400">
          <span>Less</span>
          {[0, 1, 2, 3, 4, 5, 6].map((count) => (
            <div
              key={count}
              className={`h-4 w-4 flex-shrink-0 ${getColorIntensity(count)}`}
              title={`${count} activities`}
            />
          ))}
          <span>More</span>
        </div>
      </div>
    </div>
  );
}
