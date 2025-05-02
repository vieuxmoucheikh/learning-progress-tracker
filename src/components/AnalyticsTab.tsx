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
import { useMemo, useState, useCallback, useEffect } from "react";
import { Brain, Target, TrendingUp, CheckCircle, BookOpen, PieChart as PieChartIcon, BarChart3, Calendar, Lightbulb, AlertCircle, CalendarRange, Filter, SlidersHorizontal } from "lucide-react";
import LearningGoals from './LearningGoals';
import { YearlyActivityStats } from './YearlyActivityStats';
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton"; 
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ErrorBoundary } from "./ErrorBoundary";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { subDays, subMonths, startOfYear, isAfter, format } from "date-fns";

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
              labelLine={{ stroke: 'rgba(156, 163, 175, 0.5)', strokeWidth: 1 }}
              aria-label="Temps par catégorie"
            >
              {categoryData.map((_, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={COLORS[index % COLORS.length]} 
                  stroke="rgba(255, 255, 255, 0.2)"
                  strokeWidth={1}
                />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value: number, name: string, entry: any) => [
                `${value}h (${entry.payload.percentage}%)`,
                `${name} (${entry.payload.itemCount} items)`
              ]}
              contentStyle={{ 
                backgroundColor: 'rgba(31, 41, 55, 0.9)',
                borderColor: 'rgba(107, 114, 128, 0.4)',
                borderRadius: '0.375rem',
                color: 'rgba(243, 244, 246, 1)',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
              }}
              itemStyle={{ color: 'rgba(243, 244, 246, 1)' }}
              labelStyle={{ color: 'rgba(243, 244, 246, 0.7)' }}
            />
            <Legend 
              verticalAlign="bottom" 
              iconSize={10}
              wrapperStyle={{
                paddingTop: '20px',
                fontSize: '12px',
                color: 'rgba(156, 163, 175, 1)'
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-300">Category Breakdown</h3>
        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 dark:scrollbar-thin dark:scrollbar-thumb-gray-600 dark:scrollbar-track-gray-800/50">
          {categoryData.map((category, index) => (
            <div key={category.name} className="flex items-center gap-3 p-2 rounded-lg dark:bg-gray-800/50 hover:dark:bg-gray-800/80 transition-colors">
              <div 
                className="w-3 h-3 rounded-full shadow-sm" 
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-medium truncate text-gray-700 dark:text-gray-200">{category.name}</span>
                  <span className="text-gray-500 dark:text-gray-400 font-mono">
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
  
  if (insights.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-16 text-center">
        <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-full mb-4">
          <Lightbulb className="w-10 h-10 text-purple-500" />
        </div>
        <h3 className="text-xl font-bold mb-2">Pas encore de recommandations</h3>
        <p className="text-gray-500 dark:text-gray-400 max-w-md">
          Continuez à enregistrer vos activités d'apprentissage pour recevoir des recommandations personnalisées.
        </p>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium flex items-center gap-2">
        <Lightbulb className="h-5 w-5 text-purple-500" />
        <span>Recommandations personnalisées</span>
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {insights.map((insight, index) => (
          <Card key={index} className="overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900/50 dark:to-gray-800/50 hover:shadow-md transition-all">
            <CardContent className="p-5 flex items-start gap-4">
              <div className="mt-1 p-2.5 rounded-full bg-white dark:bg-gray-800 shadow">
                {insight.icon}
              </div>
              <div>
                <h4 className="font-medium text-base">{insight.title}</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{insight.description}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

// Nouveau composant pour les cartes résumées
const SummaryCard = ({ 
  title, 
  value, 
  subtitle,
  icon, 
  colorClass 
}: { 
  title: string; 
  value: string | number; 
  subtitle?: string;
  icon: React.ReactNode; 
  colorClass: string;
}) => {
  return (
    <Card className={cn(
      "p-5 hover:shadow-md transition-all duration-300 border-0 shadow-md",
      "overflow-hidden relative bg-gradient-to-br from-opacity-5 to-opacity-10",
      colorClass
    )}>
      <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-current to-current opacity-80"></div>
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-medium text-current dark:text-current/80 mb-1">{title}</h3>
          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {subtitle}
            </p>
          )}
        </div>
        <div className="p-2.5 bg-current/10 dark:bg-current/20 rounded-full shadow-sm">
          {icon}
        </div>
      </div>
    </Card>
  );
};

// Composant pour le radar focus
const FocusRadar = ({ focusMetrics }: { focusMetrics: Array<{ subject: string; value: number }> }) => {
  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={focusMetrics}>
          <PolarGrid stroke="rgba(156, 163, 175, 0.3)" />
          <PolarAngleAxis 
            dataKey="subject" 
            tick={{ fill: 'rgba(209, 213, 219, 1)', fontSize: 12 }}
            stroke="rgba(156, 163, 175, 0.4)"
          />
          <PolarRadiusAxis 
            angle={30} 
            domain={[0, 100]} 
            tick={{ fill: 'rgba(209, 213, 219, 0.8)', fontSize: 10 }}
            stroke="rgba(156, 163, 175, 0.3)"
            tickCount={5}
          />
          <Radar
            name="Learning Focus"
            dataKey="value"
            stroke="#8884d8"
            fill="#8884d8"
            fillOpacity={0.6}
            aria-label="Graphique radar des compétences d'apprentissage"
          />
          <Tooltip 
            formatter={(value: number) => [`${value}%`, 'Score']}
            contentStyle={{ 
              backgroundColor: 'rgba(31, 41, 55, 0.9)',
              borderColor: 'rgba(107, 114, 128, 0.4)',
              borderRadius: '0.375rem',
              color: 'rgba(243, 244, 246, 1)',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
            }}
            itemStyle={{ color: 'rgba(243, 244, 246, 1)' }}
            labelStyle={{ color: 'rgba(243, 244, 246, 0.7)' }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};

// Composant pour l'activité journalière
const DailyActivity = ({ dailyData }: { dailyData: DailyData[] }) => {
  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={dailyData} aria-label="Graphique d'activité quotidienne des 14 derniers jours">
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
  );
};

// Composant pour la progression par difficulté
const DifficultyProgress = ({ difficultyData }: { difficultyData: Array<{ name: string; progress: number; count: number }> }) => {
  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={difficultyData} aria-label="Graphique de progression par niveau de difficulté">
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
  );
};

// Définition des périodes de temps disponibles
const TIME_PERIODS = [
  { id: 'week', label: 'Last 7 days', getDates: () => ({ start: subDays(new Date(), 7), end: new Date() }) },
  { id: 'month', label: 'Last 30 days', getDates: () => ({ start: subDays(new Date(), 30), end: new Date() }) },
  { id: 'quarter', label: 'Last 3 months', getDates: () => ({ start: subMonths(new Date(), 3), end: new Date() }) },
  { id: 'year', label: 'This year', getDates: () => ({ start: startOfYear(new Date()), end: new Date() }) },
  { id: 'all', label: 'All time', getDates: () => ({ start: null, end: new Date() }) },
];

export function AnalyticsTab({ items, isLoading = false }: AnalyticsTabProps) {
  const [activeTab, setActiveTab] = useState<'charts' | 'insights'>('charts');
  const [hasError, setHasError] = useState<boolean>(false);
  const [timePeriod, setTimePeriod] = useState<string>('month'); // 'month' par défaut

  // Obtenir les dates de début et de fin pour le filtre de période
  const getFilterDates = () => {
    const period = TIME_PERIODS.find(p => p.id === timePeriod) || TIME_PERIODS[1]; // Default to 'month'
    return period.getDates();
  };

  // Filtrer les items en fonction de la période sélectionnée
  const filteredItems = useMemo(() => {
    const { start, end } = getFilterDates();
    
    if (!start) return items; // "All time"
    
    return items.filter(item => {
      // Vérifier les sessions récentes
      const hasSessions = item.progress?.sessions?.some(session => {
        const sessionDate = new Date(session.startTime || session.date || '');
        return !isNaN(sessionDate.getTime()) && isAfter(sessionDate, start);
      });
      
      // Vérifier la date de création si elle existe
      let isCreatedInRange = false;
      if ('created_at' in item) {
        // Utiliser assertion de type pour éviter l'erreur TS
        const createdAt = (item as any).created_at;
        if (createdAt && typeof createdAt === 'string') {
          const creationDate = new Date(createdAt);
          isCreatedInRange = !isNaN(creationDate.getTime()) && isAfter(creationDate, start);
        }
      }
      
      // Vérifier la date d'ajout (propriété plus standard)
      if ('date_added' in item) {
        const dateAdded = (item as any).date_added;
        if (dateAdded && typeof dateAdded === 'string') {
          const addedDate = new Date(dateAdded);
          isCreatedInRange = isCreatedInRange || (!isNaN(addedDate.getTime()) && isAfter(addedDate, start));
        }
      }
      
      return hasSessions || isCreatedInRange;
    });
  }, [items, timePeriod]);

  // Afficher la période active
  const activePeriodLabel = useMemo(() => {
    const period = TIME_PERIODS.find(p => p.id === timePeriod);
    if (!period) return '';
    
    const { start, end } = period.getDates();
    if (!start) return 'All time';
    
    return `${format(start, 'MMM d, yyyy')} - ${format(end, 'MMM d, yyyy')}`;
  }, [timePeriod]);

  const analytics = useMemo<AnalyticsData>(() => {
    try {
      // Utiliser filteredItems au lieu de items pour tous les calculs
      // Time spent per category (using actual session data)
      const categoryData = filteredItems.reduce((acc, item) => {
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
      const difficultyData = filteredItems.reduce((acc, item) => {
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
        
        const stats = filteredItems.reduce((acc, item) => {
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
      const completionMetrics = filteredItems.reduce((acc, item) => {
        const status = item.status || "not_started";
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Learning focus (radar chart data)
      const focusMetrics = {
        consistency: Math.min(100, (dailyData.filter(d => d.hours > 0).length / 14) * 100),
        completion: Math.min(100, (completionMetrics.completed || 0) / filteredItems.length * 100),
        diversity: Math.min(100, Object.keys(categoryData).length * 20),
        engagement: Math.min(100, dailyData.reduce((sum, d) => sum + d.sessions, 0) / 14 * 50),
        progress: Math.min(100, filteredItems.reduce((sum, item) => {
          const total = (item.progress?.total?.hours || 1) * 60 + (item.progress?.total?.minutes || 0);
          const current = (item.progress?.current?.hours || 0) * 60 + (item.progress?.current?.minutes || 0);
          return sum + (current / total) * 100;
        }, 0) / filteredItems.length)
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
    } catch (error) {
      console.error("Error calculating analytics:", error);
      setHasError(true);
      
      // Retourner des données vides en cas d'erreur
      return {
        categoryData: [],
        difficultyData: [],
        dailyData: [],
        completionMetrics: {},
        focusMetrics: []
      };
    }
  }, [filteredItems]); // Utiliser filteredItems au lieu de items

  // Handlers optimisés avec useCallback
  const switchToCharts = useCallback(() => setActiveTab('charts'), []);
  const switchToInsights = useCallback(() => setActiveTab('insights'), []);

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

  // Gestion des erreurs
  if (hasError) {
    return (
      <div className="space-y-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
          Learning Analytics
        </h1>
        <Alert className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
          <AlertTitle>Erreur lors du calcul des statistiques</AlertTitle>
          <AlertDescription>
            Une erreur s'est produite lors du traitement de vos données. Veuillez réessayer ou contacter le support.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const totalLearningHours = Math.round(analytics.categoryData.reduce((sum, cat) => sum + cat.value, 0));
  const completionRate = Math.round((analytics.completionMetrics.completed || 0) / items.length * 100);
  const activeDays = analytics.dailyData.filter(d => d.hours > 0).length;
  const categoriesCount = analytics.categoryData.length;

  return (
    <div className="space-y-8">
      {/* En-tête de la page - Adapté pour les deux modes */}
      <div className="flex flex-col space-y-2 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-gray-900/20 dark:to-gray-800/10 p-6 rounded-xl border border-blue-200/30 dark:border-gray-800/30 shadow-inner">
        <h1 className="text-3xl font-bold tracking-tight text-gray-800 dark:text-gray-50 drop-shadow-sm">
          Learning Analytics
        </h1>
        <p className="text-gray-600 dark:text-gray-300 text-lg max-w-3xl">
          Visualisez vos progrès et identifiez vos tendances d'apprentissage avec des données exploitables
        </p>
      </div>

      {/* Barre de contrôles */}
      <div className="flex flex-wrap gap-3 items-center justify-between bg-gray-100 dark:bg-gray-800/60 p-3 rounded-lg backdrop-blur-sm border border-gray-200 dark:border-gray-700/50 shadow-md">
        {/* Onglets pour basculer entre les graphiques et les insights */}
        <div className="flex space-x-1 bg-white/80 dark:bg-gray-900/70 p-1 rounded-lg w-fit z-10 shadow-sm">
          <button
            onClick={switchToCharts}
            className={cn(
              "px-5 py-2 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-2 relative",
              activeTab === 'charts' 
                ? "bg-white dark:bg-gray-700 shadow-md text-blue-600 dark:text-blue-300 ring-4 ring-blue-50 dark:ring-blue-500/30" 
                : "hover:bg-blue-50 dark:hover:bg-gray-700/50 text-gray-600 dark:text-gray-300 active:bg-blue-100 dark:active:bg-gray-700/70"
            )}
            aria-pressed={activeTab === 'charts'}
            aria-label="Afficher les graphiques"
          >
            <BarChart3 className={cn(
              "w-4 h-4 transition-transform", 
              activeTab === 'charts' ? "text-blue-500 dark:text-blue-300 transform scale-125" : "text-gray-600 dark:text-gray-400"
            )} />
            <span className={cn(
              activeTab === 'charts' ? "font-bold" : "font-medium"
            )}>Graphiques</span>
            {activeTab === 'charts' && (
              <span className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2/3 h-1 bg-blue-500 dark:bg-blue-400 rounded-full" />
            )}
          </button>
          <button
            onClick={switchToInsights}
            className={cn(
              "px-5 py-2 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-2 relative",
              activeTab === 'insights' 
                ? "bg-white dark:bg-gray-700 shadow-md text-purple-600 dark:text-purple-300 ring-4 ring-purple-50 dark:ring-purple-500/30" 
                : "hover:bg-purple-50 dark:hover:bg-gray-700/50 text-gray-600 dark:text-gray-300 active:bg-purple-100 dark:active:bg-gray-700/70"
            )}
            aria-pressed={activeTab === 'insights'}
            aria-label="Afficher les recommandations"
          >
            <Lightbulb className={cn(
              "w-4 h-4 transition-transform", 
              activeTab === 'insights' ? "text-purple-500 dark:text-purple-300 transform scale-125" : "text-gray-600 dark:text-gray-400"
            )} />
            <span className={cn(
              activeTab === 'insights' ? "font-bold" : "font-medium"
            )}>Recommandations</span>
            {activeTab === 'insights' && (
              <span className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2/3 h-1 bg-purple-500 dark:bg-purple-400 rounded-full" />
            )}
          </button>
        </div>

        {/* Sélecteur de période */}
        <div className="flex items-center gap-3 bg-white dark:bg-gray-800 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700/70">
          <div className="flex items-center text-sm text-gray-600 dark:text-gray-300 gap-1.5 font-medium">
            <CalendarRange className="h-4 w-4 text-blue-500 dark:text-blue-400" />
            <span className="hidden sm:inline">{activePeriodLabel}</span>
          </div>
          <Select value={timePeriod} onValueChange={setTimePeriod}>
            <SelectTrigger className="w-32 sm:w-40 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <Filter className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400" />
                <SelectValue placeholder="Time period" />
              </div>
            </SelectTrigger>
            <SelectContent>
              {TIME_PERIODS.map((period) => (
                <SelectItem key={period.id} value={period.id}>
                  {period.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Learning Goals - Design amélioré */}
      <ErrorBoundary fallback={<p>Erreur lors du chargement des objectifs</p>}>
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
      </ErrorBoundary>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-5">
        <SummaryCard 
          title="Total Learning Time" 
          value={`${totalLearningHours}h`}
          subtitle={timePeriod !== 'all' ? `during selected period` : undefined}
          icon={<Brain className="w-5 h-5 text-blue-600 dark:text-blue-400" strokeWidth={2} />}
          colorClass="text-blue-600 from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20"
        />
        
        <SummaryCard 
          title="Completion Rate" 
          value={`${completionRate}%`}
          icon={<CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" strokeWidth={2} />}
          colorClass="text-green-600 from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20"
        />
        
        <SummaryCard 
          title="Active Days" 
          value={`${activeDays}/14`}
          icon={<TrendingUp className="w-5 h-5 text-amber-600 dark:text-amber-400" strokeWidth={2} />}
          colorClass="text-amber-600 from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20"
        />
        
        <SummaryCard 
          title="Categories" 
          value={categoriesCount}
          icon={<BookOpen className="w-5 h-5 text-purple-600 dark:text-purple-400" strokeWidth={2} />}
          colorClass="text-purple-600 from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20"
        />
      </div>

      {/* Contenu conditionnel selon l'onglet actif */}
      {activeTab === 'charts' ? (
        <div className="space-y-8">
          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Time by Category */}
            <ErrorBoundary fallback={<p className="text-red-500">Erreur d'affichage du graphique de catégories</p>}>
              <Card className="p-6 hover:shadow-md transition-shadow lg:col-span-2">
                <div className="flex items-center gap-2 mb-6">
                  <div className="p-1.5 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                    <PieChartIcon className="w-5 h-5 text-blue-500 dark:text-blue-400" />
                  </div>
                  <h2 className="text-lg font-semibold">Time Spent by Category</h2>
                </div>
                <TimeByCategory categoryData={analytics.categoryData} />
              </Card>
            </ErrorBoundary>

            {/* Learning Focus */}
            <ErrorBoundary fallback={<p className="text-red-500">Erreur d'affichage du graphique radar</p>}>
              <Card className="p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-2 mb-6">
                  <div className="p-1.5 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
                    <Target className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
                  </div>
                  <h2 className="text-lg font-semibold">Learning Focus</h2>
                </div>
                <FocusRadar focusMetrics={analytics.focusMetrics} />
              </Card>
            </ErrorBoundary>

            {/* Daily Activity */}
            <ErrorBoundary fallback={<p className="text-red-500">Erreur d'affichage de l'activité quotidienne</p>}>
              <Card className="p-6 hover:shadow-md transition-shadow lg:col-span-2">
                <div className="flex items-center gap-2 mb-6">
                  <div className="p-1.5 bg-green-50 dark:bg-green-900/30 rounded-lg">
                    <BarChart3 className="w-5 h-5 text-green-500 dark:text-green-400" />
                  </div>
                  <h2 className="text-lg font-semibold">Daily Activity (Past 14 Days)</h2>
                </div>
                <DailyActivity dailyData={analytics.dailyData} />
              </Card>
            </ErrorBoundary>

            {/* Progress by Difficulty */}
            <ErrorBoundary fallback={<p className="text-red-500">Erreur d'affichage de la progression par difficulté</p>}>
              <Card className="p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-2 mb-6">
                  <div className="p-1.5 bg-amber-50 dark:bg-amber-900/30 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-amber-500 dark:text-amber-400" />
                  </div>
                  <h2 className="text-lg font-semibold">Progress by Difficulty</h2>
                </div>
                <DifficultyProgress difficultyData={analytics.difficultyData} />
              </Card>
            </ErrorBoundary>
          </div>

          {/* Yearly Activity Heatmap */}
          <ErrorBoundary fallback={<p className="text-red-500">Erreur lors du chargement de l'activité annuelle</p>}>
            <Card className="p-4 md:p-6 hover:shadow-md transition-shadow overflow-hidden">
              <div className="flex items-center gap-2 mb-4 md:mb-6">
                <div className="p-1.5 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                  <Calendar className="w-5 h-5 text-blue-500 dark:text-blue-400" />
                </div>
                <h2 className="text-lg font-semibold">Yearly Activity Calendar</h2>
              </div>
              <div className="bg-white dark:bg-gray-800/30 rounded-md shadow-sm">
                <YearlyActivityStats />
              </div>
            </Card>
          </ErrorBoundary>
        </div>
      ) : (
        /* Onglet Recommandations */
        <ErrorBoundary fallback={<p className="text-red-500">Erreur lors du chargement des recommandations</p>}>
          <InsightsSection analytics={analytics} items={items} />
        </ErrorBoundary>
      )}
    </div>
  );
}
