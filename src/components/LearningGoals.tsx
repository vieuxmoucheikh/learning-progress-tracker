import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { Brain, ChartBar, LucideCalendar, Plus, Trash2, Target, Clock, TrendingUp } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { addGoal, deleteGoal, getGoals, updateGoal } from '@/lib/database';
import { LearningItem } from '@/types';
import { clsx } from 'clsx';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

type GoalStatus = 'active' | 'completed' | 'overdue';

interface LearningGoal {
  id: string;
  userId: string;
  title: string;
  category: string;
  targetHours: number;
  targetDate: string;
  priority: 'low' | 'medium' | 'high';
  status: GoalStatus;
  createdAt: string;
  progress?: {
    sessions: Array<{
      date: string;
      duration: { hours: number; minutes: number };
    }>;
  };
}

interface GoalAnalytics {
  averageSessionTime: string;
  totalDaysActive: number;
  sessions: Array<{
    date: string;
    duration: { hours: number; minutes: number };
  }>;
  totalTimeInvested: {
    hours: number;
    minutes: number;
  };
  completionPercentage: number;
  dailyProgressRate: number;
  streaks: {
    current: number;
    max: number;
  };
}

type Priority = 'high' | 'medium' | 'low';

interface Props {
  items: LearningItem[];
}

