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
import { Brain, Target, TrendingUp } from "lucide-react";
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
        if (session.duration) {
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
    <div className="space-y-8 p-4">
      {/* Learning Goals */}
      <LearningGoals items={items} />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
              <Brain className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Total Learning Time</h3>
              <p className="text-2xl font-semibold">
                {Math.round(analytics.categoryData.reduce((sum, cat) => sum + cat.value, 0))}h
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 text-green-600 rounded-lg">
              <Target className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Completion Rate</h3>
              <p className="text-2xl font-semibold">
                {Math.round((analytics.completionMetrics.completed || 0) / items.length * 100)}%
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-100 text-amber-600 rounded-lg">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Active Days</h3>
              <p className="text-2xl font-semibold">
                {analytics.dailyData.filter(d => d.hours > 0).length}/14
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Time by Category */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-6">Time Spent by Category</h2>
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
              <h3 className="text-sm font-medium text-gray-500">Category Breakdown</h3>
              <div className="space-y-3">
                {analytics.categoryData.map((category, index) => (
                  <div key={category.name} className="flex items-center gap-3">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center text-sm">
                        <span className="font-medium truncate">{category.name}</span>
                        <span className="text-gray-500">
                          {category.value}h ({category.percentage}%)
                        </span>
                      </div>
                      <div className="mt-1 w-full bg-gray-100 rounded-full h-1.5">
                        <div
                          className="h-1.5 rounded-full transition-all duration-500"
                          style={{
                            width: `${category.percentage}%`,
                            backgroundColor: COLORS[index % COLORS.length]
                          }}
                        />
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        {category.itemCount} items · {Math.round(category.minutes)} minutes
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* Daily Activity */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-6">Daily Activity (Past 14 Days)</h2>
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
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-6">Progress by Difficulty</h2>
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

        {/* Learning Focus */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-6">Learning Focus</h2>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={analytics.focusMetrics}>
                <PolarGrid />
                <PolarAngleAxis dataKey="subject" />
                <PolarRadiusAxis angle={30} domain={[0, 100]} />
                <Radar
                  name="Focus Areas"
                  dataKey="value"
                  stroke={COLORS[4]}
                  fill={COLORS[4]}
                  fillOpacity={0.6}
                />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Yearly Activity */}
        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Learning Insights</CardTitle>
              <CardDescription>
                Visualize your learning patterns and progress
                Track your learning progress throughout the year by category
              </CardDescription>
            </CardHeader>
            <CardContent>
              <YearlyActivityStats />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
