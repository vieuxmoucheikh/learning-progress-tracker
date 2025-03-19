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
import { useMemo, useState } from "react";
import { Brain, Target, TrendingUp, CheckCircle, BookOpen, PieChart as PieChartIcon, BarChart3, Calendar, Lightbulb, AlertCircle } from "lucide-react";
import LearningGoals from './LearningGoals';
import { YearlyActivityStats } from './YearlyActivityStats';
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton"; 
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface AnalyticsTabProps {
  items: LearningItem[];
  isLoading?: boolean;
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

// Composant extrait pour TimeByCategory
const TimeByCategory = ({ categoryData }: { categoryData: any[] }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={categoryData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={100}
              label={({ name, percentage }) => `${name}: ${percentage}%`}
              aria-label="Temps par catégorie"
            >
              {categoryData.map((_, index) => (
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
          {categoryData.map((category, index) => (
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
                    aria-valuenow={category.percentage}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    role="progressbar"
                    aria-label={`Pourcentage pour ${category.name}`}
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
  );
};

// Ajout des interfaces pour typer correctement les données
interface DailyData {
  date: string;
  hours: number;
  sessions: number;
}

interface CategoryData {
  name: string;
  value: number;
  minutes: number;
  itemCount: number;
  percentage: number;
}

interface AnalyticsData {
  categoryData: CategoryData[];
  difficultyData: Array<{
    name: string;
    progress: number;
    count: number;
  }>;
  dailyData: DailyData[];
  completionMetrics: Record<string, number>;
  focusMetrics: Array<{
    subject: string;
    value: number;
  }>;
}

// Composant pour les recommandations basées sur les données
const InsightsSection = ({ analytics, items }: { analytics: AnalyticsData, items: LearningItem[] }) => {
  // Génération d'insights basés sur les données
  const insights = useMemo(() => {
    const insights = [];
    
    // Insight sur la régularité
    const activeRatio = analytics.dailyData.filter((d: DailyData) => d.hours > 0).length / 14;
    if (activeRatio < 0.3) {
      insights.push({
        type: "improvement",
        title: "Améliorez votre régularité",
        description: "Essayez d'apprendre plus régulièrement, même pour de courtes sessions.",
        icon: <Calendar className="h-5 w-5 text-amber-500" />
      });
    } else if (activeRatio > 0.7) {
      insights.push({
        type: "strength",
        title: "Excellente régularité",
        description: "Vous maintenez une bonne régularité dans votre apprentissage.",
        icon: <CheckCircle className="h-5 w-5 text-green-500" />
      });
    }
    
    // Insight sur l'équilibre des catégories
    const dominantCategory = analytics.categoryData[0];
    if (dominantCategory && dominantCategory.percentage > 70) {
      insights.push({
        type: "insight",
        title: "Diversifiez votre apprentissage",
        description: `${dominantCategory.name} représente ${dominantCategory.percentage}% de votre temps. Envisagez d'explorer d'autres sujets.`,
        icon: <BookOpen className="h-5 w-5 text-blue-500" />
      });
    }
    
    // Insight sur les items non démarrés
    const notStartedCount = items.filter(item => item.status === "not_started").length;
    if (notStartedCount > 5) {
      insights.push({
        type: "action",
        title: "Items en attente",
        description: `Vous avez ${notStartedCount} items non démarrés. Essayez d'en démarrer un aujourd'hui.`,
        icon: <Lightbulb className="h-5 w-5 text-indigo-500" />
      });
    }
    
    return insights;
  }, [analytics, items]);
  
  if (insights.length === 0) return null;
  
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Recommandations personnalisées</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {insights.map((insight, index) => (
          <Card key={index} className="overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900/50 dark:to-gray-800/50">
            <CardContent className="p-4 flex items-start gap-4">
              <div className="mt-1 p-2 rounded-full bg-white dark:bg-gray-800 shadow-sm">
                {insight.icon}
              </div>
              <div>
                <h4 className="font-medium">{insight.title}</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{insight.description}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export function AnalyticsTab({ items, isLoading = false }: AnalyticsTabProps) {
  const [activeTab, setActiveTab] = useState<'charts' | 'insights'>('charts');

  const analytics = useMemo<AnalyticsData>(() => {
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
          .filter(session => session.startTime?.startsWith(dateStr));
        
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

  // État de chargement
  if (isLoading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {Array(4).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-96 lg:col-span-2" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  // Message lorsqu'il n'y a pas de données
  if (items.length === 0) {
    return (
      <div className="space-y-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
          Learning Analytics
        </h1>
        <Alert className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <AlertTitle>Pas encore de données</AlertTitle>
          <AlertDescription>
            Ajoutez des activités d'apprentissage pour commencer à visualiser vos statistiques.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

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

      {/* Onglets pour basculer entre les graphiques et les insights */}
      <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('charts')}
          className={cn(
            "px-4 py-2 rounded-md text-sm font-medium transition-colors",
            activeTab === 'charts' 
              ? "bg-white dark:bg-gray-700 shadow-sm" 
              : "hover:bg-white/50 dark:hover:bg-gray-700/50"
          )}
        >
          Graphiques
        </button>
        <button
          onClick={() => setActiveTab('insights')}
          className={cn(
            "px-4 py-2 rounded-md text-sm font-medium transition-colors",
            activeTab === 'insights' 
              ? "bg-white dark:bg-gray-700 shadow-sm" 
              : "hover:bg-white/50 dark:hover:bg-gray-700/50"
          )}
        >
          Recommandations
        </button>
      </div>

      {/* Learning Goals - Design amélioré */}
      <Card className="p-6 overflow-hidden relative border-0 shadow-md hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-950/40 dark:to-indigo-900/40 border-indigo-100 dark:border-indigo-800/30">
        <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-indigo-500 to-indigo-600"></div>
        <CardHeader className="px-0 pt-0">
          <CardTitle className="text-xl flex items-center gap-3">
            <div className="p-2.5 bg-indigo-100 dark:bg-indigo-900/50 rounded-full shadow-sm">
              <Target className="w-5 h-5 text-indigo-600 dark:text-indigo-400" strokeWidth={2} />
            </div>
            <span className="bg-gradient-to-r from-indigo-600 to-indigo-800 dark:from-indigo-400 dark:to-indigo-300 bg-clip-text text-transparent">
              Learning Goals
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <LearningGoals items={items} />
        </CardContent>
      </Card>

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

      {activeTab === 'charts' ? (
        /* Charts Grid */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Time by Category */}
          <Card className="p-6 hover:shadow-md transition-shadow lg:col-span-2">
            <div className="flex items-center gap-2 mb-6">
              <div className="p-1.5 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                <PieChartIcon className="w-5 h-5 text-blue-500 dark:text-blue-400" />
              </div>
              <h2 className="text-lg font-semibold">Time Spent by Category</h2>
            </div>
            <TimeByCategory categoryData={analytics.categoryData} />
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
                    aria-label="Graphique radar des compétences d'apprentissage"
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
                <LineChart data={analytics.dailyData} aria-label="Graphique d'activité quotidienne des 14 derniers jours">
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
                <BarChart data={analytics.difficultyData} aria-label="Graphique de progression par niveau de difficulté">
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
      ) : (
        /* Insights Section */
        <div className="space-y-8">
          <InsightsSection analytics={analytics} items={items} />
          
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
      )}
    </div>
  );
}
