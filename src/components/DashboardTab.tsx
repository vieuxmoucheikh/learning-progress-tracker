import * as React from 'react';
import { useState, useCallback, useEffect, useMemo } from "react";
import { StreakDisplay } from "./StreakDisplay";
import { Stats } from "./Stats";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Plus, BookOpen, CheckCircle, Clock, Target, Calendar as CalendarIcon, Trophy, ChartBar, User, Library } from "lucide-react";
import { LearningItem, Session } from "@/types";
import { Calendar } from "./Calendar";
import LearningItemCard from './LearningItemCard';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import LearningGoals from './LearningGoals';

// Add these interfaces to properly type the flashcards
interface FlashcardDeck {
  id: string;
  name: string;
  cards?: any[];
  reviewStatus?: 'due' | 'learning' | 'complete' | 'none';
}

interface Props {
  items: LearningItem[];
  onUpdate: (id: string, updates: Partial<LearningItem>) => void;
  onDelete: (id: string) => void;
  onStartTracking: (id: string) => void;
  onStopTracking: (id: string) => void;
  onNotesUpdate: (id: string, notes: string) => void;
  onSetActiveItem: (id: string | null) => void;
  onSessionNoteAdd: (id: string, note: string) => void;
  onAddItem: (date?: Date | null) => void;
  onDateSelect: (date: Date) => void;
}

