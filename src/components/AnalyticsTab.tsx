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
  Radar,
  TooltipProps
} from "recharts";
import { LearningItem } from "@/types";
import { useMemo, useState } from "react";
import { Brain, Target, TrendingUp, CheckCircle, BookOpen, PieChart as PieChartIcon, BarChart3, Calendar, Lightbulb, Layers } from "lucide-react";
import LearningGoals from './LearningGoals';
import { YearlyActivityStats } from './YearlyActivityStats';
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";

interface AnalyticsTabProps {
  items: LearningItem[];
}

// Palette de couleurs améliorée pour les graphiques avec meilleure compatibilité dark/light
const COLORS = [
  "#3B82F6", // blue-500
  "#10B981", // emerald-500
  "#F59E0B", // amber-500
  "#EF4444", // red-500
  "#8B5CF6", // violet-500
  "#EC4899", // pink-500
  "#14B8A6", // teal-500
  "#6366F1", // indigo-500
  "#F97316", // orange-500
];

const DIFFICULTY_COLORS = {
  easy: "#10B981",
  medium: "#F59E0B",
  hard: "#EF4444"
};

// Composant personnalisé pour le tooltip des graphiques
const CustomTooltip = ({ active, payload, label, labelFormatter }: TooltipProps<any, any>) => {
  if (!active || !payload || !payload.length) return null;
  
  return (
    <div className="bg-white dark:bg-gray-800 p-3 shadow-lg border border-gray-200 dark:border-gray-700 rounded-md">
      <p className="font-medium text-gray-800 dark:text-gray-100">
        {labelFormatter ? labelFormatter(label, payload) : label}
      </p>
      <div className="mt-2">
        {payload.map((item: any, index: number) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
            <span className="text-gray-700 dark:text-gray-300">
              {item.name}: {item.value} {item.unit || ''}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export function AnalyticsTab({ items }: AnalyticsTabProps) {
  const [selectedMetric, setSelectedMetric] = useState<'hours' | 'sessions'>('hours');
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
      {/* En-tête de la page */}
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
          Learning Analytics
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-lg">
          Visualisez vos progrès et identifiez vos tendances d'apprentissage
        </p>
      </div>

      {/* Summary Cards - Design modernisé */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-5">
        <Card className={cn(
          "p-5 hover:shadow-md transition-all duration-300 border-0 shadow-md",
          "overflow-hidden relative bg-gradient-to-br from-blue-50 to-blue-100",
          "dark:from-blue-900/20 dark:to-blue-800/20"
        )}>
          <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-blue-500 to-blue-600"></div>
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">Total Learning Time</h3>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                {Math.round(analytics.categoryData.reduce((sum, cat) => sum + cat.value, 0))}h
              </p>
            </div>
            <div className="p-2.5 bg-blue-100 dark:bg-blue-900/50 rounded-full shadow-sm">
              <Brain className="w-5 h-5 text-blue-600 dark:text-blue-400" strokeWidth={2} />
            </div>
          </div>
        </Card>

        <Card className={cn(
          "p-5 hover:shadow-md transition-all duration-300 border-0 shadow-md",
          "overflow-hidden relative bg-gradient-to-br from-green-50 to-green-100",
          "dark:from-green-900/20 dark:to-green-800/20"
        )}>
          <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-green-500 to-green-600"></div>
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-sm font-medium text-green-700 dark:text-green-300 mb-1">Completion Rate</h3>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                {Math.round((analytics.completionMetrics.completed || 0) / items.length * 100)}%
              </p>
            </div>
            <div className="p-2.5 bg-green-100 dark:bg-green-900/50 rounded-full shadow-sm">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" strokeWidth={2} />
            </div>
          </div>
        </Card>

        <Card className={cn(
          "p-5 hover:shadow-md transition-all duration-300 border-0 shadow-md",
          "overflow-hidden relative bg-gradient-to-br from-amber-50 to-amber-100",
          "dark:from-amber-900/20 dark:to-amber-800/20"
        )}>
          <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-amber-500 to-amber-600"></div>
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-sm font-medium text-amber-700 dark:text-amber-300 mb-1">Active Days</h3>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                {analytics.dailyData.filter(d => d.hours > 0).length}/14
              </p>
            </div>
            <div className="p-2.5 bg-amber-100 dark:bg-amber-900/50 rounded-full shadow-sm">
              <TrendingUp className="w-5 h-5 text-amber-600 dark:text-amber-400" strokeWidth={2} />
            </div>
          </div>
        </Card>
        
        <Card className={cn(
          "p-5 hover:shadow-md transition-all duration-300 border-0 shadow-md",
          "overflow-hidden relative bg-gradient-to-br from-purple-50 to-purple-100",
          "dark:from-purple-900/20 dark:to-purple-800/20"
        )}>
          <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-purple-500 to-purple-600"></div>
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-sm font-medium text-purple-700 dark:text-purple-300 mb-1">Categories</h3>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                {analytics.categoryData.length}
              </p>
            </div>
            <div className="p-2.5 bg-purple-100 dark:bg-purple-900/50 rounded-full shadow-sm">
              <BookOpen className="w-5 h-5 text-purple-600 dark:text-purple-400" strokeWidth={2} />
            </div>
          </div>
        </Card>
      </div>

      {/* Learning Goals - Design amélioré */}
      <Card className="overflow-hidden relative border border-gray-200 dark:border-gray-800 shadow-md hover:shadow-lg transition-all duration-300">
        <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-indigo-500 to-indigo-600"></div>
        <div className="p-6">
          <CardHeader className="px-0 pt-0">
            <CardTitle className="text-xl flex items-center gap-3">
              <div className="p-2.5 bg-indigo-100 dark:bg-indigo-900/50 rounded-full shadow-sm">
                <Target className="w-5 h-5 text-indigo-600 dark:text-indigo-400" strokeWidth={2} />
              </div>
              <span className="text-gray-900 dark:text-white font-semibold">
                Learning Goals
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <LearningGoals items={items} />
          </CardContent>
        </div>
      </Card>

      {/* Charts Grid - Optimized for dark mode and mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Time by Category - Improved for dark mode */}
        <Card className="border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 lg:col-span-2">
          <div className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <div className="p-2.5 bg-blue-100 dark:bg-blue-900/50 rounded-full shadow-sm">
                <PieChartIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" strokeWidth={2} />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Time Spent by Category</h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Responsive chart container with better dark mode support */}
              <div className="h-[320px] md:h-[360px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analytics.categoryData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius="70%"
                      label={({ name, percentage }) => `${name}: ${percentage}%`}
                      labelLine={{ stroke: "#888", strokeWidth: 1 }}
                    >
                      {analytics.categoryData.map((_, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={COLORS[index % COLORS.length]} 
                          stroke="rgba(255,255,255,0.2)"
                          strokeWidth={1}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Category breakdown with improved mobile & dark mode appearance */}
              <div className="space-y-4">
                <h3 className="text-base font-medium text-gray-700 dark:text-gray-300">Category Breakdown</h3>
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 pb-2">
                  {analytics.categoryData.map((category, index) => (
                    <div key={category.name} className="bg-white dark:bg-gray-800/50 rounded-lg p-3 border border-gray-100 dark:border-gray-700">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                          <span className="font-medium text-gray-900 dark:text-white truncate">{category.name}</span>
                        </div>
                        <span className="text-gray-600 dark:text-gray-400 text-sm">
                          {category.value}h
                        </span>
                      </div>
                      
                      <div className="mt-2">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-gray-500 dark:text-gray-400">{category.itemCount} items</span>
                          <span className="text-gray-500 dark:text-gray-400">{category.percentage}%</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${category.percentage}%`,
                              backgroundColor: COLORS[index % COLORS.length]
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Learning Focus - Enhanced for dark mode & mobile */}
        <Card className="border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
          <div className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <div className="p-2.5 bg-indigo-100 dark:bg-indigo-900/50 rounded-full shadow-sm">
                <Layers className="w-5 h-5 text-indigo-600 dark:text-indigo-400" strokeWidth={2} />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Learning Focus</h2>
            </div>
            
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={analytics.focusMetrics}>
                  <PolarGrid stroke="#888" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: "#888" }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: "#888" }} />
                  <Radar
                    name="Learning Focus"
                    dataKey="value"
                    stroke={COLORS[4]}
                    fill={COLORS[4]}
                    fillOpacity={0.5}
                  />
                  <Tooltip content={<CustomTooltip />} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>
      </div>

      {/* Daily Activity - Improved dark mode support */}
      <Card className="border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className="p-2.5 bg-green-100 dark:bg-green-900/50 rounded-full shadow-sm">
                <BarChart3 className="w-5 h-5 text-green-600 dark:text-green-400" strokeWidth={2} />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Daily Activity (Past 14 Days)</h2>
            </div>
            <div className="flex gap-2">
              <Button 
                size="sm" 
                variant={selectedMetric === 'hours' ? 'default' : 'outline'} 
                onClick={() => setSelectedMetric('hours')} 
                className="h-8"
              >
                Hours
              </Button>
              <Button 
                size="sm" 
                variant={selectedMetric === 'sessions' ? 'default' : 'outline'} 
                onClick={() => setSelectedMetric('sessions')} 
                className="h-8"
              >
                Sessions
              </Button>
            </div>
          </div>
          
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analytics.dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#888" opacity={0.3} />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(value) => new Date(value).toLocaleDateString(undefined, { weekday: 'short' })}
                  stroke="#888"
                />
                <YAxis stroke="#888" />
                <Tooltip 
                  content={<CustomTooltip />}
                  labelFormatter={(value) => new Date(value).toLocaleDateString()}
                  formatter={(value: number, name: string) => [
                    selectedMetric === 'hours' ? `${value} hours` : `${value} sessions`,
                    selectedMetric === 'hours' ? 'Time Spent' : 'Sessions'
                  ]}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey={selectedMetric}
                  stroke={selectedMetric === 'hours' ? COLORS[0] : COLORS[1]}
                  strokeWidth={2}
                  activeDot={{ r: 8, fill: selectedMetric === 'hours' ? COLORS[0] : COLORS[1] }}
                  dot={{ r: 3, fill: selectedMetric === 'hours' ? COLORS[0] : COLORS[1] }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </Card>

      {/* Progress by Difficulty - Improved for dark mode */}
      <Card className="border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <div className="p-2.5 bg-amber-100 dark:bg-amber-900/50 rounded-full shadow-sm">
              <TrendingUp className="w-5 h-5 text-amber-600 dark:text-amber-400" strokeWidth={2} />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Progress by Difficulty</h2>
          </div>
          
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.difficultyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#888" opacity={0.3} />
                <XAxis dataKey="name" stroke="#888" />
                <YAxis stroke="#888" />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar
                  dataKey="progress"
                  name="Avg. Progress %"
                  fill={COLORS[2]}
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="count"
                  name="Number of Items"
                  fill={COLORS[3]}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </Card>

      {/* Yearly Activity Heatmap - Enhanced appearance */}
      <Card className="border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <div className="p-2.5 bg-blue-100 dark:bg-blue-900/50 rounded-full shadow-sm">
              <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" strokeWidth={2} />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Learning Insights</h2>
          </div>
          <YearlyActivityStats />
        </div>
      </Card>
    </div>
  );
}
