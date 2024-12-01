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
} from './ui/dialog';
import { Select } from "@/components/ui/select"
import { Calendar, Clock, Target, Trophy, TrendingUp } from 'lucide-react';
import { LearningItem } from '@/types';
import { clsx } from 'clsx';

type Priority = 'high' | 'medium' | 'low';

interface LearningGoal {
  id: string;
  title: string;
  targetDate: string;
  targetHours: number;
  category: string;
  priority: Priority;
  status: 'active' | 'completed' | 'overdue';
  createdAt: string;
}

interface Props {
  items: LearningItem[];
}

export function LearningGoals({ items }: Props) {
  const [goals, setGoals] = useState<LearningGoal[]>(() => {
    const savedGoals = localStorage.getItem('learningGoals');
    return savedGoals ? JSON.parse(savedGoals) : [];
  });
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

  // Get unique categories from items
  const categories = Array.from(new Set(items.map(item => item.category || 'Uncategorized'))).filter(Boolean);

  const saveGoals = (updatedGoals: LearningGoal[]) => {
    localStorage.setItem('learningGoals', JSON.stringify(updatedGoals));
    setGoals(updatedGoals);
  };

  const addGoal = () => {
    if (!newGoal.title || !newGoal.targetDate || !newGoal.targetHours || !newGoal.category) {
      return;
    }

    const goal: LearningGoal = {
      id: crypto.randomUUID(),
      ...newGoal,
      status: 'active',
      createdAt: new Date().toISOString(),
    };

    saveGoals([...goals, goal]);
    setIsAddingGoal(false);
    setNewGoal({
      title: '',
      targetDate: '',
      targetHours: 0,
      category: '',
      priority: 'medium',
    });
  };

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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Learning Goals</h2>
        <Button onClick={() => setIsAddingGoal(true)}>
          Add Goal
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {goals.map(goal => {
          const progress = calculateProgress(goal.category);
          const progressPercentage = Math.min(100, (progress / goal.targetHours) * 100);
          const currentStatus = getGoalStatus(goal);

          return (
            <Card key={goal.id} className="p-4 space-y-4">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <h3 className="font-medium">{goal.title}</h3>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Learning Goal</DialogTitle>
            <DialogDescription>
              Set a new learning goal to track your progress
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Goal Title</label>
              <Input
                value={newGoal.title}
                onChange={e => setNewGoal(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Learn React Fundamentals"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <Select
                value={newGoal.category}
                onValueChange={(value: string) => setNewGoal(prev => ({ ...prev, category: value }))}
                items={categories.map(category => ({
                  value: category,
                  label: category
                }))}
                placeholder="Select a category"
                className="w-full"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Target Hours</label>
                <Input
                  type="number"
                  min="0"
                  value={newGoal.targetHours}
                  onChange={e => setNewGoal(prev => ({ ...prev, targetHours: Number(e.target.value) }))}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Target Date</label>
                <Input
                  type="date"
                  value={newGoal.targetDate}
                  onChange={e => setNewGoal(prev => ({ ...prev, targetDate: e.target.value }))}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Priority</label>
              <Select
                value={newGoal.priority}
                onValueChange={(value: string) => setNewGoal(prev => ({ ...prev, priority: value as Priority }))}
                items={[
                  { value: 'high', label: 'High Priority' },
                  { value: 'medium', label: 'Medium Priority' },
                  { value: 'low', label: 'Low Priority' }
                ]}
                placeholder="Select priority level"
                className="w-full"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddingGoal(false)}>
              Cancel
            </Button>
            <Button onClick={addGoal}>Add Goal</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
