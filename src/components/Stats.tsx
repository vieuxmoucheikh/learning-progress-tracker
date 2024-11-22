import { useMemo } from 'react';
import { LearningItem } from '../types';
import { BarChart3, Clock, Calendar as CalendarIcon, Trophy, TrendingUp, Target } from 'lucide-react';

interface Props {
  items: LearningItem[];
}

export function Stats({ items }: Props) {
  const stats = useMemo(() => {
    const now = new Date();
    const timeByDay: { [key: string]: number } = {};
    const timeByCategory: { [key: string]: number } = {};
    const statusCounts: { [key: string]: number } = {};
    const priorityCounts: { [key: string]: number } = {};
    const difficultyDistribution: { [key: string]: number } = {};
    let totalTime = 0;
    let completedItems = 0;
    let totalSessions = 0;
    let longestStreak = 0;
    let currentStreak = 0;
    let lastDate: Date | null = null;
    let totalItems = items.length;
    let avgSessionDuration = 0;

    // Sort items by date for streak calculation
    const sortedDates = items
      .flatMap(item => item.progress?.sessions || [])
      .filter(session => session.date)
      .map(session => new Date(session.date))
      .sort((a, b) => b.getTime() - a.getTime());

    // Process items for various statistics
    items.forEach(item => {
      // Status distribution
      statusCounts[item.status] = (statusCounts[item.status] || 0) + 1;
      
      // Priority distribution
      priorityCounts[item.priority] = (priorityCounts[item.priority] || 0) + 1;
      
      // Difficulty distribution
      difficultyDistribution[item.difficulty] = (difficultyDistribution[item.difficulty] || 0) + 1;

      // Time tracking
      if (item.progress?.sessions) {
        item.progress.sessions.forEach(session => {
          if (session.date && session.duration) {
            const sessionDate = new Date(session.date).toLocaleDateString();
            const sessionMinutes = session.duration.hours * 60 + session.duration.minutes;
            
            timeByDay[sessionDate] = (timeByDay[sessionDate] || 0) + sessionMinutes;
            timeByCategory[item.category] = (timeByCategory[item.category] || 0) + sessionMinutes;
            totalTime += sessionMinutes;
            totalSessions++;
          }
        });
      }

      if (item.completed) {
        completedItems++;
      }
    });

    // Calculate average session duration
    avgSessionDuration = totalSessions > 0 ? Math.round(totalTime / totalSessions) : 0;

    // Calculate streaks
    if (sortedDates.length > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Get unique dates (one activity per day is enough for streak)
      const uniqueDates = Array.from(new Set(
        sortedDates.map(date => {
          const d = new Date(date);
          d.setHours(0, 0, 0, 0);
          return d.getTime();
        })
      )).map(time => new Date(time));
      
      // Sort dates in descending order
      uniqueDates.sort((a, b) => b.getTime() - a.getTime());
      
      // Check if there's activity today
      const hasActivityToday = uniqueDates[0]?.getTime() === today.getTime();
      
      // Check if there's activity yesterday
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const hasActivityYesterday = uniqueDates.some(date => date.getTime() === yesterday.getTime());
      
      if (hasActivityToday) {
        currentStreak = 1;
      } else if (hasActivityYesterday) {
        currentStreak = 1;
      } else {
        currentStreak = 0;
      }

      // Calculate streak through history
      for (let i = hasActivityToday ? 0 : 1; i < uniqueDates.length - 1; i++) {
        const currentDate = uniqueDates[i];
        const nextDate = uniqueDates[i + 1];
        const dayDiff = Math.round(
          (currentDate.getTime() - nextDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        
        if (dayDiff === 1) {
          currentStreak++;
        } else {
          break;
        }
      }
      
      // Update longest streak
      longestStreak = Math.max(longestStreak, currentStreak);
      
      // Store streaks in localStorage
      const streakData = {
        currentStreak,
        longestStreak,
        lastUpdate: today.toISOString(),
      };
      localStorage.setItem('learningStreakData', JSON.stringify(streakData));
    }

    return {
      totalItems,
      completedItems,
      totalTime,
      totalSessions,
      avgSessionDuration,
      timeByCategory,
      timeByDay,
      longestStreak,
      currentStreak,
      statusCounts,
      priorityCounts,
      difficultyDistribution,
      completionRate: totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0
    };
  }, [items]);

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
            <span className="text-2xl font-bold text-green-600">
              {Math.floor(stats.totalTime / 60)}h {stats.totalTime % 60}m
            </span>
          </div>
          <div className="flex justify-between items-center">
            <p className="text-gray-600">Total Sessions</p>
            <span className="text-2xl font-bold text-green-600">{stats.totalSessions}</span>
          </div>
          <div className="flex justify-between items-center">
            <p className="text-gray-600">Avg Session</p>
            <span className="text-2xl font-bold text-green-600">
              {Math.floor(stats.avgSessionDuration / 60)}h {stats.avgSessionDuration % 60}m
            </span>
          </div>
        </div>
      </div>

      {/* Streak Info */}
      <div className="bg-white p-6 rounded-xl shadow-sm border-2 border-gray-100 hover:border-purple-100 transition-all duration-200 hover:shadow-md">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-3 text-gray-800">
          <div className="p-2 bg-purple-50 rounded-lg">
            <TrendingUp className="w-6 h-6 text-purple-500" />
          </div>
          Learning Streaks
        </h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <p className="text-gray-600">Current Streak</p>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-purple-600">{stats.currentStreak}</span>
              <span className="text-gray-500">days</span>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <p className="text-gray-600">Longest Streak</p>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-purple-600">{stats.longestStreak}</span>
              <span className="text-gray-500">days</span>
            </div>
          </div>
          <div className="mt-4 p-3 bg-purple-50 rounded-lg">
            <div className="flex items-center justify-center gap-2">
              <Trophy className="w-5 h-5 text-purple-500" />
              <span className="text-purple-700 font-medium">
                {stats.currentStreak > 0 ? "Keep up the streak!" : "Start your streak today!"}
              </span>
            </div>
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
          {Object.entries(stats.statusCounts).map(([status, count]) => (
            <div key={status} className="flex justify-between items-center">
              <p className="text-gray-600 capitalize">{status.replace('_', ' ')}</p>
              <span className="text-xl font-bold text-orange-600">{count}</span>
            </div>
          ))}
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
          {Object.entries(stats.priorityCounts).map(([priority, count]) => (
            <div key={priority} className="flex justify-between items-center">
              <p className="text-gray-600 capitalize">{priority}</p>
              <span className="text-xl font-bold text-yellow-600">{count}</span>
            </div>
          ))}
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
          {Object.entries(stats.timeByCategory).map(([category, minutes]) => (
            <div key={category} className="flex justify-between items-center">
              <p className="text-gray-600 capitalize">{category || 'Uncategorized'}</p>
              <span className="text-xl font-bold text-red-600">
                {Math.floor(minutes / 60)}h {minutes % 60}m
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}