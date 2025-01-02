import React, { useState, useEffect } from 'react';
import { getYearlyActivity, getLearningItems } from '@/lib/database';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ActivityData {
  id: string;
  user_id: string;
  category: string;
  date: string;
  count: number;
}

interface LearningItem {
  id: string;
  category: string;
  title: string;
}

interface DayData {
  date: string;
  count: number;
  dayOfWeek?: number;
}

export function YearlyActivityStats() {
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [activityData, setActivityData] = useState<ActivityData[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const items = await getLearningItems();
        const categories = Array.from(new Set(items.map(item => item.category || 'Uncategorized')));
        setCategories(categories);
        
        if (selectedCategory) {
          console.log('Fetching activities for category:', selectedCategory);
          const activities = await getYearlyActivity(selectedCategory);
          console.log('Received activities:', activities);
          setActivityData(activities);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedCategory]);

  const generateCalendarData = () => {
    const currentDate = new Date();
    const startDate = new Date(currentDate.getFullYear(), 0, 1);
    startDate.setHours(0, 0, 0, 0);
    
    // Pre-calculate all dates and their activities
    const daysInYear = 365 + (currentDate.getFullYear() % 4 === 0 ? 1 : 0);
    const allDates: DayData[] = [];
    
    for (let i = 0; i < daysInYear; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      const dayData = activityData.find(a => a.date === dateStr);
      
      allDates.push({
        date: dateStr,
        count: dayData?.count || 0,
        dayOfWeek: date.getDay()
      });
    }

    return allDates;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  const calendarData = generateCalendarData();
  const totalActivities = activityData.reduce((sum, day) => sum + day.count, 0);
  const daysWithActivity = activityData.filter(day => day.count > 0).length;
  const totalDays = activityData.length;
  const averagePerDay = totalActivities / totalDays;
  const streakPercentage = (daysWithActivity / totalDays) * 100;

  const getColorIntensity = (count: number) => {
    if (count === 0) return 'bg-gray-800 dark:bg-gray-800';
    if (count <= 1) return 'bg-emerald-900/90 dark:bg-emerald-900/90';
    if (count <= 2) return 'bg-emerald-800/90 dark:bg-emerald-800/90';
    if (count <= 3) return 'bg-emerald-700/90 dark:bg-emerald-700/90';
    if (count <= 4) return 'bg-emerald-600/90 dark:bg-emerald-600/90';
    if (count <= 5) return 'bg-emerald-500/90 dark:bg-emerald-500/90';
    return 'bg-emerald-400/90 dark:bg-emerald-400/90';
  };

  return (
    <div className="space-y-4 w-full">
      <div className="flex flex-col space-y-4">
        <div>
          <h2 className="text-lg font-semibold mb-1">Yearly Learning Activity</h2>
          <p className="text-sm text-gray-400">Track your learning progress throughout the year by category</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select a category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="text-sm text-gray-400 flex gap-4">
            <div>
              <span className="font-medium">{totalActivities}</span> activities
            </div>
            <div>
              <span className="font-medium">{averagePerDay.toFixed(1)}</span> per day
            </div>
            <div>
              <span className="font-medium">{streakPercentage.toFixed(0)}%</span> streak
            </div>
          </div>
        </div>
      </div>

      <div className="border border-gray-800 rounded-lg p-4 bg-black shadow-sm">
        <div className="w-full overflow-x-auto">
          {/* Month labels */}
          <div className="flex mb-2">
            <div className="w-8" /> {/* Spacer for weekday labels */}
            <div className="flex-1 grid grid-cols-12 gap-0">
              {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((month) => (
                <div key={month} className="text-xs text-gray-400">
                  {month}
                </div>
              ))}
            </div>
          </div>

          {/* Activity grid */}
          <div className="flex flex-col gap-[1px]">
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, dayIndex) => (
              <div key={day} className="flex items-center gap-[1px]">
                <div className="w-8 text-xs text-gray-400">{day}</div>
                <div className="flex-1 flex gap-[1px]">
                  {calendarData
                    .filter(date => {
                      const dayOfWeek = new Date(date.date).getDay();
                      return dayOfWeek === (dayIndex === 0 ? 1 : dayIndex === 6 ? 0 : dayIndex);
                    })
                    .map((date, i) => (
                      <div
                        key={date.date}
                        className={`h-4 w-4 ${getColorIntensity(date.count)}`}
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
                className={`h-4 w-4 ${getColorIntensity(count)}`}
                title={`${count} activities`}
              />
            ))}
            <span>More</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
};