export default function LearningGoals({ items }: Props) {
  const { toast } = useToast();
  const [goals, setGoals] = useState<LearningGoal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingGoal, setIsAddingGoal] = useState(false);
  const [goalToDelete, setGoalToDelete] = useState<LearningGoal | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
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
  const [selectedGoal, setSelectedGoal] = useState<LearningGoal | null>(null);
  const [showAnalytics, setShowAnalytics] = useState(false);

  // Fetch goals from Supabase
  const fetchGoals = async () => {
    try {
      setIsLoading(true);
      const goals = await getGoals();
      setGoals(goals);
    } catch (error) {
      console.error('Error in fetchGoals:', error);
      toast({
        title: "Error",
        description: "Failed to fetch goals. Please try again later.",
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
            table: 'goals',
            filter: `user_id=eq.${user.id}`,
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

  const handleAddGoal = async () => {
    try {
      if (!newGoal.title || !newGoal.category || !newGoal.targetDate || !newGoal.targetHours) {
        toast({
          title: "Missing Fields",
          description: "Please fill in all required fields",
          variant: "destructive",
        });
        return;
      }

      const addedGoal = await addGoal(newGoal);
      // Update local state immediately
      setGoals(prevGoals => {
        // Explicitly cast to LearningGoal[]
        return [...prevGoals, addedGoal] as LearningGoal[];
      });
      setIsAddingGoal(false);
      setNewGoal({
        title: '',
        targetDate: '',
        targetHours: 0,
        category: '',
        priority: 'medium',
      });
      toast({
        title: "Success",
        description: "Goal added successfully",
      });
    } catch (error) {
      console.error('Error adding goal:', error);
      toast({
        title: "Error",
        description: "Failed to add goal. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Valid goal statuses are: 'active' | 'completed' | 'overdue'
  // Note: Goals cannot be 'archived' - use 'completed' status instead
  const handleUpdateGoal = async (goalId: string, updates: Partial<LearningGoal>) => {
    try {
      // If trying to archive, mark as completed instead
      if (updates.status && !['active', 'completed', 'overdue'].includes(updates.status)) {
        updates.status = 'completed';
      }
      await updateGoal(goalId, updates);
      toast({
        title: "Success",
        description: "Goal updated successfully",
      });
    } catch (error) {
      console.error('Error updating goal:', error);
      toast({
        title: "Error",
        description: "Failed to update goal. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteGoal = async (goalId: string): Promise<void> => {
    try {
      await deleteGoal(goalId);
      setGoals((prevGoals: LearningGoal[]): LearningGoal[] => 
        prevGoals.filter((goal: LearningGoal): boolean => goal.id !== goalId)
      );
      setShowDeleteConfirm(false);
      setGoalToDelete(null);
      toast({
        title: "Success",
        description: "Goal deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting goal:', error);
      toast({
        title: "Error",
        description: "Failed to delete goal. Please try again.",
        variant: "destructive",
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
  };

  const calculateGoalAnalytics = (goal: LearningGoal): GoalAnalytics => {
    console.log('Goal data:', goal);
    console.log('Sessions:', goal.progress?.sessions);

    if (!goal.progress?.sessions || goal.progress.sessions.length === 0) {
      return {
        averageSessionTime: '0h 0m',
        totalDaysActive: 0,
        sessions: [],
        totalTimeInvested: { hours: 0, minutes: 0 },
        completionPercentage: 0,
        dailyProgressRate: 0,
        streaks: { current: 0, max: 0 }
      };
    }

    const sessions = goal.progress.sessions;
    
    // Calculate total time invested
    const totalMinutes = sessions.reduce((total, session) => {
      if (!session.duration) return total;
      return total + (session.duration.hours * 60) + session.duration.minutes;
    }, 0);
    
    // Calculate average session time
    const averageMinutes = sessions.length ? Math.round(totalMinutes / sessions.length) : 0;
    const averageHours = Math.floor(averageMinutes / 60);
    const remainingMinutes = averageMinutes % 60;
    
    // Calculate unique days and consistency
    const uniqueDays = new Set(sessions.map(s => s.date.split('T')[0]));
    const uniqueDaysCount = uniqueDays.size;
    
    // Calculate completion percentage
    const targetMinutes = (goal.targetHours || 0) * 60;
    const completionPercentage = targetMinutes > 0 
      ? Math.min(100, Math.round((totalMinutes / targetMinutes) * 100))
      : 0;
    
    // Calculate streaks
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const datesWithSessions = Array.from(uniqueDays)
      .map(dateStr => {
        const date = new Date(dateStr);
        date.setHours(0, 0, 0, 0);
        return date.getTime();
      })
      .sort((a, b) => b - a); // Sort in descending order (most recent first)

    let currentStreak = 0;
    let maxStreak = 0;
    
    // Calculate current streak
    if (datesWithSessions.length > 0) {
      const mostRecentDate = new Date(datesWithSessions[0]);
      const daysSinceLastSession = Math.floor((today.getTime() - mostRecentDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysSinceLastSession <= 1) { // Count streak if last session was today or yesterday
        currentStreak = 1;
        for (let i = 1; i < datesWithSessions.length; i++) {
          const currentDate = datesWithSessions[i];
          const previousDate = datesWithSessions[i - 1];
          const daysBetween = Math.floor((previousDate - currentDate) / (1000 * 60 * 60 * 24));
          
          if (daysBetween === 1) {
            currentStreak++;
          } else {
            break;
          }
        }
      }
    }
    
    // Calculate max streak
    let tempStreak = 1;
    for (let i = 1; i < datesWithSessions.length; i++) {
      const currentDate = datesWithSessions[i];
      const previousDate = datesWithSessions[i - 1];
      const daysBetween = Math.floor((previousDate - currentDate) / (1000 * 60 * 60 * 24));
      
      if (daysBetween === 1) {
        tempStreak++;
      } else {
        maxStreak = Math.max(maxStreak, tempStreak);
        tempStreak = 1;
      }
    }
    maxStreak = Math.max(maxStreak, tempStreak, currentStreak);
    
    // Calculate daily progress rate
    const activeTimeSpan = datesWithSessions.length > 1
      ? Math.floor((datesWithSessions[0] - datesWithSessions[datesWithSessions.length - 1]) / (1000 * 60 * 60 * 24)) + 1
      : 1;
    const dailyProgressRate = Math.round(totalMinutes / activeTimeSpan);

    // Prepare session data for chart
    const chartData = sessions
      .map(session => ({
        date: session.date,
        duration: {
          hours: session.duration?.hours || 0,
          minutes: session.duration?.minutes || 0
        }
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const result = {
      averageSessionTime: `${averageHours}h ${remainingMinutes}m`,
      totalDaysActive: uniqueDaysCount,
      sessions: chartData,
      totalTimeInvested: {
        hours: Math.floor(totalMinutes / 60),
        minutes: totalMinutes % 60
      },
      completionPercentage,
      dailyProgressRate,
      streaks: {
        current: currentStreak,
        max: maxStreak
      }
    };

    console.log('Calculated analytics:', result);
    return result;
  };

  // Add this function to handle session addition
  const addSession = async (goalId: string, duration: { hours: number, minutes: number }) => {
    try {
      const date = new Date().toISOString();
      const { data: goal } = await supabase
        .from('goals')
        .select('progress')
        .eq('id', goalId)
        .single();

      const currentProgress = goal?.progress || { sessions: [] };
      const updatedSessions = [...currentProgress.sessions, { date, duration }];

      const { error } = await supabase
        .from('goals')
        .update({
          progress: {
            sessions: updatedSessions
          }
        })
        .eq('id', goalId);

      if (error) throw error;
      
      // Refresh goals after adding session
      await fetchGoals();
    } catch (error) {
      console.error('Error adding session:', error);
      toast({
        title: 'Error',
        description: 'Failed to add session',
        variant: 'destructive'
      });
    }
  };

  // Add this function to handle session recording
  const handleRecordSession = async (goal: LearningGoal) => {
    try {
      const hours = Math.floor(Math.random() * 3); // Random hours (0-2)
      let minutes = Math.floor(Math.random() * 60); // Random minutes (0-59)
      
      if (hours === 0 && minutes === 0) {
        minutes = 30; // Ensure at least 30 minutes if both are 0
      }
      
      await addSession(goal.id, { hours, minutes });
      
      toast({
        title: 'Success',
        description: `Recorded ${hours}h ${minutes}m for ${goal.title}`,
      });
    } catch (error) {
      console.error('Error recording session:', error);
      toast({
        title: 'Error',
        description: 'Failed to record session',
        variant: 'destructive'
      });
    }
  };

  const CategorySelect = () => {
    // Only use categories from existing items
    const existingCategories = Array.from(new Set(items.map(item => item.category))).filter(Boolean);

    return (
      <Select 
        value={newGoal.category} 
        onValueChange={(value: string) => setNewGoal(prev => ({ ...prev, category: value }))}
      >
        <SelectTrigger className="w-full bg-background text-foreground border-input">
          <SelectValue placeholder="Select category" />
        </SelectTrigger>
        <SelectContent className="bg-background border-input">
          {existingCategories.map(category => (
            <SelectItem key={category} value={category} className="text-foreground">
              {category}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  };

  const PrioritySelect = () => (
    <Select value={newGoal.priority} onValueChange={(value: Priority) => setNewGoal({ ...newGoal, priority: value })}>
      <SelectTrigger className="w-full bg-background text-foreground border-input">
        <SelectValue placeholder="Select priority" />
      </SelectTrigger>
      <SelectContent className="bg-background border-input">
        <SelectItem value="high" className="text-foreground">High</SelectItem>
        <SelectItem value="medium" className="text-foreground">Medium</SelectItem>
        <SelectItem value="low" className="text-foreground">Low</SelectItem>
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
                  onClick={() => {
                    setGoalToDelete(goal);
                    setShowDeleteConfirm(true);
                  }}
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
                  <LucideCalendar className="h-4 w-4 text-gray-500" />
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

      <Dialog open={showAnalytics} onOpenChange={setShowAnalytics}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto bg-background text-foreground border-border">
          <DialogHeader className="space-y-3 pb-4 border-b border-border">
            <DialogTitle className="text-2xl font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Learning Analytics
            </DialogTitle>
            <DialogDescription className="text-base text-muted-foreground">
              <span className="font-medium text-foreground">{selectedGoal?.title}</span>
              <span className="mx-2">•</span>
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                {selectedGoal?.category}
              </span>
            </DialogDescription>
          </DialogHeader>

          {selectedGoal && (
            <div className="space-y-6 py-4">
              {/* Learning Patterns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Card className="p-4 space-y-2 bg-background text-foreground border-border">
                  <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                    <div className="p-1.5 bg-green-50 rounded">
                      <TrendingUp className="w-4 h-4 text-green-600" />
                    </div>
                    Learning Consistency
                  </h3>
                  <div className="text-2xl font-bold">
                    {calculateGoalAnalytics(selectedGoal).streaks.current} day streak
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Best streak: {calculateGoalAnalytics(selectedGoal).streaks.max} days
                  </div>
                  <div className="mt-2 w-full bg-gray-100 rounded-full h-1.5">
                    <div 
                      className="bg-green-500 h-1.5 rounded-full transition-all duration-300"
                      style={{ 
                        width: `${calculateGoalAnalytics(selectedGoal).streaks.max > 0 
                          ? (calculateGoalAnalytics(selectedGoal).streaks.current / calculateGoalAnalytics(selectedGoal).streaks.max) * 100 
                          : 0}%` 
                      }}
                    />
                  </div>
                </Card>

                <Card className="p-4 space-y-2 bg-background text-foreground border-border">
                  <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                    <div className="p-1.5 bg-blue-50 rounded">
                      <Clock className="w-4 h-4 text-blue-600" />
                    </div>
                    Session Efficiency
                  </h3>
                  <div className="text-2xl font-bold">
                    {calculateGoalAnalytics(selectedGoal).averageSessionTime}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Average session duration
                  </div>
                  <div className="text-sm text-foreground mt-1">
                    {calculateGoalAnalytics(selectedGoal).sessions.length} total sessions
                  </div>
                </Card>
              </div>

              {/* Daily Progress Chart */}
              <Card className="p-4 space-y-4 bg-background text-foreground border-border">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium flex items-center gap-2">
                    <div className="p-1.5 bg-indigo-50 rounded">
                      <ChartBar className="w-4 h-4 text-indigo-600" />
                    </div>
                    Daily Learning Activity
                  </h3>
                  <div className="text-sm text-muted-foreground">
                    {calculateGoalAnalytics(selectedGoal).dailyProgressRate} min/day average
                  </div>
                </div>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={calculateGoalAnalytics(selectedGoal).sessions}>
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      />
                      <YAxis 
                        label={{ value: 'Minutes', angle: -90, position: 'insideLeft' }} 
                      />
                      <Tooltip 
                        formatter={(value: any) => [`${value} min`, 'Duration']}
                        labelFormatter={(date) => new Date(date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                      />
                      <Bar
                        dataKey={(session) => (session.duration.hours * 60) + session.duration.minutes}
                        fill="#4F46E5"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Learning Insights */}
              <Card className="p-4 space-y-4 bg-background text-foreground border-border">
                <h3 className="text-lg font-medium flex items-center gap-2">
                  <div className="p-1.5 bg-purple-50 rounded">
                    <Brain className="w-4 h-4 text-purple-600" />
                  </div>
                  Learning Insights
                </h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <TrendingUp className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                      <h4 className="font-medium">Daily Progress</h4>
                      <p className="text-sm text-muted-foreground">
                        {calculateGoalAnalytics(selectedGoal).dailyProgressRate > 0
                          ? `You're averaging ${calculateGoalAnalytics(selectedGoal).dailyProgressRate} minutes per day`
                          : 'Start your learning journey today'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-green-50 rounded-lg">
                      <LucideCalendar className="w-5 h-5 text-green-500" />
                    </div>
                    <div>
                      <h4 className="font-medium">Active Days</h4>
                      <p className="text-sm text-muted-foreground">
                        You've been active for {calculateGoalAnalytics(selectedGoal).totalDaysActive} days
                      </p>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAnalytics(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddingGoal} onOpenChange={setIsAddingGoal}>
        <DialogContent className="sm:max-w-[500px] bg-background text-foreground border-border p-0 sm:p-6 sm:pt-4">
          <DialogHeader className="space-y-3 pb-4 border-b border-border px-4 sm:px-0">
            <DialogTitle className="text-2xl font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Add New Goal
            </DialogTitle>
            <DialogDescription className="text-base text-muted-foreground">
              Set a new learning goal to track your progress
            </DialogDescription>
          </DialogHeader>

          <div className="p-4 sm:p-0 space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Title</label>
              <Input
                value={newGoal.title}
                onChange={e => setNewGoal(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter goal title"
                className="border-input bg-background text-foreground"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Category</label>
              <CategorySelect />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Target Hours</label>
              <Input
                type="number"
                value={newGoal.targetHours}
                onChange={e => setNewGoal(prev => ({ ...prev, targetHours: Number(e.target.value) }))}
                min={1}
                placeholder="Enter target hours"
                className="border-input bg-background text-foreground"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Target Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={clsx(
                      "w-full pl-3 text-left font-normal border-input bg-background text-foreground",
                      !newGoal.targetDate && "text-muted-foreground"
                    )}
                  >
                    <LucideCalendar className="mr-3 h-4 w-4 opacity-50" />
                    {newGoal.targetDate ? (
                      format(new Date(newGoal.targetDate), "MMMM d, yyyy")
                    ) : (
                      <span>Select target date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <div className="rounded-md border shadow-md bg-background">
                    <Calendar
                      mode="single"
                      selected={newGoal.targetDate ? new Date(newGoal.targetDate) : undefined}
                      onSelect={(date: Date | undefined) => {
                        if (date) {
                          const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
                          setNewGoal(prev => ({ 
                            ...prev, 
                            targetDate: localDate.toISOString().split('T')[0] 
                          }));
                        }
                      }}
                      disabled={(date: Date) => {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        return date < today;
                      }}
                      initialFocus
                      fromDate={new Date()}
                      className="rounded-md border-0"
                    />
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Priority</label>
              <PrioritySelect />
            </div>
          </div>

          <DialogFooter className="px-4 sm:px-0">
            <Button
              type="submit"
              onClick={handleAddGoal}
              className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700"
            >
              Add Goal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="sm:max-w-[425px] bg-background text-foreground border-border">
          <DialogHeader>
            <DialogTitle>Delete Goal</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{goalToDelete?.title}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteConfirm(false);
                setGoalToDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => goalToDelete && handleDeleteGoal(goalToDelete.id)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {goals.map(goal => (
        <div key={goal.id} className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => handleRecordSession(goal)}
            >
              Record Session
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={() => setShowAnalytics(true)}
            >
              <ChartBar className="w-4 h-4 mr-1" />
              Analytics
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
