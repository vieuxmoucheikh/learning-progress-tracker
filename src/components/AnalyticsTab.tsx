import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from "recharts";
import { LearningItem } from "@/types";
import { useMemo } from "react";
import { Brain, Target, TrendingUp, CheckCircle, BookOpen, PieChart as PieChartIcon, BarChart3, Calendar } from "lucide-react";
import LearningGoals from './LearningGoals';
import { YearlyActivityStats } from './YearlyActivityStats';

interface AnalyticsTabProps {
  items: LearningItem[];
}

const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#14B8A6"];
const DIFFICULTY_COLORS = {
  easy: "#10B981",
  medium: "#F59E0B",
  hard: "#EF4444"
};

export function AnalyticsTab({ items }: AnalyticsTabProps) {
  const analytics = useMemo(() => {
    // Time spent per category (using actual session data)
    const categoryData = items.reduce((acc, item) => {
      const category = item.category || "Uncategorized";
      
      // Calculate time from sessions
      const sessionTime = (item.progress?.sessions || []).reduce((time, session) => {
        if (session.duration?.hours !== undefined && session.duration?.minutes !== undefined) {
          return time + (session.duration.hours * 60 + session.duration.minutes);
        }
        return time;
      }, 0);

      // Add current session time if active
      const isActive = item.progress?.sessions?.some(s => !s.endTime && s.status === 'in_progress');
      if (isActive) {
        const lastSession = item.progress?.sessions?.find(s => !s.endTime && s.status === 'in_progress');
        if (lastSession) {
          const startTime = new Date(lastSession.startTime).getTime();
          const currentTime = new Date().getTime();
          const activeMinutes = Math.floor((currentTime - startTime) / (1000 * 60));
          acc[category] = (acc[category] || 0) + sessionTime + activeMinutes;
        } else {
          acc[category] = (acc[category] || 0) + sessionTime;
        }
      } else {
        acc[category] = (acc[category] || 0) + sessionTime;
      }
      
      return acc;
    }, {} as Record<string, number>);

    // Convert minutes to hours and sort by time spent
    const sortedCategoryData = Object.entries(categoryData)
      .map(([name, minutes]) => ({
        name,
        value: Math.round((minutes / 60) * 100) / 100,
        minutes: minutes,
        itemCount: items.filter(item => (item.category || "Uncategorized") === name).length
      }))
      .sort((a, b) => b.value - a.value);

    // Calculate percentage for each category
    const totalTime = sortedCategoryData.reduce((sum, cat) => sum + cat.value, 0);
    const categoryDataWithPercentage = sortedCategoryData.map(cat => ({
      ...cat,
      percentage: totalTime > 0 ? Math.round((cat.value / totalTime) * 100) : 0
    }));

    // Progress by difficulty
    const difficultyData = items.reduce((acc, item) => {
      const difficulty = item.difficulty || "medium";
      const progress = item.progress?.current ? 
        ((item.progress.current.hours * 60 + item.progress.current.minutes) / 
         ((item.progress.total?.hours || 1) * 60 + (item.progress.total?.minutes || 0))) * 100 : 0;
      
      acc[difficulty] = {
        count: (acc[difficulty]?.count || 0) + 1,
        avgProgress: ((acc[difficulty]?.avgProgress || 0) * (acc[difficulty]?.count || 0) + progress) / 
                    ((acc[difficulty]?.count || 0) + 1)
      };
      return acc;
    }, {} as Record<string, { count: number; avgProgress: number }>);

    // Daily activity for past 14 days
    const now = new Date();
    const dailyData = Array.from({ length: 14 }, (_, i) => {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const stats = items.reduce((acc, item) => {
        const sessions = (item.progress?.sessions || [])
          .filter(session => session.startTime.startsWith(dateStr));
        
        const hours = sessions.reduce((sum, session) => 
          sum + ((session.duration?.hours || 0) + (session.duration?.minutes || 0) / 60), 0);
        
        return {
          hours: acc.hours + hours,
          sessions: acc.sessions + sessions.length
        };
      }, { hours: 0, sessions: 0 });

      return {
        date: dateStr,
        hours: Math.round(stats.hours * 100) / 100,
        sessions: stats.sessions
      };
    }).reverse();

    // Completion metrics
    const completionMetrics = items.reduce((acc, item) => {
      const status = item.status || "not_started";
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Learning focus (radar chart data)
    const focusMetrics = {
      consistency: Math.min(100, (dailyData.filter(d => d.hours > 0).length / 14) * 100),
      completion: Math.min(100, (completionMetrics.completed || 0) / items.length * 100),
      diversity: Math.min(100, Object.keys(categoryData).length * 20),
      engagement: Math.min(100, dailyData.reduce((sum, d) => sum + d.sessions, 0) / 14 * 50),
      progress: Math.min(100, items.reduce((sum, item) => {
        const total = (item.progress?.total?.hours || 1) * 60 + (item.progress?.total?.minutes || 0);
        const current = (item.progress?.current?.hours || 0) * 60 + (item.progress?.current?.minutes || 0);
        return sum + (current / total) * 100;
      }, 0) / items.length)
    };

    return {
      categoryData: categoryDataWithPercentage,
      difficultyData: Object.entries(difficultyData).map(([difficulty, data]) => ({
        name: difficulty.charAt(0).toUpperCase() + difficulty.slice(1),
        progress: Math.round(data.avgProgress * 10) / 10,
        count: data.count
      })),
      dailyData,
      completionMetrics,
      focusMetrics: Object.entries(focusMetrics).map(([key, value]) => ({
        subject: key.charAt(0).toUpperCase() + key.slice(1),
        value: Math.round(value * 10) / 10
      }))
    };
  }, [items]);

  return (
    <div className="space-y-8">
      {/* Learning Goals */}
      <Card className="p-6 hover:shadow-md transition-shadow border-l-4 border-indigo-500">
        <CardHeader className="px-0 pt-0">
          <CardTitle className="text-xl flex items-center gap-2">
            <div className="p-1.5 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
              <Target className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
            </div>
            Learning Goals
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <LearningGoals items={items} />
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 hover:shadow-md transition-shadow border-l-4 border-blue-500">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Learning Time</h3>
              <p className="mt-2 text-3xl font-semibold text-blue-600 dark:text-blue-400">
                {Math.round(analytics.categoryData.reduce((sum, cat) => sum + cat.value, 0))}h
              </p>
            </div>
            <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
              <Brain className="w-5 h-5 text-blue-500 dark:text-blue-400" />
            </div>
          </div>
        </Card>

        <Card className="p-4 hover:shadow-md transition-shadow border-l-4 border-green-500">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Completion Rate</h3>
              <p className="mt-2 text-3xl font-semibold text-green-600 dark:text-green-400">
                {Math.round((analytics.completionMetrics.completed || 0) / items.length * 100)}%
              </p>
            </div>
            <div className="p-2 bg-green-50 dark:bg-green-900/30 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-500 dark:text-green-400" />
            </div>
          </div>
        </Card>

        <Card className="p-4 hover:shadow-md transition-shadow border-l-4 border-amber-500">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Active Days</h3>
              <p className="mt-2 text-3xl font-semibold text-amber-600 dark:text-amber-400">
                {analytics.dailyData.filter(d => d.hours > 0).length}/14
              </p>
            </div>
            <div className="p-2 bg-amber-50 dark:bg-amber-900/30 rounded-lg">
              <TrendingUp className="w-5 h-5 text-amber-500 dark:text-amber-400" />
            </div>
          </div>
        </Card>
        
        <Card className="p-4 hover:shadow-md transition-shadow border-l-4 border-purple-500">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Categories</h3>
              <p className="mt-2 text-3xl font-semibold text-purple-600 dark:text-purple-400">
                {analytics.categoryData.length}
              </p>
            </div>
            <div className="p-2 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
              <BookOpen className="w-5 h-5 text-purple-500 dark:text-purple-400" />
            </div>
          </div>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Time by Category */}
        <Card className="p-6 hover:shadow-md transition-shadow lg:col-span-2">
          <div className="flex items-center gap-2 mb-6">
            <div className="p-1.5 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
              <PieChartIcon className="w-5 h-5 text-blue-500 dark:text-blue-400" />
            </div>
            <h2 className="text-lg font-semibold">Time Spent by Category</h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analytics.categoryData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ name, percentage }) => `${name}: ${percentage}%`}
                  >
                    {analytics.categoryData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number, name: string, entry: any) => [
                      `${value}h (${entry.payload.percentage}%)`,
                      `${name} (${entry.payload.itemCount} items)`
                    ]}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Category Breakdown</h3>
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                {analytics.categoryData.map((category, index) => (
                  <div key={category.name} className="flex items-center gap-3">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center text-sm">
                        <span className="font-medium truncate">{category.name}</span>
                        <span className="text-gray-500 dark:text-gray-400">
                          {category.value}h ({category.percentage}%)
                        </span>
                      </div>
                      <div className="mt-1 w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5">
                        <div
                          className="h-1.5 rounded-full transition-all duration-500"
                          style={{
                            width: `${category.percentage}%`,
                            backgroundColor: COLORS[index % COLORS.length]
                          }}
                        />
                      </div>
                      <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        {category.itemCount} items · {Math.round(category.minutes)} minutes
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* Learning Focus */}
        <Card className="p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 mb-6">
            <div className="p-1.5 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
              <Target className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
            </div>
            <h2 className="text-lg font-semibold">Learning Focus</h2>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={analytics.focusMetrics}>
                <PolarGrid />
                <PolarAngleAxis dataKey="subject" />
                <PolarRadiusAxis angle={30} domain={[0, 100]} />
                <Radar
                  name="Learning Focus"
                  dataKey="value"
                  stroke="#8884d8"
                  fill="#8884d8"
                  fillOpacity={0.6}
                />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Daily Activity */}
        <Card className="p-6 hover:shadow-md transition-shadow lg:col-span-2">
          <div className="flex items-center gap-2 mb-6">
            <div className="p-1.5 bg-green-50 dark:bg-green-900/30 rounded-lg">
              <BarChart3 className="w-5 h-5 text-green-500 dark:text-green-400" />
            </div>
            <h2 className="text-lg font-semibold">Daily Activity (Past 14 Days)</h2>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analytics.dailyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) => new Date(value).toLocaleDateString(undefined, { weekday: 'short' })}
                />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip
                  labelFormatter={(value) => new Date(value).toLocaleDateString()}
                  formatter={(value: number, name: string) => [
                    name === 'hours' ? `${value} hours` : `${value} sessions`,
                    name === 'hours' ? 'Time Spent' : 'Sessions'
                  ]}
                />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="hours"
                  stroke={COLORS[0]}
                  activeDot={{ r: 8 }}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="sessions"
                  stroke={COLORS[1]}
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Progress by Difficulty */}
        <Card className="p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 mb-6">
            <div className="p-1.5 bg-amber-50 dark:bg-amber-900/30 rounded-lg">
              <TrendingUp className="w-5 h-5 text-amber-500 dark:text-amber-400" />
            </div>
            <h2 className="text-lg font-semibold">Progress by Difficulty</h2>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.difficultyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar
                  dataKey="progress"
                  name="Avg. Progress %"
                  fill={COLORS[2]}
                />
                <Bar
                  dataKey="count"
                  name="Number of Items"
                  fill={COLORS[3]} 
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Yearly Activity Heatmap */}
      <Card className="p-6 hover:shadow-md transition-shadow">
        <div className="flex items-center gap-2 mb-6">
          <div className="p-1.5 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
            <Calendar className="w-5 h-5 text-blue-500 dark:text-blue-400" />
          </div>
          <h2 className="text-lg font-semibold">Learning Insights</h2>
        </div>
        <YearlyActivityStats />
      </Card>
    </div>
  );
}
