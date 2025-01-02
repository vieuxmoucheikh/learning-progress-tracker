import React from 'react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';

interface YearlyActivityHeatmapProps {
  data: { date: string; count: number }[];
}

export function YearlyActivityHeatmap({ data }: { data: { date: string; count: number }[] }) {
  const getColorIntensity = (count: number) => {
    if (count === 0) return 'bg-gray-900/30';
    if (count === 1) return 'bg-green-700/90';
    if (count === 2) return 'bg-green-600/90';
    if (count === 3) return 'bg-green-500/90';
    if (count === 4) return 'bg-green-400/90';
    if (count >= 5) return 'bg-green-300/90';
    return 'bg-green-200/90';
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
    const currentDate = new Date('2025-01-02T23:06:24+01:00'); // Using provided time
    const year = currentDate.getFullYear();
    const startDate = new Date(year, 0, 1);
    startDate.setHours(0, 0, 0, 0);
    
    const daysInYear = 365 + (year % 4 === 0 ? 1 : 0);
    const allDates = [];
    
    for (let i = 0; i < daysInYear; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      const dayData = data.find(d => d.date === dateStr);
      
      if (dayData && dayData.count > 0) {
        console.log('Found activity for date:', dateStr, dayData);
      }
      
      allDates.push({
        date: dateStr,
        count: dayData?.count || 0,
        dayOfWeek: date.getDay()
      });
    }
    
    return allDates;
  };

  const calendarData = generateCalendarData();
  const hasActivities = calendarData.some(d => d.count > 0);
  console.log('Calendar data generated:', calendarData.filter(d => d.count > 0));
  console.log('Has activities:', hasActivities);

  return (
    <div className="border border-gray-800 rounded-lg p-4 bg-black/20 shadow-xl overflow-hidden">
      <div className="w-full">
        {/* Month labels */}
        <div className="flex mb-2">
          <div className="w-8" /> {/* Spacer for weekday labels */}
          <div className="flex-1 grid grid-cols-12 gap-0">
            {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((month) => (
              <div key={month} className="text-xs text-gray-400 font-medium">
                {month}
              </div>
            ))}
          </div>
        </div>

        {/* Activity grid */}
        <div className="flex flex-col gap-[2px]">
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, dayIndex) => (
            <div key={day} className="flex items-center gap-[2px] min-w-0">
              <div className="w-8 text-xs text-gray-400 font-medium">{day}</div>
              <div className="flex-1 flex gap-[2px] min-w-0">
                {calendarData
                  .filter(date => {
                    const dayOfWeek = new Date(date.date).getDay();
                    // Convert Sunday from 0 to 7 for proper display
                    const adjustedDayOfWeek = dayOfWeek === 0 ? 7 : dayOfWeek;
                    return adjustedDayOfWeek === dayIndex + 1;
                  })
                  .map((date) => (
                    <div
                      key={date.date}
                      className={`h-4 min-w-[1rem] flex-shrink-0 rounded-sm transition-colors duration-200 ${getColorIntensity(date.count)}`}
                      title={`${formatDate(date.date)}: ${date.count} activities`}
                    />
                  ))}
              </div>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-2 mt-4 text-xs text-gray-400">
          <span className="font-medium">Less</span>
          {[0, 1, 2, 3, 4, 5].map((count) => (
            <div
              key={count}
              className={`h-4 w-4 flex-shrink-0 rounded-sm ${getColorIntensity(count)}`}
              title={`${count} activities`}
            />
          ))}
          <span className="font-medium">More</span>
        </div>
      </div>
    </div>
  );
}
