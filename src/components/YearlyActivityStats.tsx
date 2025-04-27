import React, { useState, useEffect, useMemo } from 'react';
import { getYearlyActivity, getLearningItems } from '@/lib/database';
import { getLearningActivity } from '@/lib/learningActivity';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { YearlyActivityHeatmap } from './YearlyActivityHeatmap';
import { Activity, Calendar, BarChart2 } from 'lucide-react';

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

  // Définition des niveaux d'activité pour les labels
  const activityLabels = [
    "Aucune activité",
    "Faible activité",
    "Activité moyenne", 
    "Activité élevée",
    "Activité très élevée"
  ];

  // Modifier les couleurs pour une meilleure visibilité en mode clair
  const colorLevels = [
    "bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700", // niveau 0 (aucune activité)
    "bg-green-100 dark:bg-green-900 border border-green-200 dark:border-green-800", // niveau 1 (faible activité)
    "bg-green-300 dark:bg-green-700 border border-green-400 dark:border-green-600", // niveau 2 (activité moyenne)
    "bg-green-500 dark:bg-green-500 border border-green-600 dark:border-green-400", // niveau 3 (activité élevée)
    "bg-green-700 dark:bg-green-300 border border-green-800 dark:border-green-200", // niveau 4 (activité très élevée)
  ];

  // Typage correct pour la fonction renderCell
  const renderCell = (day: number, level: number, date: string) => {
    return (
      <div
        key={date}
        className={`
          ${colorLevels[level]} 
          w-3 h-3 md:w-4 md:h-4 
          rounded-sm 
          transition-colors 
          hover:scale-125
          relative
          group
        `}
        title={`${date}: ${activityLabels[level]}`}
      >
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 hidden group-hover:block bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
          {date}: {activityLabels[level]}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full space-y-8">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Learning Activity</h2>
          <Select value={selectedCategory} onValueChange={handleCategoryChange}>
            <SelectTrigger className="w-32">
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
            Loading...
          </div>
        ) : (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800 p-2.5 rounded-lg border border-blue-200/50 dark:border-blue-700">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                  <p className="text-sm text-black dark:text-white font-medium">Total Activities</p>
                </div>
                <p className="text-lg font-semibold mt-0.5 text-black dark:text-white">{totalActivities}</p>
              </div>
              <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900 dark:to-emerald-800 p-2.5 rounded-lg border border-emerald-200/50 dark:border-emerald-700">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                  <p className="text-sm text-black dark:text-white font-medium">Active Days</p>
                </div>
                <p className="text-lg font-semibold mt-0.5 text-black dark:text-white">{activeDays}</p>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900 dark:to-purple-800 p-2.5 rounded-lg border border-purple-200/50 dark:border-purple-700">
                <div className="flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-purple-500 dark:text-purple-400" />
                  <p className="text-sm text-black dark:text-white font-medium">Average Per Day</p>
                </div>
                <p className="text-lg font-semibold mt-0.5 text-black dark:text-white">{averagePerDay}</p>
              </div>
            </div>

            {/* Heatmap */}
            <div className="w-full">
              <YearlyActivityHeatmap 
                data={heatmapData} 
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
