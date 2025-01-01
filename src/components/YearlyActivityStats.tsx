import { useEffect, useState } from 'react';
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
    if (count === 0) return 'bg-gray-100 dark:bg-gray-800';
    if (count <= 2) return 'bg-green-200 dark:bg-green-900';
    if (count <= 4) return 'bg-green-300 dark:bg-green-700';
    if (count <= 6) return 'bg-green-400 dark:bg-green-600';
    return 'bg-green-500 dark:bg-green-500';
  };

  const generateCalendarData = () => {
    const currentDate = new Date('2025-01-02T00:16:36+01:00');
    const startDate = new Date(currentDate.getFullYear(), 0, 1);
    const weeks: { date: string; count: number }[][] = [];
    let currentWeek: { date: string; count: number }[] = [];
    let dayOfWeek = startDate.getDay();

    // Add empty days at the start if needed
    for (let i = 0; i < dayOfWeek; i++) {
      currentWeek.push({ date: '', count: 0 });
    }

    for (let d = new Date(startDate); d <= currentDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const dayData = activityData.find(a => a.date === dateStr);
      
      currentWeek.push({
        date: dateStr,
        count: dayData?.count || 0
      });

      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }

    // Add remaining days to the last week
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push({ date: '', count: 0 });
      }
      weeks.push(currentWeek);
    }

    console.log('Generated calendar data:', weeks);
    return weeks;
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  const calendarData = generateCalendarData();

  return (
    <div className="space-y-4">
      <div className="w-full max-w-xs">
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger>
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
      </div>

      <div className="overflow-x-auto">
        <div className="inline-flex gap-1 min-w-fit">
          {calendarData.map((week, weekIndex) => (
            <div key={weekIndex} className="flex flex-col gap-1">
              {week.map(({ date, count }, dayIndex) => (
                <div
                  key={`${weekIndex}-${dayIndex}`}
                  className={`w-3 h-3 rounded-sm transition-colors ${date ? getColorIntensity(count) : 'bg-transparent'}`}
                  title={date ? `${date}: ${count} activities` : ''}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
        <span>Less</span>
        <div className={`w-3 h-3 rounded-sm ${getColorIntensity(0)}`} />
        <div className={`w-3 h-3 rounded-sm ${getColorIntensity(2)}`} />
        <div className={`w-3 h-3 rounded-sm ${getColorIntensity(4)}`} />
        <div className={`w-3 h-3 rounded-sm ${getColorIntensity(6)}`} />
        <div className={`w-3 h-3 rounded-sm ${getColorIntensity(8)}`} />
        <span>More</span>
      </div>
    </div>
  );
}
