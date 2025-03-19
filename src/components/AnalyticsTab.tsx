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
import { useEffect, useMemo, useState } from "react";
import { Brain, Target, TrendingUp, CheckCircle, BookOpen, PieChart as PieChartIcon, BarChart3, Calendar, Lightbulb } from "lucide-react";
import LearningGoals from './LearningGoals';
import { YearlyActivityStats } from './YearlyActivityStats';
import { cn } from "@/lib/utils";
import '../styles/analytics-charts.css'; // Importation des styles spécifiques aux graphiques
import '../styles/mobile-analytics-fixes.css'; // Importation des corrections pour mobile

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

// Couleurs plus vives pour le mode sombre
const DARK_MODE_COLORS = [
  "#60A5FA", // blue-400
  "#34D399", // emerald-400
  "#FBBF24", // amber-400
  "#F87171", // red-400
  "#A78BFA", // violet-400
  "#F472B6", // pink-400
  "#2DD4BF", // teal-400
  "#818CF8", // indigo-400
  "#FB923C", // orange-400
];

const DIFFICULTY_COLORS = {
  easy: "#10B981",
  medium: "#F59E0B",
  hard: "#EF4444"
};

const DARK_DIFFICULTY_COLORS = {
  easy: "#34D399",
  medium: "#FBBF24",
  hard: "#F87171"
};

