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
    if (count === 0) return 'bg-slate-100';
    if (count <= 2) return 'bg-blue-200';
    if (count <= 4) return 'bg-blue-300';
    if (count <= 6) return 'bg-blue-400';
    return 'bg-blue-500';
  };

  const generateCalendarData = () => {
    const currentDate = new Date('2025-01-02T00:35:24+01:00');
    const startDate = new Date(currentDate.getFullYear(), 0, 1);
    const weeks: { date: string; count: number }[][] = [];
    let currentWeek: { date: string; count: number }[] = [];

    // Start with empty cells for days before the first day of the year
    const firstDayOfWeek = startDate.getDay();
    for (let i = 0; i < firstDayOfWeek; i++) {
      currentWeek.push({ date: '', count: 0 });
    }

    // Generate all dates from start of year to current date
    for (let d = new Date(startDate); d <= currentDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const dayData = activityData.find(a => a.date === dateStr);

      currentWeek.push({
        date: dateStr,
        count: dayData?.count || 0
      });

      // Start a new week when we reach Sunday
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }

    // Fill the last week with empty cells if needed
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push({ date: '', count: 0 });
      }
      weeks.push(currentWeek);
    }

    return weeks;
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="w-full max-w-xs">
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
      </div>

      <div className="border rounded-lg p-4 bg-white">
        <div className="mb-1 flex text-xs text-gray-500">
          <div className="w-8" /> {/* Spacer for alignment */}
          <div className="flex-1 grid grid-cols-7 gap-1">
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
            <div>Sun</div>
          </div>
        </div>

        <div className="flex">
          <div className="grid auto-rows-fr gap-1">
            {generateCalendarData().map((_, weekIndex) => (
              <div key={weekIndex} className="text-xs text-gray-400 pr-2">
                Week {weekIndex + 1}
              </div>
            ))}
          </div>
          
          <div className="flex-1 grid grid-flow-col gap-1">
            {generateCalendarData().map((week, weekIndex) => (
              <div key={weekIndex} className="grid grid-rows-1 gap-1">
                {week.map(({ date, count }, dayIndex) => (
                  <div
                    key={`${weekIndex}-${dayIndex}`}
                    className={`w-5 h-5 rounded-sm ${date ? getColorIntensity(count) : ''}`}
                    title={date ? `${date}: ${count} activities` : ''}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 mt-4 text-sm text-gray-600">
          <span>Less</span>
          <div className={`w-5 h-5 rounded-sm ${getColorIntensity(0)}`} />
          <div className={`w-5 h-5 rounded-sm ${getColorIntensity(2)}`} />
          <div className={`w-5 h-5 rounded-sm ${getColorIntensity(4)}`} />
          <div className={`w-5 h-5 rounded-sm ${getColorIntensity(6)}`} />
          <div className={`w-5 h-5 rounded-sm ${getColorIntensity(8)}`} />
          <span>More</span>
        </div>
      </div>
    </div>
  );
}
