import React, { useState, useEffect, useMemo } from 'react';
import { getYearlyActivity, getLearningItems } from '@/lib/database';
import { getLearningActivity } from '@/lib/learningActivity';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { YearlyActivityHeatmap } from './YearlyActivityHeatmap';
import { Activity, Calendar, BarChart2 } from 'lucide-react';
import { cn } from '@/lib/utils';

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

export const YearlyActivityStats: React.FC = () => {
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [activityData, setActivityData] = useState<ActivityData[]>([]);
  const [loading, setLoading] = useState(true);

  // Function to fetch activities
  const fetchActivities = async (category: string) => {
    try {
      console.log('Fetching activities for category:', category);
      const currentDate = new Date('2025-01-03T21:09:29+01:00');
      const year = currentDate.getFullYear();
      const startDate = new Date(year, 0, 1).toISOString().split('T')[0];
      const endDate = new Date(year, 11, 31).toISOString().split('T')[0];
      
      const activities = await getLearningActivity(startDate, endDate);
      console.log('Raw activities data:', activities.map(a => ({
        id: a.id,
        category: a.category,
        date: a.date,
        count: a.count,
        raw_category: a.category
      })));

      // Filter activities for the selected category
      const filteredActivities = activities.filter(activity => {
        const activityCategory = (activity.category || '').toUpperCase();
        const selectedCategoryUpper = category.toUpperCase();
        
        console.log('Comparing categories:', {
          activity: activityCategory,
          selected: selectedCategoryUpper,
          matches: activityCategory === selectedCategoryUpper,
          raw: activity
        });
        
        return activityCategory === selectedCategoryUpper;
      });

      console.log('Filtered activities for category:', {
        category,
        selectedCategory: category,
        total: filteredActivities.length,
        activities: filteredActivities
      });

      setActivityData(filteredActivities);
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const items = await getLearningItems();
        const uniqueCategories = Array.from(
          new Set(items.map(item => (item.category || 'Uncategorized').toUpperCase()))
        ).sort();
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
    }, 3000); // Refresh every 3 seconds

    return () => clearInterval(refreshInterval);
  }, [selectedCategory]);

  const handleCategoryChange = (newCategory: string) => {
    const normalizedCategory = newCategory.toUpperCase();
    console.log('Category changed to:', { 
      original: newCategory, 
      normalized: normalizedCategory 
    });
    setSelectedCategory(normalizedCategory);
  };

  const totalActivities = activityData.reduce((sum, day) => sum + (day.count || 0), 0);
  const activeDays = activityData.filter(day => day.count > 0).length;
  const averagePerDay = activeDays > 0 ? (totalActivities / activeDays).toFixed(1) : '0';

  // Transform ActivityData[] into Record<string, number>
  const heatmapData = useMemo(() => {
    console.log('Transforming activity data:', activityData);
    const data: Record<string, number> = {};
    
    activityData.forEach(activity => {
      if (activity.date && activity.count) {
        // Convert to local date to handle timezone correctly
        const date = new Date(activity.date);
        const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
        const formattedDate = localDate.toISOString().split('T')[0];
        
        data[formattedDate] = (data[formattedDate] || 0) + activity.count;
        console.log('Added activity:', { 
          originalDate: activity.date,
          localDate: formattedDate,
          count: activity.count 
        });
      }
    });
    
    console.log('Transformed heatmap data:', data);
    return data;
  }, [activityData]);

  return (
    <div className="w-full space-y-8">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Learning Activity
          </h2>
          <Select value={selectedCategory} onValueChange={handleCategoryChange}>
            <SelectTrigger className="w-full sm:w-40 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            <span className="ml-3 text-gray-600 dark:text-gray-400">Loading...</span>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Stats Cards - Améliorés pour la compatibilité mode sombre sur mobile */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className={cn(
                "p-3 rounded-lg shadow-sm",
                "bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200/50",
                "dark:from-blue-900/30 dark:to-blue-800/30 dark:border-blue-700/30"
              )}>
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-blue-100 dark:bg-blue-800/50 rounded-full">
                    <Activity className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Total Activities</p>
                </div>
                <p className="text-lg font-semibold mt-1.5 text-gray-900 dark:text-white">{totalActivities}</p>
              </div>
              
              <div className={cn(
                "p-3 rounded-lg shadow-sm",
                "bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200/50",
                "dark:from-emerald-900/30 dark:to-emerald-800/30 dark:border-emerald-700/30"
              )}>
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-emerald-100 dark:bg-emerald-800/50 rounded-full">
                    <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Active Days</p>
                </div>
                <p className="text-lg font-semibold mt-1.5 text-gray-900 dark:text-white">{activeDays}</p>
              </div>
              
              <div className={cn(
                "p-3 rounded-lg shadow-sm",
                "bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200/50",
                "dark:from-purple-900/30 dark:to-purple-800/30 dark:border-purple-700/30"
              )}>
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-purple-100 dark:bg-purple-800/50 rounded-full">
                    <BarChart2 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Average Per Day</p>
                </div>
                <p className="text-lg font-semibold mt-1.5 text-gray-900 dark:text-white">{averagePerDay}</p>
              </div>
            </div>

            {/* Heatmap - Responsive wrapper and overflow handling */}
            <div className="w-full overflow-hidden bg-white dark:bg-gray-800/50 rounded-lg p-4 border border-gray-100 dark:border-gray-700">
              <YearlyActivityHeatmap 
                data={Object.entries(heatmapData).map(([date, count]) => ({ date, count }))} 
                year={new Date().getFullYear()}
              />
            </div>
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
