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
    const fetchCategories = async () => {
      try {
        const items = await getLearningItems();
        console.log('Fetched items:', items);
        const uniqueCategories = [...new Set(items.map(item => item.category).filter(Boolean))] as string[];
        console.log('Unique categories:', uniqueCategories);
        setCategories(uniqueCategories);
        if (uniqueCategories.length > 0) {
          setSelectedCategory(uniqueCategories[0]);
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    const fetchActivity = async () => {
      if (!selectedCategory) return;
      setLoading(true);
      try {
        const data = await getYearlyActivity(selectedCategory);
        console.log('Activity data:', data);
        setActivityData(data);
      } catch (error) {
        console.error('Error fetching activity:', error);
      } finally {
        setLoading(false);
      }
    };

    if (selectedCategory) {
      fetchActivity();
    }
  }, [selectedCategory]);

  const getColorIntensity = (count: number) => {
    if (count === 0) return 'bg-gray-800 dark:bg-gray-800';
    if (count <= 2) return 'bg-emerald-800/90 dark:bg-emerald-800/90';
    if (count <= 4) return 'bg-emerald-600/90 dark:bg-emerald-600/90';
    if (count <= 6) return 'bg-emerald-500/90 dark:bg-emerald-500/90';
    return 'bg-emerald-400/90 dark:bg-emerald-400/90';
  };

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

  return (
    <div className="space-y-4 w-full">
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

      <div className="border border-gray-800 rounded-lg p-4 bg-black shadow-sm">
        <div className="min-w-[800px]">
          {/* Month labels */}
          <div className="flex mb-2">
            <div className="w-8" /> {/* Spacer for weekday labels */}
            <div className="flex-1 grid grid-cols-12 gap-1">
              {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((month) => (
                <div key={month} className="text-xs text-gray-400">
                  {month}
                </div>
              ))}
            </div>
          </div>

          {/* Activity grid */}
          <div className="flex flex-col gap-2">
            {['M', 'W', 'F'].map((day, dayIndex) => (
              <div key={day} className="flex items-center gap-2">
                <div className="w-8 text-xs text-gray-400">{day}</div>
                <div className="flex-1 flex gap-1">
                  {calendarData
                    .filter(date => {
                      const dayOfWeek = new Date(date.date).getDay();
                      // Map dayIndex (0,1,2) to actual days (1,3,5)
                      return dayOfWeek === (dayIndex * 2 + 1) % 7;
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
            {[0, 2, 4, 6, 8].map((count) => (
              <div
                key={count}
                className={`h-4 w-4 ${getColorIntensity(count)}`}
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
