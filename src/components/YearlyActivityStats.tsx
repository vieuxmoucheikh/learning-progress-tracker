import React, { useState, useEffect } from 'react';
import { getYearlyActivity, getLearningItems } from '@/lib/database';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { YearlyActivityHeatmap } from './YearlyActivityHeatmap';

interface ActivityData {
  id: string;
  user_id: string;
  category: string;
  date: string;
  count: number;
  created_at: string;
  updated_at: string;
  dayOfWeek?: number;
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

const YearlyActivityStats = () => {
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [activityData, setActivityData] = useState<ActivityData[]>([]);
  const [loading, setLoading] = useState(true);

  // Function to fetch activities
  const fetchActivities = async (category: string) => {
    try {
      console.log('Fetching activities for category:', category);
      const activities = await getYearlyActivity(category);
      console.log('Received activities:', activities);
      setActivityData(activities);
    } catch (error) {
      console.error('Error fetching activities:', error);
    }
  };

  // Initial data fetch
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const items = await getLearningItems();
        const uniqueCategories = Array.from(new Set(items.map(item => item.category || 'Uncategorized')));
        console.log('Fetched categories:', uniqueCategories);
        setCategories(uniqueCategories);
        
        // Set the first category as default if we have categories and no category is selected
        if (uniqueCategories.length > 0 && !selectedCategory) {
          const defaultCategory = uniqueCategories[0];
          console.log('Setting default category:', defaultCategory);
          setSelectedCategory(defaultCategory);
          await fetchActivities(defaultCategory);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Fetch activities when category changes
  useEffect(() => {
    if (selectedCategory) {
      fetchActivities(selectedCategory);
    }
  }, [selectedCategory]);

  // Refresh activities periodically
  useEffect(() => {
    const refreshInterval = setInterval(() => {
      if (selectedCategory) {
        fetchActivities(selectedCategory);
      }
    }, 5000); // Refresh every 5 seconds

    return () => clearInterval(refreshInterval);
  }, [selectedCategory]);

  const handleCategoryChange = (newCategory: string) => {
    console.log('Category changed to:', newCategory);
    setSelectedCategory(newCategory);
  };

  const totalActivities = activityData.reduce((sum, day) => sum + (day.count || 0), 0);
  const activeDays = activityData.filter(day => day.count > 0).length;
  const averagePerDay = activeDays > 0 ? (totalActivities / activeDays).toFixed(1) : '0';

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
      const count = dayData?.count ?? 0;
      
      if (count > 0) {
        console.log('Found activity for date:', dateStr, { count, dayData });
      }
      
      allDates.push({
        date: dateStr,
        count,
        dayOfWeek: date.getDay()
      });
    }

    return allDates;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Activity Stats</h2>
        <p className="text-sm text-gray-500">Track your learning progress over time</p>
      </div>

      <div className="flex flex-col gap-4">
        <Select
          value={selectedCategory}
          onValueChange={handleCategoryChange}
        >
          <SelectTrigger className="w-full md:w-[200px]">
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

        {loading ? (
          <div className="flex justify-center items-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : activityData.length > 0 ? (
          <div className="space-y-6">
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              <div className="bg-blue-500/10 rounded-lg p-4">
                <h3 className="text-sm font-medium text-blue-600 dark:text-blue-400">Total Activities</h3>
                <p className="text-2xl font-bold mt-1">{totalActivities}</p>
              </div>
              <div className="bg-purple-500/10 rounded-lg p-4">
                <h3 className="text-sm font-medium text-purple-600 dark:text-purple-400">Active Days</h3>
                <p className="text-2xl font-bold mt-1">{activeDays}</p>
              </div>
              <div className="bg-green-500/10 rounded-lg p-4">
                <h3 className="text-sm font-medium text-green-600 dark:text-green-400">Average Per Day</h3>
                <p className="text-2xl font-bold mt-1">{averagePerDay}</p>
              </div>
            </div>
            <div className="relative">
              <YearlyActivityHeatmap data={generateCalendarData()} />
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <p>No activity data available for this category.</p>
            <p className="text-sm mt-2">Start learning to see your progress!</p>
          </div>
        )}
      </div>
    </div>
  );
};

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

export default YearlyActivityStats;
