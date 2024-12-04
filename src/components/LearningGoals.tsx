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
import { Brain, ChartBar, LucideCalendar, Plus, Trash2, Target, Clock } from 'lucide-react';
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
    const sessions = goal.progress?.sessions || [];
    
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
    
    // Calculate daily progress rate
    const firstSession = sessions[0]?.date ? new Date(sessions[0].date) : new Date();
    const lastSession = sessions[sessions.length - 1]?.date ? new Date(sessions[sessions.length - 1].date) : new Date();
    const daysBetween = Math.max(1, Math.ceil((lastSession.getTime() - firstSession.getTime()) / (1000 * 60 * 60 * 24)));
    const dailyProgressRate = Math.round((totalMinutes / daysBetween) * 100) / 100;
    
    // Calculate streak
    let currentStreak = 0;
    let maxStreak = 0;
    let tempStreak = 0;
    
    const sortedDays = Array.from(uniqueDays).sort();
    sortedDays.forEach((date, index) => {
      if (index === 0) {
        tempStreak = 1;
      } else {
        const curr = new Date(date);
        const prev = new Date(sortedDays[index - 1]);
        const diffDays = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
          tempStreak++;
        } else {
          maxStreak = Math.max(maxStreak, tempStreak);
          tempStreak = 1;
        }
      }
    });
    maxStreak = Math.max(maxStreak, tempStreak);
    currentStreak = tempStreak;
    
    return {
      averageSessionTime: `${averageHours}h ${remainingMinutes}m`,
      totalDaysActive: uniqueDaysCount,
      sessions,
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

      {showAnalytics && selectedGoal && (
        <Dialog open={showAnalytics} onOpenChange={setShowAnalytics}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold">Goal Analytics</DialogTitle>
              <DialogDescription>
                Detailed analytics for {selectedGoal.title}
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="space-y-2">
                <h4 className="font-medium text-gray-700">Time Investment</h4>
                <div className="text-sm text-gray-600">
                  <p>Average Session: {calculateGoalAnalytics(selectedGoal).averageSessionTime}</p>
                  <p>Total Time: {calculateGoalAnalytics(selectedGoal).totalTimeInvested.hours}h {calculateGoalAnalytics(selectedGoal).totalTimeInvested.minutes}m</p>
                  <p>Daily Progress: {calculateGoalAnalytics(selectedGoal).dailyProgressRate} min/day</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium text-gray-700">Progress</h4>
                <div className="text-sm text-gray-600">
                  <p>Completion: {calculateGoalAnalytics(selectedGoal).completionPercentage}%</p>
                  <p>Days Active: {calculateGoalAnalytics(selectedGoal).totalDaysActive}</p>
                  <p>Current Streak: {calculateGoalAnalytics(selectedGoal).streaks.current} days</p>
                  <p>Best Streak: {calculateGoalAnalytics(selectedGoal).streaks.max} days</p>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <h4 className="font-medium text-gray-700 mb-2">Progress Chart</h4>
              <div className="w-full bg-gray-100 rounded-full h-2.5">
                <div 
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${calculateGoalAnalytics(selectedGoal).completionPercentage}%` }}
                />
              </div>
              <p className="text-sm text-gray-500 mt-1">
                {calculateGoalAnalytics(selectedGoal).completionPercentage}% Complete
              </p>
            </div>

            <DialogFooter className="mt-6">
              <Button variant="outline" onClick={() => setShowAnalytics(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

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
    </div>
  );
}
