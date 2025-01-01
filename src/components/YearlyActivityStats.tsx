import { useEffect, useState } from 'react';
import { getYearlyActivity, getLearningItems } from '@/lib/database';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ActivityData {
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
        const items: LearningItem[] = await getLearningItems();
        const uniqueCategories = [...new Set(items.map(item => item.category).filter(Boolean))] as string[];
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
        setActivityData(data);
      } catch (error) {
        console.error('Error fetching activity:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchActivity();
  }, [selectedCategory]);

  const getColorIntensity = (count: number) => {
    if (count === 0) return 'bg-gray-100';
    if (count <= 2) return 'bg-green-200';
    if (count <= 4) return 'bg-green-300';
    if (count <= 6) return 'bg-green-400';
    return 'bg-green-500';
  };

  const generateYearGrid = () => {
    const currentDate = new Date('2025-01-01T23:41:52+01:00');
    const startDate = new Date(currentDate.getFullYear(), 0, 1);
    const days = [];

    for (let d = new Date(startDate); d <= currentDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const activity = activityData.find(a => a.date === dateStr);
      days.push({
        date: dateStr,
        count: activity?.count || 0
      });
    }

    return days;
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Yearly Learning Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
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
        <div className="grid grid-cols-53 gap-1">
          {generateYearGrid().map((day) => (
            <div
              key={day.date}
              className={`w-3 h-3 rounded-sm ${getColorIntensity(day.count)}`}
              title={`${day.date}: ${day.count} activities`}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
