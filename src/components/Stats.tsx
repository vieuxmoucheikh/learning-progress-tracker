import { useMemo } from 'react';
import { LearningItem } from '../types';
import { BarChart3, Clock, Calendar as CalendarIcon, Trophy, TrendingUp, Target } from 'lucide-react';

interface Props {
  items: LearningItem[];
}

export function Stats({ items }: Props) {
  const calculateTotalTime = () => {
    return items.reduce((total, item) => {
      const itemMinutes = (item.progress.current.hours * 60) + item.progress.current.minutes;
      return total + itemMinutes;
    }, 0);
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const calculateStats = () => {
    const totalItems = items.length;
    const completedItems = items.filter(item => item.completed).length;
    const totalTime = calculateTotalTime();
    const averageTime = totalItems > 0 ? totalTime / totalItems : 0;

    return {
      totalItems,
      completedItems,
      completionRate: totalItems > 0 ? (completedItems / totalItems) * 100 : 0,
      totalTime: formatTime(totalTime),
      averageTime: formatTime(Math.round(averageTime))
    };
  };

  const stats = useMemo(() => calculateStats(), [items]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Overall Progress */}
      <div className="bg-white p-6 rounded-xl shadow-sm border-2 border-gray-100 hover:border-blue-100 transition-all duration-200 hover:shadow-md">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-3 text-gray-800">
          <div className="p-2 bg-blue-50 rounded-lg">
            <Target className="w-6 h-6 text-blue-500" />
          </div>
          Overall Progress
        </h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <p className="text-gray-600">Total Items</p>
            <span className="text-2xl font-bold text-blue-600">{stats.totalItems}</span>
          </div>
          <div className="flex justify-between items-center">
            <p className="text-gray-600">Completed</p>
            <span className="text-2xl font-bold text-green-600">{stats.completedItems}</span>
          </div>
          <div className="flex justify-between items-center">
            <p className="text-gray-600">Completion Rate</p>
            <span className="text-2xl font-bold text-purple-600">{stats.completionRate}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-3 mt-4">
            <div
              className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-300"
              style={{ width: `${stats.completionRate}%` }}
            />
          </div>
        </div>
      </div>

      {/* Time Stats */}
      <div className="bg-white p-6 rounded-xl shadow-sm border-2 border-gray-100 hover:border-green-100 transition-all duration-200 hover:shadow-md">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-3 text-gray-800">
          <div className="p-2 bg-green-50 rounded-lg">
            <Clock className="w-6 h-6 text-green-500" />
          </div>
          Time Statistics
        </h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <p className="text-gray-600">Total Time</p>
            <span className="text-2xl font-bold text-green-600">{stats.totalTime}</span>
          </div>
          <div className="flex justify-between items-center">
            <p className="text-gray-600">Average Time</p>
            <span className="text-2xl font-bold text-green-600">{stats.averageTime}</span>
          </div>
        </div>
      </div>

      {/* Status Distribution */}
      <div className="bg-white p-6 rounded-xl shadow-sm border-2 border-gray-100 hover:border-orange-100 transition-all duration-200 hover:shadow-md">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-3 text-gray-800">
          <div className="p-2 bg-orange-50 rounded-lg">
            <BarChart3 className="w-6 h-6 text-orange-500" />
          </div>
          Status Distribution
        </h3>
        <div className="space-y-3">
          {/* Add status distribution logic here */}
        </div>
      </div>

      {/* Priority Distribution */}
      <div className="bg-white p-6 rounded-xl shadow-sm border-2 border-gray-100 hover:border-yellow-100 transition-all duration-200 hover:shadow-md">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-3 text-gray-800">
          <div className="p-2 bg-yellow-50 rounded-lg">
            <Trophy className="w-6 h-6 text-yellow-500" />
          </div>
          Priority Levels
        </h3>
        <div className="space-y-3">
          {/* Add priority distribution logic here */}
        </div>
      </div>

      {/* Time by Category */}
      <div className="bg-white p-6 rounded-xl shadow-sm border-2 border-gray-100 hover:border-red-100 transition-all duration-200 hover:shadow-md">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-3 text-gray-800">
          <div className="p-2 bg-red-50 rounded-lg">
            <CalendarIcon className="w-6 h-6 text-red-500" />
          </div>
          Time by Category
        </h3>
        <div className="space-y-3">
          {/* Add time by category logic here */}
        </div>
      </div>
    </div>
  );
}