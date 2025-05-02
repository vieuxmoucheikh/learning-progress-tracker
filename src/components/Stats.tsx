import React, { useMemo, useState } from 'react';
import { LearningItem } from '../types';
import { BarChart3, Clock, Calendar as CalendarIcon, Trophy, TrendingUp, Target } from 'lucide-react';
import { calculateTimeByCategory } from '../lib/utils';
import { YearlyActivityStats } from './YearlyActivityStats';
import GoalManager from './pomodoro/GoalManager';
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { clsx } from "clsx";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LucideCalendar } from 'lucide-react';
import '../styles/stats-analytics-dark-mode-fixes.css';

interface Props {
  items: LearningItem[];
}

export function Stats({ items }: Props) {
  const [isGoalPopoverOpen, setIsGoalPopoverOpen] = useState(false);
  const [newGoal, setNewGoal] = useState({
    title: '',
    targetDate: '',
    targetHours: 0,
    category: '',
    priority: 'medium' as const,
  });

  const stats = useMemo(() => {
    // Calculate status distribution
    const statusCounts = items.reduce((acc, item) => {
      // Add a null check and set a default value when status is undefined
      const status = item.status || 'not_started';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Calculate priority distribution
    const priorityCounts = items.reduce((acc, item) => {
      // Add a null check and set a default value when priority is undefined
      const priority = item.priority || 'medium';
      acc[priority] = (acc[priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Calculate time by category
    const categoryTimes = calculateTimeByCategory(items);

    // Calculate overall stats
    const totalItems = items.length;
    const completedItems = items.filter(item => item.completed).length;
    const completionRate = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;

    // Calculate total time from all sessions
    const totalMinutes = items.reduce((total, item) => {
      // Add a null check for item.progress and item.progress.sessions
      return total + (item.progress?.sessions?.reduce((sessionTotal, session) => {
        if (session.duration) {
          return sessionTotal + (session.duration.hours * 60) + session.duration.minutes;
        }
        return sessionTotal; 
      }, 0) || 0);
    }, 0); 

    const averageTimePerItem = totalItems > 0 ? totalMinutes / totalItems : 0;

    return {
      totalItems,
      completedItems,
      completionRate,
      totalTime: {
        hours: Math.floor(totalMinutes / 60),
        minutes: totalMinutes % 60
      },
      averageTime: {
        hours: Math.floor(averageTimePerItem / 60),
        minutes: Math.floor(averageTimePerItem % 60)
      },
      statusDistribution: statusCounts,
      priorityDistribution: priorityCounts,
      categoryTimes
    };
  }, [items]);

  const formatTime = (time: { hours: number; minutes: number }) => {
    return `${time.hours}h ${time.minutes}m`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'in_progress': return 'bg-blue-500';
      case 'not_started': return 'bg-gray-500';
      case 'on_hold': return 'bg-yellow-500';
      case 'archived': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const handleAddGoal = () => {
    // Implementation for adding a new goal
    console.log('Adding goal:', newGoal);
    setIsGoalPopoverOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <GoalManager />
        <Popover open={isGoalPopoverOpen} onOpenChange={setIsGoalPopoverOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline">Add Goal</Button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            className="w-auto p-0 bg-background border rounded-md shadow-md"
            side="bottom"
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            <div className="p-4">
              <div className="space-y-2">
                <Label htmlFor="targetDate" className="text-sm font-semibold">
                  Target Date
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
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
                  <PopoverContent 
                    align="start" 
                    className="w-auto p-0 bg-background border rounded-md shadow-md" 
                    side="bottom"
                  >
                    <Calendar
                      mode="single"
                      selected={newGoal.targetDate ? new Date(newGoal.targetDate) : undefined}
                      onSelect={(date: Date | undefined) => {
                        if (date) {
                          const localDate = new Date(date);
                          const formattedDate = localDate.toISOString().split('T')[0];
                          
                          setNewGoal(prev => ({
                            ...prev,
                            targetDate: formattedDate
                          }));
                        }
                      }}
                      disabled={(date: Date) => {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        return date < today;
                      }}
                      fromDate={new Date()}
                      className="rounded-md border"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {/* Overall Progress */}
      <div className="bg-white p-6 rounded-xl shadow-sm border-2 border-gray-100 hover:border-blue-100 transition-all duration-200 hover:shadow-md">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-3 text-gray-800">
          <div className="p-2 bg-blue-50 rounded-lg">
            <Target className="w-6 h-6 text-blue-500" />
          </div>
          Overall Progress
        </h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <p className="text-gray-600">Total Items</p>
            <span className="text-2xl font-bold text-blue-600">{stats.totalItems}</span>
          </div>
          <div className="flex justify-between items-center">
            <p className="text-gray-600">Completed</p>
            <span className="text-2xl font-bold text-green-600">{stats.completedItems}</span>
          </div>
          <div className="flex justify-between items-center">
            <p className="text-gray-600">Completion Rate</p>
            <span className="text-2xl font-bold text-purple-600">{Math.round(stats.completionRate)}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-3 mt-4">
            <div
              className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-300"
              style={{ width: `${stats.completionRate}%` }}
            />
          </div>
        </div>
      </div>

      {/* Time Stats */}
      <div className="bg-white p-6 rounded-xl shadow-sm border-2 border-gray-100 hover:border-green-100 transition-all duration-200 hover:shadow-md">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-3 text-gray-800">
          <div className="p-2 bg-green-50 rounded-lg">
            <Clock className="w-6 h-6 text-green-500" />
          </div>
          Time Statistics
        </h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <p className="text-gray-600">Total Time</p>
            <span className="text-2xl font-bold text-green-600">{formatTime(stats.totalTime)}</span>
          </div>
          <div className="flex justify-between items-center">
            <p className="text-gray-600">Average Time</p>
            <span className="text-2xl font-bold text-green-600">{formatTime(stats.averageTime)}</span>
          </div>
        </div>
      </div>

      {/* Status Distribution */}
      <div className="bg-white p-6 rounded-xl shadow-sm border-2 border-gray-100 hover:border-orange-100 transition-all duration-200 hover:shadow-md">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-3 text-gray-800">
          <div className="p-2 bg-orange-50 rounded-lg">
            <BarChart3 className="w-6 h-6 text-orange-500" />
          </div>
          Status Distribution
        </h3>
        <div className="space-y-3">
          {Object.entries(stats.statusDistribution).map(([status, count]) => (
            <div key={status} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${getStatusColor(status)}`} />
                <span className="capitalize">{status.replace('_', ' ')}</span>
              </div>
              <span className="font-semibold">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Priority Distribution */}
      <div className="bg-white p-6 rounded-xl shadow-sm border-2 border-gray-100 hover:border-yellow-100 transition-all duration-200 hover:shadow-md">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-3 text-gray-800">
          <div className="p-2 bg-yellow-50 rounded-lg">
            <Trophy className="w-6 h-6 text-yellow-500" />
          </div>
          Priority Levels
        </h3>
        <div className="space-y-3">
          {Object.entries(stats.priorityDistribution).map(([priority, count]) => (
            <div key={priority} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${getPriorityColor(priority)}`} />
                <span className="capitalize">{priority}</span>
              </div>
              <span className="font-semibold">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Time by Category */}
      <div className="bg-white p-6 rounded-xl shadow-sm border-2 border-gray-100 hover:border-red-100 transition-all duration-200 hover:shadow-md">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-3 text-gray-800">
          <div className="p-2 bg-red-50 rounded-lg">
            <Calendar className="w-6 h-6 text-red-500" />
          </div>
          Time by Category
        </h3>
        <div className="space-y-3">
          {Object.entries(stats.categoryTimes).map(([category, time]) => (
            <div key={category} className="flex items-center justify-between">
              <span className="capitalize">{category}</span>
              <span className="font-semibold">{formatTime(time)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Yearly Activity Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="col-span-full">
          <YearlyActivityStats />
        </div>
      </div>
      </div>
    </div>
  );
}
