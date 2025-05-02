import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { Plus, Trash2, Target, Clock, LucideCalendar, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { addGoal, deleteGoal, getGoals, updateGoal, addSession } from '@/lib/database';
import { LearningItem } from '@/types';
import { clsx } from 'clsx';
import { PomodoroTimer } from './pomodoro/PomodoroTimer';
import type { Session } from '../types';
import '../styles/analytics-card-fixes.css';
import '../styles/learning-goals-dark-mode-fixes.css';

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
  sessions?: Array<{
    date: string;
    duration: { hours: number; minutes: number };
  }>;
}

type Priority = 'high' | 'medium' | 'low';

interface Props {
  items: LearningItem[];
}

interface SuggestedAdjustment {
  type: 'deadline' | 'hours';
  currentValue: number;
  suggestedValue: number;
  reason: string;
}

export default function LearningGoals({ items }: Props) {
  const { toast } = useToast();
  const [goals, setGoals] = useState<LearningGoal[]>([]);
  const [isAddingGoal, setIsAddingGoal] = useState(false);
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [goalToDelete, setGoalToDelete] = useState<LearningGoal | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [newGoal, setNewGoal] = useState<{
    title: string;
    targetDate: Date | undefined;
    targetHours: number;
    category: string;
    priority: Priority;
  }>({
    title: '',
    targetDate: undefined,
    targetHours: 0,
    category: '',
    priority: 'medium',
  });
  const [showCalendar, setShowCalendar] = useState(false);
  const [showAdjustmentDialog, setShowAdjustmentDialog] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<LearningGoal | null>(null);
  const [suggestedAdjustment, setSuggestedAdjustment] = useState<SuggestedAdjustment | null>(null);

  // Fetch goals from Supabase
  const fetchGoals = async () => {
    try {
      setIsLoading(true);
      const fetchedGoals = await getGoals();
      // Transform the fetched goals to match the LearningGoal interface
      const typedGoals: LearningGoal[] = fetchedGoals.map((goal: any) => ({
        id: goal.id,
        userId: goal.userId,
        title: goal.title,
        category: goal.category,
        targetHours: goal.targetHours,
        targetDate: goal.targetDate,
        priority: goal.priority as 'low' | 'medium' | 'high',
        status: goal.status as GoalStatus,
        createdAt: goal.createdAt,
        progress: goal.progress ? {
          sessions: Array.isArray(goal.progress.sessions) ? goal.progress.sessions.map((session: any) => ({
            date: session.date,
            duration: {
              hours: session.duration?.hours || 0,
              minutes: session.duration?.minutes || 0
            }
          })) : []
        } : undefined,
        // Handle sessions if they exist
        sessions: goal.sessions && Array.isArray(goal.sessions) ? 
          goal.sessions.map((session: any) => ({
            date: session.date,
            duration: {
              hours: session.duration?.hours || 0,
              minutes: session.duration?.minutes || 0
            }
          })) : undefined
      }));
      setGoals(typedGoals);
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
      const formattedTargetDate = format(newGoal.targetDate, 'yyyy-MM-dd');
      const addedGoal = await addGoal({ ...newGoal, targetDate: formattedTargetDate });
      // Update local state immediately
      setGoals(prevGoals => {
        // Explicitly cast to LearningGoal[]
        return [...prevGoals, addedGoal] as LearningGoal[];
      });
      setIsAddingGoal(false);
      setNewGoal({
        title: '',
        targetDate: undefined,
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

  // Add session handling
  const addSessionToGoal = async (goalId: string, date: string, duration: { hours: number; minutes: number }) => {
    try {
      console.log('Adding session:', { goalId, date, duration });
      const session = await addSession(goalId, { date, duration });
      console.log('Session added:', session);

      // Update the local state
      const updatedGoals = await getGoals();
      console.log('Updated goals:', updatedGoals);
      
      // Transform the fetched goals to match the LearningGoal interface
      const typedGoals: LearningGoal[] = updatedGoals.map((goal: any) => ({
        id: goal.id,
        userId: goal.userId,
        title: goal.title,
        category: goal.category,
        targetHours: goal.targetHours,
        targetDate: goal.targetDate,
        priority: goal.priority as 'low' | 'medium' | 'high',
        status: goal.status as GoalStatus,
        createdAt: goal.createdAt,
        progress: goal.progress ? {
          sessions: Array.isArray(goal.progress.sessions) ? goal.progress.sessions.map((session: any) => ({
            date: session.date,
            duration: {
              hours: session.duration?.hours || 0,
              minutes: session.duration?.minutes || 0
            }
          })) : []
        } : undefined,
        // Handle sessions if they exist
        sessions: goal.sessions && Array.isArray(goal.sessions) ? 
          goal.sessions.map((session: any) => ({
            date: session.date,
            duration: {
              hours: session.duration?.hours || 0,
              minutes: session.duration?.minutes || 0
            }
          })) : undefined
      }));
      
      setGoals(typedGoals);
      
      return session;
    } catch (error) {
      console.error('Error adding session:', error);
      throw error;
    }
  };

  // Calculate progress for a specific category


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

  const calculateMinHoursPerDay = (goal: LearningGoal) => {
    const progress = calculateProgress(goal.category);
    const remainingHours = Math.max(0, goal.targetHours - progress);
    const targetDate = new Date(goal.targetDate);
    const now = new Date();
    const diffTime = targetDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 0) return remainingHours; // If overdue, show total remaining hours
    return Math.round((remainingHours / diffDays) * 10) / 10; // Round to 1 decimal place
  };
  
  // Format daily goal to show minutes when hours is small
  const formatDailyGoal = (hoursPerDay: number) => {
    if (hoursPerDay < 0.1) {
      // Convert to minutes if less than 0.1 hours
      const minutes = Math.round(hoursPerDay * 60);
      return `${minutes}m/day`;
    } else if (hoursPerDay < 1) {
      // Show both hours and minutes for values between 0.1 and 1
      const hours = Math.floor(hoursPerDay);
      const minutes = Math.round((hoursPerDay - hours) * 60);
      return `${minutes}m/day`;
    } else {
      // Show hours with one decimal place for values >= 1
      return `${hoursPerDay}h/day`;
    }
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

  const getDailyHoursColor = (hoursPerDay: number) => {
    if (hoursPerDay <= 2) return 'text-green-600'; // Easy to achieve
    if (hoursPerDay <= 4) return 'text-amber-600'; // Moderate
    return 'text-red-600'; // Challenging
  };

  const getDailyHoursLabel = (hoursPerDay: number) => {
    if (hoursPerDay <= 2) return 'achievable';
    if (hoursPerDay <= 4) return 'moderate';
    return 'challenging';
  };

  const calculateSuggestedAdjustment = (goal: LearningGoal): SuggestedAdjustment | null => {
    const progress = calculateProgress(goal.category);
    const remainingHours = Math.max(0, goal.targetHours - progress);
    const targetDate = new Date(goal.targetDate);
    const now = new Date();
    const diffDays = Math.ceil((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const hoursPerDay = calculateMinHoursPerDay(goal);

    // If the goal requires more than 4 hours per day
    if (hoursPerDay > 4 && diffDays > 0) {
      // Suggest extending deadline if possible
      const suggestedDays = Math.ceil(remainingHours / 4); // Use 4 hours/day as maximum
      if (suggestedDays > diffDays) {
        return {
          type: 'deadline',
          currentValue: diffDays,
          suggestedValue: suggestedDays,
          reason: 'Current pace requires too many hours per day'
        };
      }
      
      // If deadline can't be extended much, suggest reducing hours
      const suggestedHours = Math.ceil(diffDays * 4); // 4 hours/day maximum
      return {
        type: 'hours',
        currentValue: goal.targetHours,
        suggestedValue: Math.max(progress + suggestedHours, progress + 1),
        reason: 'Target hours might be too ambitious for the timeline'
      };
    }
    
    return null;
  };

  const handleAdjustmentSuggestion = (goal: LearningGoal) => {
    const adjustment = calculateSuggestedAdjustment(goal);
    if (adjustment) {
      setSelectedGoal(goal);
      setSuggestedAdjustment(adjustment);
      setShowAdjustmentDialog(true);
    }
  };

  const applyAdjustment = async () => {
    if (!selectedGoal || !suggestedAdjustment) return;

    try {
      if (suggestedAdjustment.type === 'deadline') {
        const newDate = new Date();
        newDate.setDate(newDate.getDate() + suggestedAdjustment.suggestedValue);
        await handleUpdateGoal(selectedGoal.id, {
          targetDate: format(newDate, 'yyyy-MM-dd')
        });
      } else {
        await handleUpdateGoal(selectedGoal.id, {
          targetHours: suggestedAdjustment.suggestedValue
        });
      }
      
      setShowAdjustmentDialog(false);
      setSelectedGoal(null);
      setSuggestedAdjustment(null);
      
      toast({
        title: "Goal Adjusted",
        description: "Your learning goal has been updated to be more achievable.",
      });
    } catch (error) {
      console.error('Error adjusting goal:', error);
      toast({
        title: "Error",
        description: "Failed to adjust the goal. Please try again.",
        variant: "destructive",
      });
    }
  };

  const CategorySelect = () => {
    // Get unique categories from items
    const categories = Array.from(new Set(items.map(item => item.category || 'Uncategorized'))).filter(Boolean);

    return (
      <Select
        value={newGoal.category}
        onValueChange={(value: string) => setNewGoal(prev => ({ ...prev, category: value }))}>
        <SelectTrigger className="goal-input">
          <SelectValue placeholder="Select category" />
        </SelectTrigger>
        <SelectContent className="bg-background border-input rounded-md shadow-md">
          {categories.map(category => (
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
      <SelectTrigger className="goal-input">
        <SelectValue placeholder="Select priority" />
      </SelectTrigger>
      <SelectContent className="bg-background border-input rounded-md shadow-md">
        <SelectItem value="high" className="text-foreground">High</SelectItem>
        <SelectItem value="medium" className="text-foreground">Medium</SelectItem>
        <SelectItem value="low" className="text-foreground">Low</SelectItem>
      </SelectContent>
    </Select>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">Learning Goals</h2>
        <Button onClick={() => setIsAddingGoal(true)} className="bg-blue-500 hover:bg-blue-600 text-white">Add Goal</Button>
      </div>

      {activeSession && (
        <div className="mb-6">
          <PomodoroTimer sessionId={activeSession.id} />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {goals.map(goal => {
          const progress = calculateProgress(goal.category);
          const progressPercentage = Math.min(100, (progress / goal.targetHours) * 100);
          const currentStatus = getGoalStatus(goal);

          return (
            <Card key={goal.id} className="relative group overflow-hidden border border-border/40 hover:border-primary/40 transition-all duration-300 hover:shadow-lg">
              {/* Status indicator stripe at the top */}
              <div className={clsx(
                'absolute top-0 left-0 w-full h-1.5',
                currentStatus === 'completed' ? 'bg-gradient-to-r from-green-400 to-green-600' :
                currentStatus === 'overdue' ? 'bg-gradient-to-r from-red-400 to-red-600' : 'bg-gradient-to-r from-blue-400 to-blue-600'
              )} />
              
              {/* Action button */}
              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background/90 border-border/50"
                  onClick={() => {
                    setGoalToDelete(goal);
                    setShowDeleteConfirm(true);
                  }}
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
              
              <div className="p-6 pt-7">
                {/* Header with title and status */}
                <div className="flex justify-between items-start mb-5">
                  <div className="space-y-1.5">
                    <h3 className="font-semibold text-xl bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">{goal.title}</h3>
                    <div className="flex items-center gap-2">
                      <span className="inline-block w-2.5 h-2.5 rounded-full bg-primary/70"></span>
                      <p className="text-sm text-muted-foreground font-medium">{goal.category}</p>
                    </div>
                  </div>
                  <div className={clsx(
                    'px-3 py-1 rounded-full text-xs font-semibold shadow-sm',
                    getStatusColor(currentStatus)
                  )}>
                    {currentStatus.charAt(0).toUpperCase() + currentStatus.slice(1)}
                  </div>
                </div>

                {/* Progress visualization */}
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-2">
                    <div className="text-sm font-medium text-muted-foreground">
                      Progress
                    </div>
                    <div className="text-sm font-semibold">
                      {Math.round(progressPercentage)}%
                    </div>
                  </div>
                  <div className="h-2.5 w-full bg-muted/60 rounded-full overflow-hidden">
                    <div 
                      style={{ width: `${progressPercentage}%` }}
                      className={clsx(
                        'h-full rounded-full transition-all duration-500',
                        currentStatus === 'completed' ? 'bg-gradient-to-r from-green-400 to-green-600' :
                        currentStatus === 'overdue' ? 'bg-gradient-to-r from-red-400 to-red-600' : 'bg-gradient-to-r from-blue-400 to-blue-600'
                      )}
                    />
                  </div>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-2 gap-4 mb-5">
                  <div className="bg-muted/30 hover:bg-muted/40 transition-colors duration-200 rounded-xl p-3.5 border border-border/20">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Target className={clsx('h-4 w-4', getPriorityColor(goal.priority))} />
                      <span className="text-xs font-medium text-muted-foreground">Target</span>
                    </div>
                    <p className="text-lg font-semibold">{goal.targetHours}h</p>
                  </div>
                  
                  <div className="bg-muted/30 hover:bg-muted/40 transition-colors duration-200 rounded-xl p-3.5 border border-border/20">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs font-medium text-muted-foreground">Spent</span>
                    </div>
                    <p className="text-lg font-semibold">{progress}h</p>
                  </div>
                  
                  <div className="bg-muted/30 hover:bg-muted/40 transition-colors duration-200 rounded-xl p-3.5 border border-border/20">
                    <div className="flex items-center gap-2 mb-1.5">
                      <LucideCalendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs font-medium text-muted-foreground">Deadline</span>
                    </div>
                    <p className="text-sm font-semibold">{getRemainingTime(goal.targetDate)}</p>
                  </div>
                  
                  <div className="bg-muted/30 hover:bg-muted/40 transition-colors duration-200 rounded-xl p-3.5 border border-border/20">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Clock className={clsx('h-4 w-4', getDailyHoursColor(calculateMinHoursPerDay(goal)))} />
                      <span className="text-xs font-medium text-muted-foreground">Daily Goal</span>
                    </div>
                    <p className={clsx('text-sm font-semibold', getDailyHoursColor(calculateMinHoursPerDay(goal)))}>
                      {formatDailyGoal(calculateMinHoursPerDay(goal))}
                    </p>
                  </div>
                </div>
                
                {/* Action buttons */}
                <div className="flex justify-between items-center pt-1 border-t border-border/30">
                  <div className="text-xs text-muted-foreground">
                    Priority: <span className={clsx('font-medium', getPriorityColor(goal.priority))}>{goal.priority.charAt(0).toUpperCase() + goal.priority.slice(1)}</span>
                  </div>
                  
                  {calculateMinHoursPerDay(goal) > 4 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-8 border-primary/30 text-primary hover:bg-primary/10"
                      onClick={() => handleAdjustmentSuggestion(goal)}
                    >
                      Suggest Adjustment
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
      {/* Add Goal Dialog */}
      <Dialog open={isAddingGoal} onOpenChange={setIsAddingGoal}>
        <DialogContent className="sm:max-w-[500px] goal-dialog-content p-0 sm:p-6 sm:pt-4">
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
                className="goal-input"
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
                className="goal-input"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Target Date</label>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCalendar(!showCalendar)}
                className={clsx(
                  "w-full pl-3 text-left date-picker-button",
                  !newGoal.targetDate && "text-muted-foreground"
                )}
              >
                <LucideCalendar className="mr-2 h-4 w-4" />
                {newGoal.targetDate ? format(newGoal.targetDate, "PPP") : <span>Pick a date</span>}
              </Button>
              {showCalendar && (
                <div className="fixed inset-0 flex items-center justify-center bg-black/20 z-[1000]" onClick={() => setShowCalendar(false)}>
                  <div className="relative bg-card p-4 rounded-lg shadow-lg border border-border" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-medium">Select Date</h3>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setShowCalendar(false)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <Calendar
                      mode="single"
                      selected={newGoal.targetDate}
                      onSelect={(date) => {
                        setNewGoal(prev => ({ ...prev, targetDate: date }));
                        setShowCalendar(false);
                      }}
                      fromDate={new Date()}
                      className="custom-calendar"
                      classNames={{
                        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                        month: "space-y-4",
                        caption: "flex justify-center pt-1 relative items-center",
                        caption_label: "text-sm font-medium",
                        nav: "space-x-1 flex items-center",
                        nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
                        nav_button_previous: "absolute left-1",
                        nav_button_next: "absolute right-1",
                        table: "w-full border-collapse space-y-1",
                        head_row: "flex",
                        head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
                        row: "flex w-full mt-2",
                        cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                        day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-accent hover:text-accent-foreground rounded-md",
                        day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                        day_today: "bg-accent text-accent-foreground",
                        day_outside: "text-muted-foreground opacity-50",
                        day_disabled: "text-muted-foreground opacity-50",
                        day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
                        day_hidden: "invisible",
                      }}
                    />
                  </div>
                </div>
              )}
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
              className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 font-medium"
            >
              Add Goal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="sm:max-w-[425px] goal-dialog-content">
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

      {/* Adjustment Dialog */}
      <Dialog open={showAdjustmentDialog} onOpenChange={setShowAdjustmentDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Suggested Adjustment</DialogTitle>
            <DialogDescription>
              Based on your current progress, we suggest the following adjustment.
            </DialogDescription>
          </DialogHeader>
          {suggestedAdjustment && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <p className="text-sm font-medium">Current Target Hours: <span className="font-bold">{suggestedAdjustment.currentValue}h</span></p>
                <p className="text-sm font-medium">Suggested Target Hours: <span className="font-bold text-green-600">{suggestedAdjustment.suggestedValue}h</span></p>
                <p className="text-sm text-muted-foreground mt-4">{suggestedAdjustment.reason}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdjustmentDialog(false)}>Cancel</Button>
            <Button onClick={applyAdjustment}>Apply Adjustment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


    </div>
  );
}
