import { useState, useMemo, useEffect } from 'react';
import { format, parseISO, addDays } from 'date-fns';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { useAuth } from '../lib/auth';
import { YearlyActivityHeatmap } from './YearlyActivityHeatmap';
import { Button } from './ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './ui/select';
import { Card } from './ui/card';

// Amélioration de la gestion des couleurs selon le thème
const getColors = (isDark: boolean) => ({
  primary: isDark ? '#60A5FA' : '#3B82F6', // blue-400 : blue-500
  secondary: isDark ? '#34D399' : '#10B981', // emerald-400 : emerald-500
  accent: isDark ? '#A78BFA' : '#8B5CF6', // violet-400 : violet-500
  highlight: isDark ? '#FBBF24' : '#F59E0B', // amber-400 : amber-500
  muted: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
});

export function YearlyActivityStats() {
  const { user } = useAuth();
  const [activityData, setActivityData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<string[]>(['All']);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  // Détecter le mode sombre
  useEffect(() => {
    const checkDarkMode = () => {
      const isDark = document.documentElement.classList.contains('dark') || 
                    document.documentElement.getAttribute('data-theme') === 'dark';
      setIsDarkMode(isDark);
    };
    
    checkDarkMode();
    
    // Observer les changements de thème
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme'],
    });
    
    return () => observer.disconnect();
  }, []);
  
  // Couleurs adaptées au thème courant
  const colors = getColors(isDarkMode);

  // Fonction améliorée pour normaliser les catégories
  const normalizeCategory = (category: string | null | undefined): string => {
    if (!category) return 'Uncategorized';
    return category.trim() || 'Uncategorized';
  };

  // Chargement des données
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Simulons des données d'activité pour l'exemple
        const mockActivityData = [];
        const today = new Date();
        const allCategories = new Set<string>();
        
        // Génère 100 jours d'activités
        for (let i = 0; i < 100; i++) {
          const date = addDays(today, -i);
          const categoryOptions = ['Programming', 'Design', 'Math', 'Languages', 'Science', '', null, undefined];
          const category = categoryOptions[Math.floor(Math.random() * categoryOptions.length)];
          
          // Normaliser la catégorie
          const normalizedCategory = normalizeCategory(category);
          allCategories.add(normalizedCategory);
          
          mockActivityData.push({
            date: format(date, 'yyyy-MM-dd'),
            category: normalizedCategory,
            duration: Math.floor(Math.random() * 120) + 30,
            count: Math.floor(Math.random() * 5) + 1
          });
        }
        
        // Tri des catégories et ajout de "All"
        const sortedCategories = ['All', ...Array.from(allCategories).sort()];
        setCategories(sortedCategories);
        setActivityData(mockActivityData);
      } catch (error) {
        console.error('Error fetching activity data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [user]);

  const handleCategoryChange = (value: string) => {
    setSelectedCategory(value);
  };

  // Données transformées avec meilleure gestion des catégories
  const data = useMemo(() => {
    if (!activityData.length) return [];

    // Regroupement par date
    const groupedByDate = activityData.reduce((acc: any, activity: any) => {
      // Utiliser la version normalisée pour la comparaison
      const activityCategory = normalizeCategory(activity.category);
      
      // Journal de débogage pour voir les comparaisons
      console.log('Comparing categories: ', {
        activity: activityCategory, 
        selected: selectedCategory, 
        matches: selectedCategory === 'All' || activityCategory === selectedCategory,
        raw: activity
      });
      
      // Ne considérer que les activités de la catégorie sélectionnée ou toutes si "All" est sélectionné
      if (selectedCategory === 'All' || activityCategory === selectedCategory) {
        const date = activity.date;
        if (!acc[date]) {
          acc[date] = { date, count: 0, duration: 0 };
        }
        acc[date].count += activity.count || 0;
        acc[date].duration += activity.duration || 0;
      }
      return acc;
    }, {});

    // Conversion en tableau pour le graphique
    const result = Object.values(groupedByDate);
    
    // Journal pour voir les activités filtrées
    console.log('Filtered activities for category: ', {
      category: selectedCategory,
      selectedCategory,
      total: result.length,
      activities: result
    });
    
    return result;
  }, [activityData, selectedCategory]);

  // Calcul des statistiques
  const stats = useMemo(() => {
    const totalActivities = data.reduce((sum: number, day: any) => sum + day.count, 0);
    const activeDays = data.length;
    const averagePerDay = activeDays ? Math.round((totalActivities / activeDays) * 10) / 10 : 0;
    
    return {
      totalActivities,
      activeDays,
      averagePerDay
    };
  }, [data]);

  return (
    <div className="w-full space-y-8">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Learning Activity</h2>
          <Select value={selectedCategory} onValueChange={handleCategoryChange}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent className="z-50 border border-gray-200 dark:border-gray-700">
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500 dark:border-blue-400"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Stats Cards - Améliorés pour meilleure visibilité */}
            <div className="grid grid-cols-3 gap-3">
              <Card className="p-2.5 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-500/10 dark:to-blue-600/10 border border-blue-200/50 dark:border-blue-400/10 shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                  <div className="p-1 rounded-full bg-blue-100 dark:bg-blue-600/20">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-500 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-black dark:text-white">Total Activities</p>
                </div>
                <p className="text-lg font-semibold mt-0.5 text-black dark:text-white">{stats.totalActivities}</p>
              </Card>
              
              <Card className="p-2.5 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-500/10 dark:to-emerald-600/10 border border-emerald-200/50 dark:border-emerald-400/10 shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                  <div className="p-1 rounded-full bg-emerald-100 dark:bg-emerald-600/20">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-emerald-500 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-black dark:text-white">Active Days</p>
                </div>
                <p className="text-lg font-semibold mt-0.5 text-black dark:text-white">{stats.activeDays}</p>
              </Card>
              
              <Card className="p-2.5 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-500/10 dark:to-purple-600/10 border border-purple-200/50 dark:border-purple-400/10 shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                  <div className="p-1 rounded-full bg-purple-100 dark:bg-purple-600/20">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-purple-500 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-black dark:text-white">Average Per Day</p>
                </div>
                <p className="text-lg font-semibold mt-0.5 text-black dark:text-white">{stats.averagePerDay}</p>
              </Card>
            </div>

            {/* Heatmap avec contraste amélioré pour le mode clair sur mobile */}
            <div className="w-full bg-white dark:bg-gray-800/30 rounded-lg border border-gray-100 dark:border-gray-700 shadow-sm p-4">
              <YearlyActivityHeatmap 
                data={data.map((item: any) => ({ 
                  date: item.date, 
                  count: item.count 
                }))} 
                year={new Date().getFullYear()}
              />
            </div>
            
            {/* Graphique d'activité optimisé pour tous les modes */}
            <div className="bg-white dark:bg-gray-800/30 rounded-lg border border-gray-100 dark:border-gray-700 shadow-sm p-4">
              <h3 className="text-base font-medium mb-4 text-gray-900 dark:text-white">Activity Distribution</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.slice(0, 14).reverse()}
                    margin={{ top: 10, right: 10, left: 0, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? "#555" : "#ddd"} />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fill: isDarkMode ? "#bbb" : "#666" }}
                      tickFormatter={(value) => {
                        const date = parseISO(value);
                        return format(date, 'dd/MM');
                      }}
                      angle={-45}
                      textAnchor="end"
                      height={50}
                    />
                    <YAxis tick={{ fill: isDarkMode ? "#bbb" : "#666" }} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: isDarkMode ? "#1f2937" : "#fff",
                        border: isDarkMode ? "1px solid #374151" : "1px solid #e5e7eb",
                        borderRadius: "0.375rem",
                        color: isDarkMode ? "#e5e7eb" : "#1f2937"
                      }}
                      labelFormatter={(value) => {
                        const date = parseISO(value);
                        return format(date, 'EEEE, MMMM d, yyyy');
                      }}
                    />
                    <Legend />
                    <Bar dataKey="count" name="Activities" fill={colors.primary} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
