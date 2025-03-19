import React, { useState, useEffect, useMemo } from 'react';
import { getLearningActivity } from '@/lib/database';
import { YearlyActivityHeatmap } from './YearlyActivityHeatmap';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Activity, Calendar as CalendarIcon, BarChart2 } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { cn } from '@/lib/utils';

interface ActivityData {
  date: string;
  count: number;
  category?: string;
}

export function YearlyActivityStats() {
  const [activityData, setActivityData] = useState<ActivityData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const { toast } = useToast();
  
  // Détection du mode sombre
  const isDarkMode = 
    typeof document !== 'undefined' && 
    (document.documentElement.classList.contains('dark') || 
    document.documentElement.getAttribute('data-theme') === 'dark');

  // Palette de couleurs améliorée pour les graphiques en mode sombre
  const chartColors = {
    light: {
      background: '#ffffff',
      text: '#111827',
      border: '#e5e7eb',
      cardBackground: '#f9fafb',
      statBackground: {
        blue: 'from-blue-50 to-blue-100 border-blue-200/50',
        emerald: 'from-emerald-50 to-emerald-100 border-emerald-200/50',
        purple: 'from-purple-50 to-purple-100 border-purple-200/50'
      },
      statText: {
        blue: 'text-blue-500',
        emerald: 'text-emerald-500',
        purple: 'text-purple-500'
      }
    },
    dark: {
      background: '#1f2937',
      text: '#f9fafb',
      border: '#374151',
      cardBackground: '#111827',
      statBackground: {
        blue: 'from-blue-500/20 to-blue-600/20 border-blue-400/20',
        emerald: 'from-emerald-500/20 to-emerald-600/20 border-emerald-400/20',
        purple: 'from-purple-500/20 to-purple-600/20 border-purple-400/20'
      },
      statText: {
        blue: 'text-blue-300',
        emerald: 'text-emerald-300',
        purple: 'text-purple-300'
      }
    }
  };

  useEffect(() => {
    async function fetchActivityData() {
      try {
        const data = await getLearningActivity();
        setActivityData(data);
      } catch (error) {
        console.error('Failed to fetch activity data:', error);
        toast({
          title: "Error",
          description: "Failed to load activity data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }

    fetchActivityData();
  }, [toast]);

  const categories = useMemo(() => {
    const uniqueCategories = new Set<string>();
    activityData.forEach(item => {
      if (item.category) {
        uniqueCategories.add(item.category);
      }
    });
    return ['all', ...Array.from(uniqueCategories)];
  }, [activityData]);

  const handleCategoryChange = (value: string) => {
    setSelectedCategory(value);
  };

  const filteredData = useMemo(() => {
    if (selectedCategory === 'all') {
      return activityData;
    }
    return activityData.filter(item => item.category === selectedCategory);
  }, [activityData, selectedCategory]);

  // Filtrer les données en fonction de l'année sélectionnée
  const filteredDataByYear = useMemo(() => {
    return filteredData.filter(item => {
      const year = parseInt(item.date.substring(0, 4));
      return year === selectedYear;
    });
  }, [filteredData, selectedYear]);

  const heatmapData = useMemo(() => {
    if (filteredDataByYear.length === 0) return [];

    const dataMap = filteredDataByYear.reduce((acc, curr) => {
      const date = curr.date;
      acc[date] = (acc[date] || 0) + curr.count;
      return acc;
    }, {} as Record<string, number>);

    const data = Object.entries(dataMap).map(([date, value]) => ({
      date,
      count: value
    }));

    return data;
  }, [filteredDataByYear]);

  // Calcul des statistiques
  const stats = useMemo(() => {
    if (filteredData.length === 0) {
      return { totalActivities: 0, activeDays: 0, averagePerDay: '0' };
    }

    // Compter le nombre total d'activités
    const totalActivities = filteredData.reduce((sum, item) => sum + item.count, 0);

    // Compter le nombre de jours actifs uniques
    const uniqueDays = new Set(filteredData.map(item => item.date)).size;

    // Calculer la moyenne quotidienne
    const averagePerDay = (totalActivities / Math.max(1, uniqueDays)).toFixed(1);

    return {
      totalActivities,
      activeDays: uniqueDays,
      averagePerDay
    };
  }, [filteredData]);

  // Fonction pour détecter si l'appareil est mobile
  const isMobile = useMemo(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth <= 768;
    }
    return false;
  }, []);

  // Handler pour le changement d'année
  const handleYearChange = (year: number) => {
    setSelectedYear(year);
  };

  // Amélioration du rendu avec gestion plus robuste des données vides
  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex justify-center items-center h-64 w-full">
          <div className="flex flex-col items-center space-y-3">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 dark:border-blue-300"></div>
            <p className="text-gray-600 dark:text-gray-300">Chargement des données...</p>
          </div>
        </div>
      );
    }

    if (activityData.length === 0) {
      return (
        <div className="flex flex-col justify-center items-center h-64 w-full">
          <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-full mb-4">
            <Activity className="h-6 w-6 text-gray-500 dark:text-gray-400" />
          </div>
          <p className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">Aucune donnée d'activité</p>
          <p className="text-sm text-gray-600 dark:text-gray-400 text-center max-w-xs">
            Commencez à suivre vos activités d'apprentissage pour voir des statistiques ici.
          </p>
        </div>
      );
    }

    return (
      <>
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Learning Activity</h2>
            <Select value={selectedCategory} onValueChange={handleCategoryChange}>
              <SelectTrigger className={cn(
                "w-32 border border-gray-200 dark:border-gray-700", 
                "bg-white dark:bg-gray-800",
                "text-gray-900 dark:text-gray-100"
              )}>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                {categories.map((category) => (
                  <SelectItem key={category} value={category} className="text-gray-900 dark:text-gray-100">
                    {category === 'all' ? 'All Categories' : category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-6">
            {/* Stats Cards - Responsive avec meilleure visibilité en mode sombre */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className={cn(
                "bg-gradient-to-br p-3.5 rounded-lg border shadow-sm",
                isDarkMode 
                  ? chartColors.dark.statBackground.blue 
                  : chartColors.light.statBackground.blue
              )}>
                <div className="flex items-center gap-2">
                  <Activity className={cn(
                    "w-4 h-4",
                    isDarkMode 
                      ? chartColors.dark.statText.blue
                      : chartColors.light.statText.blue
                  )} />
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Total Activities</p>
                </div>
                <p className="text-lg font-semibold mt-0.5 text-gray-900 dark:text-gray-100">{stats.totalActivities}</p>
              </div>
              
              <div className={cn(
                "bg-gradient-to-br p-3.5 rounded-lg border shadow-sm",
                isDarkMode 
                  ? chartColors.dark.statBackground.emerald 
                  : chartColors.light.statBackground.emerald
              )}>
                <div className="flex items-center gap-2">
                  <CalendarIcon className={cn(
                    "w-4 h-4",
                    isDarkMode 
                      ? chartColors.dark.statText.emerald
                      : chartColors.light.statText.emerald
                  )} />
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Active Days</p>
                </div>
                <p className="text-lg font-semibold mt-0.5 text-gray-900 dark:text-gray-100">{stats.activeDays}</p>
              </div>
              
              <div className={cn(
                "bg-gradient-to-br p-3.5 rounded-lg border shadow-sm",
                isDarkMode 
                  ? chartColors.dark.statBackground.purple 
                  : chartColors.light.statBackground.purple
              )}>
                <div className="flex items-center gap-2">
                  <BarChart2 className={cn(
                    "w-4 h-4",
                    isDarkMode 
                      ? chartColors.dark.statText.purple
                      : chartColors.light.statText.purple
                  )} />
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Average Per Day</p>
                </div>
                <p className="text-lg font-semibold mt-0.5 text-gray-900 dark:text-gray-100">{stats.averagePerDay}</p>
              </div>
            </div>

            {/* Heatmap avec meilleure visibilité - Now with year selector */}
            <div className="w-full rounded-lg relative">
              <YearlyActivityHeatmap 
                data={heatmapData} 
                year={selectedYear}
                isDarkMode={isDarkMode}
                onYearChange={handleYearChange}
              />
            </div>
          </div>
        </div>
      </>
    );
  };

  return (
    <div className="w-full space-y-8">
      {renderContent()}
    </div>
  );
}
