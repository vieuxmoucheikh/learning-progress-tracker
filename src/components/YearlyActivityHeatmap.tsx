import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { getLearningActivity, LearningActivity } from '../lib/learningActivity';
import { format, startOfYear, endOfYear, eachDayOfInterval } from 'date-fns';

interface YearlyActivityHeatmapProps {
  selectedCategory: string;
}

const YearlyActivityHeatmap: React.FC<YearlyActivityHeatmapProps> = ({ selectedCategory }) => {
  const [activities, setActivities] = useState<LearningActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchActivities() {
      try {
        const start = format(startOfYear(new Date()), 'yyyy-MM-dd');
        const end = format(endOfYear(new Date()), 'yyyy-MM-dd');
        const data = await getLearningActivity(start, end);
        setActivities(data.filter(activity => activity.category === selectedCategory));
      } catch (error) {
        console.error('Error fetching activities:', error);
      } finally {
        setLoading(false);
      }
    }

    if (selectedCategory) {
      fetchActivities();
    }
  }, [selectedCategory]);

  const getActivityCount = (date: Date) => {
    const formattedDate = format(date, 'yyyy-MM-dd');
    const activity = activities.find(a => a.date === formattedDate);
    return activity?.count || 0;
  };

  const getColorIntensity = (count: number) => {
    if (count === 0) return 'bg-gray-100 dark:bg-gray-800';
    if (count <= 2) return 'bg-blue-100 dark:bg-blue-900';
    if (count <= 4) return 'bg-blue-300 dark:bg-blue-700';
    if (count <= 6) return 'bg-blue-500 dark:bg-blue-500';
    return 'bg-blue-700 dark:bg-blue-300';
  };

  const days = eachDayOfInterval({
    start: startOfYear(new Date()),
    end: endOfYear(new Date())
  });

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="overflow-x-auto">
      <div className="inline-flex gap-1">
        {days.map((day) => {
          const count = getActivityCount(day);
          return (
            <div
              key={day.toISOString()}
              className={cn(
                "w-3 h-3 rounded-sm transition-colors",
                getColorIntensity(count)
              )}
              title={`${format(day, 'MMM d, yyyy')}: ${count} activities`}
            />
          );
        })}
      </div>
    </div>
  );
};

export default YearlyActivityHeatmap;
