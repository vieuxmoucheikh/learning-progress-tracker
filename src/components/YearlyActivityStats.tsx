import React, { useState, useEffect } from 'react';
import { getYearlyActivity, getLearningItems } from '@/lib/database';
import { getLearningActivity } from '@/lib/learningActivity';
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

export const YearlyActivityStats: React.FC = () => {
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [activityData, setActivityData] = useState<ActivityData[]>([]);
  const [loading, setLoading] = useState(true);

  // Function to fetch activities
  const fetchActivities = async (category: string) => {
    try {
      console.log('Fetching activities for category:', category);
      const currentDate = new Date('2025-01-03T09:15:06+01:00');
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
      
      const categoryActivities = activities.filter(a => {
        const activityCategory = (a.category || '').toUpperCase();
        const selectedCategory = (category || '').toUpperCase();
        const match = activityCategory === selectedCategory;
        console.log('Comparing categories:', {
          activity: activityCategory,
          selected: selectedCategory,
          matches: match,
          raw: {
            activity: a.category,
            selected: category
          }
        });
        return match;
      });
      
      console.log('Filtered activities for category:', {
        category,
        selectedCategory: category.toUpperCase(),
        total: categoryActivities.length,
        activities: categoryActivities.map(a => ({ 
          category: a.category,
          date: a.date,
          count: a.count,
          raw_category: a.category
        }))
      });
      
      setActivityData(categoryActivities);
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

  return (
    <div className="space-y-4">
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
          <div>Loading...</div>
        ) : (
          <div className="space-y-4">
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
              <YearlyActivityHeatmap data={activityData} />
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