// Composant de tooltip personnalisé
const CustomTooltip = ({ active, payload, label, isDarkMode }: any) => {
  if (!active || !payload || !payload.length) return null;
  
  return (
    <div className={`analytics-tooltip ${isDarkMode ? 'dark-tooltip' : 'light-tooltip'} p-3 rounded-lg shadow-lg`}>
      <p className={`font-medium mb-1 ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>
        {typeof label === 'string' && label.includes('-') 
          ? new Date(label).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })
          : label}
      </p>
      {payload.map((entry: any, index: number) => (
        <div key={`tooltip-item-${index}`} className="flex items-center gap-2 my-1">
          <div 
            className="w-3 h-3 rounded-full" 
            style={{ backgroundColor: entry.color }}
          />
          <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            <span className="font-medium">{entry.name}: </span>
            {entry.value} {entry.unit || ''}
          </p>
        </div>
      ))}
    </div>
  );
};

export function AnalyticsTab({ items }: AnalyticsTabProps) {
  // Détecter le mode sombre avec mise à jour réactive
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  // Observer les changements du thème
  useEffect(() => {
    const checkTheme = () => {
      const isDark = document.documentElement.classList.contains('dark') || 
                    document.documentElement.getAttribute('data-theme') === 'dark';
      setIsDarkMode(isDark);
    };
    
    // Vérifier au chargement
    checkTheme();
    
    // Observer les changements de classe sur l'élément HTML
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { 
      attributes: true, 
      attributeFilter: ['class', 'data-theme'] 
    });
    
    return () => observer.disconnect();
  }, []);
  
  // Choisir la palette de couleurs en fonction du mode
  const currentColors = isDarkMode ? DARK_MODE_COLORS : COLORS;
  const currentDifficultyColors = isDarkMode ? DARK_DIFFICULTY_COLORS : DIFFICULTY_COLORS;
  
  // Détecter si on est sur mobile pour adapter certains paramètres de graphiques
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  // Observer les changements de taille d'écran
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Le reste de la logique reste inchangée
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
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-50">
          Learning Analytics
        </h1>
        <p className="text-gray-600 dark:text-gray-300 text-lg">
          Visualisez vos progrès et identifiez vos tendances d'apprentissage
        </p>
      </div>

      {/* Learning Goals - Design amélioré */}
      <Card className="p-6 overflow-hidden relative border-0 shadow-md hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-950/40 dark:to-indigo-900/40 border-indigo-100 dark:border-indigo-800/30">
        <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-indigo-500 to-indigo-600 dark:from-indigo-400 dark:to-indigo-500"></div>
        <CardHeader className="px-0 pt-0">
          <CardTitle className="text-xl flex items-center gap-3">
            <div className="p-2.5 bg-indigo-100 dark:bg-indigo-800/50 rounded-full shadow-sm">
              <Target className="w-5 h-5 text-indigo-600 dark:text-indigo-300" strokeWidth={2} />
            </div>
            <span className="bg-gradient-to-r from-indigo-600 to-indigo-800 dark:from-indigo-300 dark:to-indigo-200 bg-clip-text text-transparent">
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
          "dark:from-blue-900/30 dark:to-blue-800/30"
        )}>
          <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-blue-500 to-blue-600 dark:from-blue-400 dark:to-blue-500"></div>
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">Total Learning Time</h3>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-50">
                {Math.round(analytics.categoryData.reduce((sum, cat) => sum + cat.value, 0))}h
              </p>
            </div>
            <div className="p-2.5 bg-blue-100 dark:bg-blue-800/50 rounded-full shadow-sm">
              <Brain className="w-5 h-5 text-blue-600 dark:text-blue-300" strokeWidth={2} />
            </div>
          </div>
        </Card>

        <Card className={cn(
          "p-5 hover:shadow-md transition-all duration-300 border-0 shadow-md",
          "overflow-hidden relative bg-gradient-to-br from-green-50 to-green-100",
          "dark:from-green-900/30 dark:to-green-800/30"
        )}>
          <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-green-500 to-green-600 dark:from-green-400 dark:to-green-500"></div>
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-sm font-medium text-green-700 dark:text-green-300 mb-1">Completion Rate</h3>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-50">
                {Math.round((analytics.completionMetrics.completed || 0) / items.length * 100)}%
              </p>
            </div>
            <div className="p-2.5 bg-green-100 dark:bg-green-800/50 rounded-full shadow-sm">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-300" strokeWidth={2} />
            </div>
          </div>
        </Card>

        <Card className={cn(
          "p-5 hover:shadow-md transition-all duration-300 border-0 shadow-md",
          "overflow-hidden relative bg-gradient-to-br from-amber-50 to-amber-100",
          "dark:from-amber-900/30 dark:to-amber-800/30"
        )}>
          <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-amber-500 to-amber-600 dark:from-amber-400 dark:to-amber-500"></div>
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-sm font-medium text-amber-700 dark:text-amber-300 mb-1">Active Days</h3>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-50">
                {analytics.dailyData.filter(d => d.hours > 0).length}/14
              </p>
            </div>
            <div className="p-2.5 bg-amber-100 dark:bg-amber-800/50 rounded-full shadow-sm">
              <TrendingUp className="w-5 h-5 text-amber-600 dark:text-amber-300" strokeWidth={2} />
            </div>
          </div>
        </Card>
        
        <Card className={cn(
          "p-5 hover:shadow-md transition-all duration-300 border-0 shadow-md",
          "overflow-hidden relative bg-gradient-to-br from-purple-50 to-purple-100",
          "dark:from-purple-900/30 dark:to-purple-800/30"
        )}>
          <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-purple-500 to-purple-600 dark:from-purple-400 dark:to-purple-500"></div>
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-sm font-medium text-purple-700 dark:text-purple-300 mb-1">Categories</h3>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-50">
                {analytics.categoryData.length}
              </p>
            </div>
            <div className="p-2.5 bg-purple-100 dark:bg-purple-800/50 rounded-full shadow-sm">
              <BookOpen className="w-5 h-5 text-purple-600 dark:text-purple-300" strokeWidth={2} />
            </div>
          </div>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Time by Category */}
        <Card className={`p-4 sm:p-6 hover:shadow-md transition-shadow lg:col-span-2 border border-gray-200 dark:border-gray-700 ${isMobile ? 'analytics-card-mobile' : ''}`}>
          <div className="flex items-center gap-2 mb-4 sm:mb-6">
            <div className="p-1.5 bg-blue-50 dark:bg-blue-900/50 rounded-lg">
              <PieChartIcon className="w-5 h-5 text-blue-500 dark:text-blue-300" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">Time Spent by Category</h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <div className="h-[250px] sm:h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                  <Pie
                    data={analytics.categoryData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={isMobile ? 80 : 100}
                    fill="#8884d8"
                    label={isMobile ? undefined : ({ name, percentage }) => `${name}: ${percentage}%`}
                    labelLine={!isMobile}
                    stroke={isDarkMode ? "#374151" : "#f3f4f6"}
                    strokeWidth={isDarkMode ? 1 : 0.5}
                    animationDuration={1000}
                    animationBegin={200}
                    animationEasing="ease-out"
                  >
                    {analytics.categoryData.map((_, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={currentColors[index % currentColors.length]}
                        style={{ filter: isDarkMode ? 'brightness(1.2)' : 'none' }}
                      />
                    ))}
                  </Pie>
                  <Tooltip 
                    content={<CustomTooltip isDarkMode={isDarkMode} />}
                    wrapperStyle={{ zIndex: 1000 }}
                  />
                  <Legend 
                    formatter={(value) => <span style={{ color: isDarkMode ? '#e5e7eb' : '#374151' }}>{value}</span>}
                    iconType="circle"
                    layout={isMobile ? "horizontal" : "vertical"}
                    verticalAlign={isMobile ? "bottom" : "middle"}
                    align={isMobile ? "center" : "right"}
                    wrapperStyle={isMobile ? { bottom: 0 } : { right: 10, top: '50%', transform: 'translate(0, -50%)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-300">Category Breakdown</h3>
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
                {analytics.categoryData.map((category, index) => (
                  <div key={category.name} className="flex items-center gap-3">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ 
                        backgroundColor: currentColors[index % currentColors.length],
                        boxShadow: isDarkMode ? '0 0 5px rgba(255, 255, 255, 0.2)' : 'none'
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center text-sm">
                        <span className="font-medium truncate text-gray-800 dark:text-gray-200">{category.name}</span>
                        <span className="text-gray-600 dark:text-gray-400">
                          {category.value}h ({category.percentage}%)
                        </span>
                      </div>
                      <div className="mt-1 w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5">
                        <div
                          className="h-1.5 rounded-full transition-all duration-500"
                          style={{
                            width: `${category.percentage}%`,
                            backgroundColor: currentColors[index % currentColors.length],
                            boxShadow: isDarkMode ? `0 0 4px ${currentColors[index % currentColors.length]}` : 'none'
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
        <Card className={`p-4 sm:p-6 hover:shadow-md transition-shadow border border-gray-200 dark:border-gray-700 ${isMobile ? 'analytics-card-mobile' : ''}`}>
          <div className="flex items-center gap-2 mb-4 sm:mb-6">
            <div className="p-1.5 bg-indigo-50 dark:bg-indigo-900/50 rounded-lg">
              <Target className="w-5 h-5 text-indigo-500 dark:text-indigo-300" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">Learning Focus</h2>
          </div>
          <div className="h-[250px] sm:h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart 
                cx="50%" 
                cy="50%" 
                outerRadius="80%" 
                data={analytics.focusMetrics}
                margin={{ top: 10, right: 30, bottom: 10, left: 30 }}
              >
                <PolarGrid stroke={isDarkMode ? "#4b5563" : "#e5e7eb"} />
                <PolarAngleAxis 
                  dataKey="subject" 
                  tick={{ fill: isDarkMode ? "#e5e7eb" : "#374151" }}
                  stroke={isDarkMode ? "#6b7280" : "#9ca3af"}
                />
                <PolarRadiusAxis 
                  angle={30} 
                  domain={[0, 100]} 
                  tick={{ fill: isDarkMode ? "#e5e7eb" : "#374151" }}
                  stroke={isDarkMode ? "#6b7280" : "#d1d5db"}
                  tickCount={5}
                />
                <Radar
                  name="Learning Focus"
                  dataKey="value"
                  stroke={isDarkMode ? "#a78bfa" : "#8b5cf6"}
                  fill={isDarkMode ? "#a78bfa" : "#8b5cf6"}
                  fillOpacity={0.6}
                  animationDuration={1200}
                  animationBegin={300}
                />
                <Tooltip 
                  content={<CustomTooltip isDarkMode={isDarkMode} />}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Daily Activity */}
        <Card className={`p-4 sm:p-6 hover:shadow-md transition-shadow lg:col-span-2 border border-gray-200 dark:border-gray-700 ${isMobile ? 'analytics-card-mobile' : ''}`}>
          <div className="flex items-center gap-2 mb-4 sm:mb-6">
            <div className="p-1.5 bg-green-50 dark:bg-green-900/50 rounded-lg">
              <BarChart3 className="w-5 h-5 text-green-500 dark:text-green-300" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">Daily Activity (Past 14 Days)</h2>
          </div>
          <div className="h-[250px] sm:h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart 
                data={analytics.dailyData}
                margin={{ top: 20, right: 30, bottom: 10, left: 0 }}
              >
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke={isDarkMode ? "#374151" : "#e5e7eb"}
                />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) => new Date(value).toLocaleDateString(undefined, { weekday: 'short' })}
                  stroke={isDarkMode ? "#9ca3af" : "#6b7280"}
                  tick={{ fill: isDarkMode ? "#e5e7eb" : "#374151" }}
                  padding={{ left: 10, right: 10 }}
                />
                <YAxis 
                  yAxisId="left" 
                  stroke={isDarkMode ? "#9ca3af" : "#6b7280"}
                  tick={{ fill: isDarkMode ? "#e5e7eb" : "#374151" }}
                  tickMargin={8}
                />
                <YAxis 
                  yAxisId="right" 
                  orientation="right" 
                  stroke={isDarkMode ? "#9ca3af" : "#6b7280"}
                  tick={{ fill: isDarkMode ? "#e5e7eb" : "#374151" }}
                  tickMargin={8}
                />
                <Tooltip
                  content={<CustomTooltip isDarkMode={isDarkMode} />}
                />
                <Legend 
                  wrapperStyle={{ paddingTop: '10px' }}
                  formatter={(value) => <span style={{ color: isDarkMode ? '#e5e7eb' : '#374151' }}>{value}</span>}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="hours"
                  name="Hours Spent"
                  stroke={currentColors[0]}
                  activeDot={{ r: 8 }}
                  strokeWidth={isDarkMode ? 3 : 2}
                  dot={{ fill: currentColors[0], strokeWidth: 1, r: 4 }}
                  animationDuration={1500}
                  animationBegin={200}
                  animationEasing="ease-in-out"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="sessions"
                  name="Sessions"
                  stroke={currentColors[1]}
                  activeDot={{ r: 8 }}
                  strokeWidth={isDarkMode ? 3 : 2}
                  dot={{ fill: currentColors[1], strokeWidth: 1, r: 4 }}
                  animationDuration={1500}
                  animationBegin={400}
                  animationEasing="ease-in-out"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Progress by Difficulty */}
        <Card className={`p-4 sm:p-6 hover:shadow-md transition-shadow border border-gray-200 dark:border-gray-700 ${isMobile ? 'analytics-card-mobile' : ''}`}>
          <div className="flex items-center gap-2 mb-4 sm:mb-6">
            <div className="p-1.5 bg-amber-50 dark:bg-amber-900/50 rounded-lg">
              <TrendingUp className="w-5 h-5 text-amber-500 dark:text-amber-300" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">Progress by Difficulty</h2>
          </div>
          <div className="h-[250px] sm:h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={analytics.difficultyData}
                margin={{ top: 20, right: 30, left: 0, bottom: 10 }}
              >
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke={isDarkMode ? "#374151" : "#e5e7eb"}
                />
                <XAxis 
                  dataKey="name" 
                  stroke={isDarkMode ? "#9ca3af" : "#6b7280"}
                  tick={{ fill: isDarkMode ? "#e5e7eb" : "#374151" }}
                  tickMargin={10}
                />
                <YAxis 
                  stroke={isDarkMode ? "#9ca3af" : "#6b7280"}
                  tick={{ fill: isDarkMode ? "#e5e7eb" : "#374151" }}
                  tickMargin={8}
                />
                <Tooltip 
                  content={<CustomTooltip isDarkMode={isDarkMode} />}
                />
                <Legend 
                  wrapperStyle={{ paddingTop: '10px' }}
                  formatter={(value) => <span style={{ color: isDarkMode ? '#e5e7eb' : '#374151' }}>{value}</span>}
                />
                <Bar
                  dataKey="progress"
                  name="Avg. Progress %"
                  fill={currentColors[2]}
                  radius={[4, 4, 0, 0]}
                  animationDuration={1200}
                  animationBegin={200}
                  animationEasing="ease-out"
                />
                <Bar
                  dataKey="count"
                  name="Number of Items"
                  fill={currentColors[3]} 
                  radius={[4, 4, 0, 0]}
                  animationDuration={1200}
                  animationBegin={400}
                  animationEasing="ease-out"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Yearly Activity Heatmap */}
      <Card className={`p-4 sm:p-6 hover:shadow-md transition-shadow border border-gray-200 dark:border-gray-700 yearly-activity-card ${isMobile ? 'analytics-card-mobile' : ''}`}>
        <div className="flex items-center gap-2 mb-4 sm:mb-6">
          <div className="p-1.5 bg-blue-50 dark:bg-blue-900/50 rounded-lg">
            <Calendar className="w-5 h-5 text-blue-500 dark:text-blue-300" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">Learning Insights</h2>
        </div>
        <YearlyActivityStats />
      </Card>
    </div>
  );
}
