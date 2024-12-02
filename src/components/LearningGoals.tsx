import { useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, Clock, Target, Trophy, TrendingUp, Plus, Trash2, ChartBar, ArrowRight } from 'lucide-react';
import { LearningItem } from '@/types';
import { clsx } from 'clsx';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '@/lib/supabase';
import { useEffect } from 'react';
import { useToast } from "@/components/ui/use-toast";

type Priority = 'high' | 'medium' | 'low';

interface GoalAnalytics {
  dailyProgress: { date: string; minutes: number }[];
  totalTimeSpent: number;
  recentSessions: number;
  averageSessionLength: number;
  daysActive: number;
  daysLeft: number;
  projectedCompletion: number;
}

interface LearningGoal {
  id: string;
  title: string;
  targetDate: string;
  targetHours: number;
  category: string;
  priority: Priority;
  status: 'active' | 'completed' | 'overdue';
  createdAt: string;
  userId: string;
}

interface Props {
  items: LearningItem[];
}

export default function LearningGoals({ items }: Props) {
  const { toast } = useToast();
  const [goals, setGoals] = useState<LearningGoal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingGoal, setIsAddingGoal] = useState(false);
  const [newGoal, setNewGoal] = useState<{
    title: string;
    targetDate: string;
    targetHours: number;
    category: string;
    priority: Priority;
  }>({
    title: '',
    targetDate: '',
    targetHours: 0,
    category: '',
    priority: 'medium',
  });
  const [isAddingNewCategory, setIsAddingNewCategory] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [selectedGoal, setSelectedGoal] = useState<LearningGoal | null>(null);
  const [showAnalytics, setShowAnalytics] = useState(false);

  // Fetch goals from Supabase
  const fetchGoals = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('No user found');
        return;
      }

      const { data: items, error } = await supabase
        .from('learning_items')
        .select('*')
        .eq('userId', user.id)
        .order('createdAt', { ascending: false });

      if (error) {
        console.error('Error fetching learning items:', error);
        toast({
          title: "Error fetching learning items",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      // Convert learning items to goals format with proper typing
      const goalsFromItems: LearningGoal[] = (items || []).map(item => {
        // Parse target hours and date from description if available
        let targetHours = 10; // default
        let targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + 30); // default 30 days

        if (item.description) {
          const match = item.description.match(/Target: (\d+) hours by (.+)$/);
          if (match) {
            targetHours = parseInt(match[1]);
            targetDate = new Date(match[2]);
          }
        }

        // Calculate total minutes spent
        const totalMinutes = item.progress?.sessions?.reduce((acc: number, session: any) => 
          acc + ((session.duration?.hours || 0) * 60 + (session.duration?.minutes || 0)), 0) || 0;

        return {
          id: item.id,
          userId: item.userId,
          title: item.title,
          targetDate: targetDate.toISOString(),
          targetHours: targetHours,
          category: item.category || 'General',
          priority: 'medium' as Priority,
          status: totalMinutes >= targetHours * 60 ? 'completed' : 
                 new Date() > targetDate ? 'overdue' : 'active',
          createdAt: item.createdAt
        };
      });

      setGoals(goalsFromItems);
    } catch (error) {
      console.error('Error in fetchGoals:', error);
      toast({
        title: "Error",
        description: "Failed to fetch learning items. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Subscribe to real-time updates
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) return;

      const channel = supabase
        .channel('goals_channel')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'learning_items',
            filter: `userId=eq.${user.id}`,
          },
          () => {
            fetchGoals();
          }
        )
        .subscribe();

      fetchGoals();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    fetchUser();
  }, []);

  const addGoal = async (newGoal: Omit<LearningGoal, 'id' | 'status' | 'createdAt' | 'userId'>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) return;

    try {
      const learningItem = {
        title: newGoal.title,
        description: `Target: ${newGoal.targetHours} hours by ${new Date(newGoal.targetDate).toLocaleDateString()}`,
        category: newGoal.category,
        status: 'not_started',
        progress: {
          sessions: []
        },
        userId: user.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const { error } = await supabase.from('learning_items').insert([learningItem]);

      if (error) throw error;

      toast({
        title: 'Goal added successfully',
        description: 'Your new learning goal has been created',
      });

      setIsAddingGoal(false);
      resetForm();
    } catch (error) {
      console.error('Error adding goal:', error);
      toast({
        title: 'Error adding goal',
        description: 'Please try again later',
        variant: 'destructive',
      });
    }
  };

  const deleteGoal = async (id: string) => {
    try {
      const { error } = await supabase
        .from('learning_items')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Goal deleted successfully',
        description: 'Your learning goal has been removed',
      });
    } catch (error) {
      console.error('Error deleting goal:', error);
      toast({
        title: 'Error deleting goal',
        description: 'Please try again later',
        variant: 'destructive',
      });
    }
  };

  // Get unique categories from items
  const categories = Array.from(new Set(items.map(item => item.category || 'Uncategorized'))).filter(Boolean);

  const calculateProgress = (category: string) => {
    const categoryItems = items.filter(item => item.category === category);
    const totalMinutes = categoryItems.reduce((acc, item) => {
      const sessionMinutes = (item.progress?.sessions || []).reduce((total, session) => {
        if (session.duration) {
          return total + (session.duration.hours * 60 + session.duration.minutes);
        }
        return total;
      }, 0);
      return acc + sessionMinutes;
    }, 0);
    return Math.round(totalMinutes / 60 * 100) / 100;
  };

  const getGoalStatus = (goal: LearningGoal): 'active' | 'completed' | 'overdue' => {
    const hoursSpent = calculateProgress(goal.category);
    const targetDate = new Date(goal.targetDate);
    const now = new Date();

    if (hoursSpent >= goal.targetHours) {
      return 'completed';
    } else if (targetDate < now) {
      return 'overdue';
    }
    return 'active';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'active':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'overdue':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-600';
      case 'medium':
        return 'text-amber-600';
      case 'low':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  const getRemainingTime = (targetDate: string) => {
    const target = new Date(targetDate);
    const now = new Date();
    const diffTime = target.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return `${Math.abs(diffDays)} days overdue`;
    } else if (diffDays === 0) {
      return 'Due today';
    } else {
      return `${diffDays} days left`;
    }
  };

  const resetForm = () => {
    setNewGoal({
      title: '',
      targetDate: '',
      targetHours: 0,
      category: '',
      priority: 'medium',
    });
    setNewCategory('');
    setIsAddingNewCategory(false);
  };

  const calculateGoalAnalytics = (goal: LearningGoal): GoalAnalytics => {
    const categoryItems = items.filter(item => item.category === goal.category);
    const now = new Date();
    const targetDate = new Date(goal.targetDate);
    const createdAt = new Date(goal.createdAt);
    
    // Get all sessions from items in this category
    const allSessions = categoryItems.flatMap(item => 
      (item.progress?.sessions || []).map(session => ({
        startTime: new Date(session.startTime),
        duration: session.duration ? session.duration.hours * 60 + session.duration.minutes : 0,
        status: session.status
      }))
    ).filter(session => session.startTime >= createdAt);

    // Calculate daily progress
    const dailyProgress = allSessions.reduce((acc, session) => {
      const date = session.startTime.toISOString().split('T')[0];
      const existing = acc.find(d => d.date === date);
      if (existing) {
        existing.minutes += session.duration;
      } else {
        acc.push({ date, minutes: session.duration });
      }
      return acc;
    }, [] as { date: string; minutes: number }[]).sort((a, b) => a.date.localeCompare(b.date));

    // Calculate other metrics
    const totalTimeSpent = allSessions.reduce((sum, session) => sum + session.duration, 0);
    const recentSessions = allSessions.filter(session => 
      session.startTime >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    ).length;
    const averageSessionLength = allSessions.length > 0 
      ? Math.round(totalTimeSpent / allSessions.length) 
      : 0;
    const daysActive = new Set(dailyProgress.map(d => d.date)).size;
    const daysLeft = Math.max(0, Math.ceil((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    
    // Calculate projected completion based on current progress rate
    const daysSinceStart = Math.ceil((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
    const dailyRate = daysSinceStart > 0 ? totalTimeSpent / daysSinceStart : 0;
    const remainingMinutes = goal.targetHours * 60 - totalTimeSpent;
    const projectedDays = dailyRate > 0 ? Math.ceil(remainingMinutes / dailyRate) : 0;
    const projectedCompletion = projectedDays > 0 ? Math.round((remainingMinutes / dailyRate) * 10) / 10 : 0;

    return {
      dailyProgress,
      totalTimeSpent,
      recentSessions,
      averageSessionLength,
      daysActive,
      daysLeft,
      projectedCompletion
    };
  };

  const PrioritySelect = () => (
    <Select value={newGoal.priority} onValueChange={(value: Priority) => setNewGoal({ ...newGoal, priority: value })}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select priority" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="high">High</SelectItem>
        <SelectItem value="medium">Medium</SelectItem>
        <SelectItem value="low">Low</SelectItem>
      </SelectContent>
    </Select>
  );

  const CategorySelect = () => (
    <Select value={newGoal.category} onValueChange={(value: string) => setNewGoal({ ...newGoal, category: value })}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select category" />
      </SelectTrigger>
      <SelectContent>
        {Array.from(new Set(goals.map(goal => goal.category))).map(category => (
          <SelectItem key={category} value={category}>
            {category}
          </SelectItem>
        ))}
        {isAddingNewCategory && (
          <SelectItem value={newCategory}>
            {newCategory}
          </SelectItem>
        )}
      </SelectContent>
    </Select>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Learning Goals</h2>
          <p className="text-sm text-muted-foreground">
            Set and track your learning objectives
          </p>
        </div>
        <Button 
          onClick={() => setIsAddingGoal(true)}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-md hover:shadow-lg"
        >
          <Plus className="mr-2 h-4 w-4" /> Add Goal
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {goals.map(goal => {
          const progress = calculateProgress(goal.category);
          const progressPercentage = Math.min(100, (progress / goal.targetHours) * 100);
          const currentStatus = getGoalStatus(goal);

          return (
            <Card key={goal.id} className="p-4 space-y-4 relative group">
              <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                  onClick={() => {
                    setSelectedGoal(goal);
                    setShowAnalytics(true);
                  }}
                >
                  <ChartBar className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                  onClick={() => deleteGoal(goal.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <h3 className="font-medium text-lg">{goal.title}</h3>
                  <p className="text-sm text-gray-500">{goal.category}</p>
                </div>
                <div className={clsx(
                  'px-2 py-1 rounded-full text-xs font-medium',
                  getStatusColor(currentStatus)
                )}>
                  {currentStatus.charAt(0).toUpperCase() + currentStatus.slice(1)}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Target className={clsx('h-4 w-4', getPriorityColor(goal.priority))} />
                  <span>{goal.targetHours}h target</span>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span>{progress}h spent</span>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span>{getRemainingTime(goal.targetDate)}</span>
                </div>

                <div className="relative pt-1">
                  <div className="flex mb-2 items-center justify-between">
                    <div className="text-xs font-semibold inline-block text-blue-600">
                      {Math.round(progressPercentage)}% Complete
                    </div>
                  </div>
                  <div className="overflow-hidden h-2 text-xs flex rounded bg-blue-100">
                    <div
                      style={{ width: `${progressPercentage}%` }}
                      className={clsx(
                        'shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center transition-all duration-500',
                        currentStatus === 'completed' ? 'bg-green-500' :
                        currentStatus === 'overdue' ? 'bg-red-500' : 'bg-blue-500'
                      )}
                    />
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Dialog open={isAddingGoal} onOpenChange={setIsAddingGoal}>
        <DialogContent className="sm:max-w-[500px] bg-white dark:bg-gray-900 border-0 p-0 sm:p-6 sm:pt-4">
          <DialogHeader className="space-y-3 pb-4 border-b px-4 sm:px-0">
            <DialogTitle className="text-2xl font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Add New Goal
            </DialogTitle>
            <DialogDescription className="text-base text-gray-600 dark:text-gray-300">
              Set a new learning goal to track your progress
            </DialogDescription>
          </DialogHeader>

          <div className="p-4 sm:p-0 space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-200">Title</label>
              <Input
                value={newGoal.title}
                onChange={e => setNewGoal(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter goal title"
                className="border-gray-300 focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-200">Category</label>
              <div className="space-y-2">
                {!isAddingNewCategory ? (
                  <CategorySelect />
                ) : (
                  <div className="flex gap-2">
                    <Input
                      value={newCategory}
                      onChange={e => setNewCategory(e.target.value)}
                      placeholder="Enter new category name"
                      className="flex-1 border-gray-300 focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                    />
                    <Button
                      onClick={() => {
                        if (newCategory.trim()) {
                          setNewGoal(prev => ({ ...prev, category: newCategory.trim() }));
                          setNewCategory('');
                        }
                        setIsAddingNewCategory(false);
                      }}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      Add
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsAddingNewCategory(false);
                        setNewCategory('');
                      }}
                      className="border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-200">Target Hours</label>
              <Input
                type="number"
                value={newGoal.targetHours}
                onChange={e => setNewGoal(prev => ({ ...prev, targetHours: Number(e.target.value) }))}
                min={1}
                placeholder="Enter target hours"
                className="border-gray-300 focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-200">Target Date</label>
              <Input
                type="date"
                value={newGoal.targetDate}
                onChange={e => setNewGoal(prev => ({ ...prev, targetDate: e.target.value }))}
                min={new Date().toISOString().split('T')[0]}
                className="border-gray-300 focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-200">Priority</label>
              <PrioritySelect />
            </div>
          </div>

          <DialogFooter className="px-4 sm:px-0">
            <Button
              type="submit"
              onClick={async () => {
                if (!newGoal.title || !newGoal.category || !newGoal.targetDate || !newGoal.targetHours) {
                  toast({
                    title: 'Missing fields',
                    description: 'Please fill in all required fields',
                    variant: 'destructive',
                  });
                  return;
                }

                await addGoal(newGoal);
                resetForm();
                setIsAddingGoal(false);
              }}
              className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700"
            >
              Add Goal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Goal Analytics Dialog */}
      <Dialog open={showAnalytics} onOpenChange={setShowAnalytics}>
        <DialogContent className="sm:max-w-[700px] bg-white dark:bg-gray-900 border-0">
          <DialogHeader className="space-y-3 pb-4 border-b">
            <DialogTitle className="text-2xl font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Goal Analytics
            </DialogTitle>
            <DialogDescription className="text-base text-gray-600 dark:text-gray-300">
              {selectedGoal?.title} - {selectedGoal?.category}
            </DialogDescription>
          </DialogHeader>

          {selectedGoal && (
            <div className="space-y-6 py-4">
              {/* Progress Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(() => {
                  const analytics = calculateGoalAnalytics(selectedGoal);
                  const progress = (analytics.totalTimeSpent / 60) / selectedGoal.targetHours * 100;
                  
                  return (
                    <>
                      <Card className="p-4 space-y-2">
                        <h3 className="text-sm font-medium text-gray-500">Progress</h3>
                        <div className="text-2xl font-bold">{Math.round(progress)}%</div>
                        <div className="text-sm text-gray-500">
                          {Math.round(analytics.totalTimeSpent / 60)}h of {selectedGoal.targetHours}h
                        </div>
                      </Card>

                      <Card className="p-4 space-y-2">
                        <h3 className="text-sm font-medium text-gray-500">Time Left</h3>
                        <div className="text-2xl font-bold">{analytics.daysLeft} days</div>
                        <div className="text-sm text-gray-500">
                          {analytics.projectedCompletion > 0 
                            ? `Projected completion in ${analytics.projectedCompletion} days`
                            : 'Insufficient data for projection'}
                        </div>
                      </Card>

                      <Card className="p-4 space-y-2">
                        <h3 className="text-sm font-medium text-gray-500">Activity</h3>
                        <div className="text-2xl font-bold">{analytics.recentSessions}</div>
                        <div className="text-sm text-gray-500">
                          Sessions in last 7 days
                        </div>
                      </Card>
                    </>
                  );
                })()}
              </div>

              {/* Daily Progress Chart */}
              <Card className="p-4 space-y-4">
                <h3 className="text-lg font-medium">Daily Progress</h3>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={calculateGoalAnalytics(selectedGoal).dailyProgress}
                      margin={{ top: 10, right: 10, left: 10, bottom: 20 }}
                    >
                      <XAxis 
                        dataKey="date" 
                        angle={-45}
                        textAnchor="end"
                        height={60}
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis 
                        label={{ 
                          value: 'Minutes', 
                          angle: -90, 
                          position: 'insideLeft',
                          style: { textAnchor: 'middle' }
                        }}
                      />
                      <Tooltip
                        formatter={(value: number) => [`${value} minutes`, 'Time Spent']}
                      />
                      <Bar 
                        dataKey="minutes" 
                        fill="#3B82F6"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Additional Stats */}
              <div className="grid grid-cols-2 gap-4">
                <Card className="p-4 space-y-2">
                  <h3 className="text-sm font-medium text-gray-500">Average Session</h3>
                  <div className="text-xl font-bold">
                    {(() => {
                      const analytics = calculateGoalAnalytics(selectedGoal);
                      return `${Math.round(analytics.averageSessionLength)} minutes`;
                    })()}
                  </div>
                </Card>

                <Card className="p-4 space-y-2">
                  <h3 className="text-sm font-medium text-gray-500">Days Active</h3>
                  <div className="text-xl font-bold">
                    {(() => {
                      const analytics = calculateGoalAnalytics(selectedGoal);
                      return analytics.daysActive;
                    })()}
                  </div>
                </Card>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