export function DashboardTab({ 
  items, 
  onUpdate, 
  onDelete, 
  onStartTracking, 
  onStopTracking, 
  onNotesUpdate, 
  onSetActiveItem,
  onSessionNoteAdd,
  onAddItem,
  onDateSelect
}: Props) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  });
  const [activeTasks, setActiveTasks] = useState<LearningItem[]>([]);
  const [completedTasks, setCompletedTasks] = useState<LearningItem[]>([]);
  const [showGoalDialog, setShowGoalDialog] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showGoals, setShowGoals] = useState(false);
  const [streak, setStreak] = useState(0);

  // Helper function to get date string in YYYY-MM-DD format
  const getDateStr = (date: Date | string) => {
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) return null;
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch (e) {
      console.error('Error getting date string:', e);
      return null;
    }
  };

  // Format review status for display
  const formatReviewStatus = (status: string) => {
    switch (status) {
      case 'due': return 'Due';
      case 'learning': return 'Learning';
      case 'complete': return 'Complete';
      default: return 'None';
    }
  };

  // Get badge variant based on review status
  const getReviewStatusBadge = (status: string) => {
    switch (status) {
      case 'due': return 'destructive';
      case 'learning': return 'secondary';
      case 'complete': return 'default';
      default: return 'outline';
    }
  };

  // Update tasks when items or selectedDate changes
  useEffect(() => {
    if (!selectedDate) return;

    const dateStr = getDateStr(selectedDate);
    if (!dateStr) return;

    const active: LearningItem[] = [];
    const completed: LearningItem[] = [];

    items.forEach(item => {
      if (!item.date) return;
      const itemDateStr = getDateStr(item.date);
      
      if (itemDateStr === dateStr) {
        if (item.status === 'completed') {
          completed.push(item);
        } else if (item.status !== 'archived') {
          active.push(item);
        }
      }
    });

    setActiveTasks(active);
    setCompletedTasks(completed);
  }, [items, selectedDate]);

  // Add this useEffect to calculate the streak
  useEffect(() => {
    // Simple streak calculation based on completed items
    // You can replace this with your actual streak logic
    const calculateStreak = () => {
      return completedTasks.length > 0 ? Math.max(1, Math.min(7, completedTasks.length)) : 0;
    };
    
    setStreak(calculateStreak());
  }, [completedTasks]);

  const handleDateSelect = useCallback((date: Date, active: LearningItem[], completed: LearningItem[]) => {
    try {
      const newDate = new Date(date);
      newDate.setHours(0, 0, 0, 0);
      
      setSelectedDate(newDate);
      setActiveTasks(active);
      setCompletedTasks(completed);
      onDateSelect(newDate);
    } catch (e) {
      console.error('Error handling date selection:', e);
    }
  }, [onDateSelect]);

  // Calculate stats
  const stats = useMemo(() => {
    if (!selectedDate) return {
      dailyTimeSpentHours: 0,
      dailyTimeSpentMinutes: 0
    };

    const dateStr = getDateStr(selectedDate);
    let dailyTimeSpent = 0;

    // Sum up all session durations for the selected date
    items.forEach(item => {
      if (item.progress?.sessions) {
        item.progress.sessions.forEach(session => {
          // Get the date part of the session start time
          const sessionDate = session.startTime?.split('T')[0];
          
          // For sessions that have ended (completed sessions) on the selected date
          if (sessionDate === dateStr && session.endTime) {
            // For completed sessions, just add the stored duration (minutes)
            if (session.duration) {
              if (typeof session.duration === 'object' && 'hours' in session.duration && 'minutes' in session.duration) {
                dailyTimeSpent += (session.duration.hours * 60 + session.duration.minutes);
              }
            }
            else {
              try {
                const startTime = new Date(session.startTime);
                const endTime = new Date(session.endTime);
                
                // Ensure both dates are valid
                if (!isNaN(startTime.getTime()) && !isNaN(endTime.getTime())) {
                  // Calculate minutes
                  dailyTimeSpent += Math.floor((endTime.getTime() - startTime.getTime()) / (1000 * 60));
                }
              } catch (error) {
                console.error('Error calculating session duration:', error);
              }
            }
          }
        });
      }
    });

    // Convert total minutes to hours and minutes
    const dailyTimeSpentHours = Math.floor(dailyTimeSpent / 60);
    const dailyTimeSpentMinutes = dailyTimeSpent % 60;

    return {
      dailyTimeSpentHours,
      dailyTimeSpentMinutes
    };
  }, [items, selectedDate, getDateStr]);

  return (
    <div className="space-y-6">
      {/* Mobile Header with Quick Actions */}
      <div className="md:hidden">
        <div className="flex flex-col space-y-3">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">Today's Focus</h2>
            <Button 
              size="sm" 
              onClick={() => onAddItem(selectedDate)}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-sm"
            >
              <Plus className="h-4 w-4 mr-1" /> <span className="hidden sm:inline">Add Item</span>
            </Button>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <Button 
              variant="outline" 
              size="sm"
              className="flex justify-center items-center gap-1.5 h-10 border-gray-200 dark:border-gray-700"
              onClick={() => setShowCalendar(true)}
            >
              <CalendarIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span className="text-xs font-medium">Calendar</span>
            </Button>
            
            <Button 
              variant="outline" 
              size="sm"
              className="flex justify-center items-center gap-1.5 h-10 border-gray-200 dark:border-gray-700"
              onClick={() => setShowGoals(true)}
            >
              <Target className="h-4 w-4 text-green-600 dark:text-green-400" />
              <span className="text-xs font-medium">Goals</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Desktop Header */}
      <div className="hidden md:flex justify-between items-center">
        <h2 className="text-2xl font-bold">Dashboard</h2>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            className="flex items-center gap-1.5 border-gray-200 dark:border-gray-700"
            onClick={() => setShowGoals(true)}
          >
            <Target className="h-4 w-4" /> Goals
          </Button>
          <Button 
            onClick={() => onAddItem(selectedDate)}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-sm"
          >
            <Plus className="h-4 w-4 mr-1.5" /> Add Item
          </Button>
        </div>
      </div>

      {/* Stats Cards - Responsive Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <Card className="p-3 md:p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 border-blue-100 dark:border-blue-900/30 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">Study Time</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{stats.dailyTimeSpentHours}h {stats.dailyTimeSpentMinutes}m</p>
            </div>
          </div>
        </Card>

        <Card className="p-3 md:p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/40 dark:to-emerald-950/40 border-green-100 dark:border-green-900/30 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-xs text-green-700 dark:text-green-300 font-medium">Completed</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{completedTasks.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-3 md:p-4 bg-gradient-to-br from-purple-50 to-fuchsia-50 dark:from-purple-950/40 dark:to-fuchsia-950/40 border-purple-100 dark:border-purple-900/30 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <BookOpen className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-xs text-purple-700 dark:text-purple-300 font-medium">In Progress</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{activeTasks.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-3 md:p-4 bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/40 dark:to-yellow-950/40 border-amber-100 dark:border-amber-900/30 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
              <Trophy className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-xs text-amber-700 dark:text-amber-300 font-medium">Streak</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{streak} days</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Main Content - Responsive Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        {/* Calendar - Hidden on mobile, shown in dialog */}
        <div className="hidden md:block md:col-span-1">
          <Card className="p-4 h-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Calendar</h3>
            </div>
            <Calendar 
              items={items}
              onDateSelect={(date) => {
                setSelectedDate(date);
                onDateSelect(date);
              }}
              selectedDate={selectedDate}
              onAddItem={() => onAddItem(selectedDate)}
            />
          </Card>
        </div>

        {/* Active Tasks - Full width on mobile */}
        <div className="md:col-span-2">
          <Card className="p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                  <Clock className="w-5 h-5 text-blue-500 dark:text-blue-400" />
                </div>
                <h2 className="text-lg font-semibold">Active Tasks</h2>
              </div>
              <Badge variant="outline" className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800">
                {activeTasks.length}
              </Badge>
            </div>
            {activeTasks.length === 0 ? (
              <div className="text-center py-6">
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-full inline-block mb-3">
                  <Clock className="h-6 w-6 text-gray-400 dark:text-gray-500" />
                </div>
                <h3 className="text-base font-medium text-gray-900 dark:text-gray-100">No active tasks</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Start tracking a task to see it here</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                {activeTasks.map((item) => (
                  <LearningItemCard
                    key={item.id}
                    item={item}
                    onUpdate={onUpdate}
                    onDelete={onDelete}
                    onStartTracking={onStartTracking}
                    onStopTracking={onStopTracking}
                    onNotesUpdate={onNotesUpdate}
                    onSetActiveItem={onSetActiveItem}
                    onSessionNoteAdd={onSessionNoteAdd}
                  />
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Completed Tasks - Full width on mobile */}
        <Card className="p-4 hover:shadow-md transition-shadow md:col-span-3">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-green-50 dark:bg-green-900/30 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-500 dark:text-green-400" />
              </div>
              <h2 className="text-lg font-semibold">Completed Today</h2>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-sm font-medium bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300">
              {completedTasks.length}
            </span>
          </div>
          {completedTasks.length === 0 ? (
            <div className="text-center py-6">
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-full inline-block mb-3">
                <CheckCircle className="h-6 w-6 text-gray-400 dark:text-gray-500" />
              </div>
              <h3 className="text-base font-medium text-gray-900 dark:text-gray-100">No completed tasks</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Complete tasks to see them here</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
              {completedTasks.map((item) => (
                <LearningItemCard
                  key={item.id}
                  item={item}
                  onUpdate={onUpdate}
                  onDelete={onDelete}
                  onStartTracking={onStartTracking}
                  onStopTracking={onStopTracking}
                  onNotesUpdate={onNotesUpdate}
                  onSetActiveItem={onSetActiveItem}
                  onSessionNoteAdd={onSessionNoteAdd}
                />
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Mobile Calendar Dialog */}
      <Dialog open={showCalendar} onOpenChange={setShowCalendar}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Calendar</DialogTitle>
          </DialogHeader>
          <Calendar 
            items={items}
            onDateSelect={(date) => {
              setSelectedDate(date);
              onDateSelect(date);
              setShowCalendar(false);
            }}
            selectedDate={selectedDate}
            onAddItem={() => {
              onAddItem(selectedDate);
              setShowCalendar(false);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Goals Dialog */}
      <Dialog open={showGoals} onOpenChange={setShowGoals}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Learning Goals</DialogTitle>
          </DialogHeader>
          <LearningGoals items={items} />
        </DialogContent>
      </Dialog>
    </div>
  );
}