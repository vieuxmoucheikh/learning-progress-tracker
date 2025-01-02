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
    if (count <= 2) return 'bg-blue-300/90 dark:bg-blue-800/90 ring-1 ring-blue-400/50 dark:ring-blue-700/50';
    if (count <= 4) return 'bg-blue-400/90 dark:bg-blue-700/90 ring-1 ring-blue-500/50 dark:ring-blue-600/50';
    if (count <= 6) return 'bg-blue-500/90 dark:bg-blue-600/90 ring-1 ring-blue-600/50 dark:ring-blue-500/50';
    return 'bg-blue-600/90 dark:bg-blue-500/90 ring-1 ring-blue-700/50 dark:ring-blue-400/50';
  };

  const generateCalendarData = () => {
    const currentDate = new Date();
    const startDate = new Date(currentDate.getFullYear(), 0, 1);
    startDate.setHours(0, 0, 0, 0);
    
    const weeks: { date: string; count: number }[][] = [];
    let currentWeek: { date: string; count: number }[] = [];

    // Calculate total weeks needed for the full year view
    const totalWeeks = 53; // Maximum weeks in a year plus padding
    const firstDayOfYear = startDate.getDay();

    // Start with empty cells for days before January 1st
    for (let i = 0; i < firstDayOfYear; i++) {
      currentWeek.push({ date: '', count: 0 });
    }

    // Generate all dates for the entire year
    const endDate = new Date(currentDate.getFullYear(), 11, 31); // December 31st
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const dayData = activityData.find(a => a.date === dateStr);

      currentWeek.push({
        date: dateStr,
        count: dayData?.count || 0
      });

      // Start a new week when we reach Sunday
      if (d.getDay() === 6) {
        while (currentWeek.length < 7) {
          currentWeek.push({ date: '', count: 0 });
        }
        weeks.push([...currentWeek]);
        currentWeek = [];
      }
    }

    // Fill the last week with remaining days
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push({ date: '', count: 0 });
      }
      weeks.push([...currentWeek]);
    }

    // Add empty weeks to fill the grid if needed
    while (weeks.length < totalWeeks) {
      weeks.push(Array(7).fill({ date: '', count: 0 }));
    }

    return weeks;
  };

  const getMonthLabels = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentDate = new Date();
    return months.map((month, index) => {
      const date = new Date(currentDate.getFullYear(), index, 1);
      const weekIndex = Math.floor((date.getDate() - date.getDay() + 5) / 7);
      return { label: month, weekIndex };
    });
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const calendarData = generateCalendarData();
  const monthLabels = getMonthLabels();
  const totalActivities = activityData.reduce((sum, day) => sum + day.count, 0);
  const daysWithActivity = activityData.filter(day => day.count > 0).length;
  const totalDays = activityData.length;
  const averagePerDay = totalActivities / totalDays;
  const streakPercentage = (daysWithActivity / totalDays) * 100;

  return (
    <div className="space-y-4">
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

        <div className="text-sm text-gray-600 dark:text-gray-400 flex gap-4">
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

      <div className="border rounded-lg p-4 bg-white dark:bg-gray-800 shadow-sm">
        {/* Month labels */}
        <div className="mb-2 flex text-xs text-gray-500 dark:text-gray-400">
          <div className="w-8" />
          <div className="flex-1 relative">
            {monthLabels.map(({ label, weekIndex }, index) => (
              <div
                key={label}
                className="absolute text-xs font-medium"
                style={{
                  left: `${(weekIndex / 52) * 100}%`,
                  transform: 'translateX(-50%)'
                }}
              >
                {label}
              </div>
            ))}
          </div>
        </div>

        {/* Weekday labels */}
        <div className="mb-2 flex text-xs text-gray-500 dark:text-gray-400">
          <div className="w-8" />
          <div className="flex-1 grid grid-cols-7 gap-1 text-center font-medium">
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
            <div>Sun</div>
          </div>
        </div>

        <div className="flex mt-6">
          <div className="grid auto-rows-fr gap-1">
            {calendarData.map((_, weekIndex) => (
              <div key={weekIndex} className="text-xs text-gray-400 dark:text-gray-500 pr-2 h-5 flex items-center font-medium">
                {weekIndex + 1}
              </div>
            ))}
          </div>
          
          <div className="flex-1 grid grid-flow-col gap-1">
            {calendarData.map((week, weekIndex) => (
              <div key={weekIndex} className="grid grid-rows-1 gap-1">
                {week.map(({ date, count }, dayIndex) => (
                  <div
                    key={`${weekIndex}-${dayIndex}`}
                    className={`w-5 h-5 rounded-sm transition-all duration-200 ${
                      date ? getColorIntensity(count) : 'bg-transparent'
                    } hover:scale-110 hover:ring-2 hover:ring-blue-400 dark:hover:ring-blue-500 cursor-help shadow-sm`}
                    title={date ? `${formatDate(date)}: ${count} activities` : ''}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 mt-4 text-sm text-gray-600 dark:text-gray-400">
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
