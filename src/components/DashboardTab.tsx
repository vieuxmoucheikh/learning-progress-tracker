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
  flashcards?: FlashcardDeck[];
  onFlashcardsSelect?: () => void;
  onFlashcardDeckSelect?: (id: string) => void;
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
  onDateSelect,
  flashcards = [],
  onFlashcardsSelect,
  onFlashcardDeckSelect
}: Props) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  });
  const [activeTasks, setActiveTasks] = useState<LearningItem[]>([]);
  const [completedTasks, setCompletedTasks] = useState<LearningItem[]>([]);
  const [showGoalDialog, setShowGoalDialog] = useState(false);

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
      {/* Dashboard Header with Add Goal Button */}
      <header className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
          <div className="flex items-center space-x-2">
            <Button 
              onClick={() => setShowGoalDialog(true)} 
              className="gap-2 bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800"
            >
              <Target className="h-4 w-4" />
              <span className="hidden sm:inline">Add Goal</span>
            </Button>
            <Button 
              onClick={() => onAddItem(selectedDate)} 
              className="gap-2 bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add Item</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Stats Cards Section - Horizontal on all screens */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <Card className="p-3 hover:shadow-md transition-shadow border-l-4 border-purple-500">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">Time Invested</h3>
              <p className="mt-1 text-xl sm:text-3xl font-semibold text-purple-600 dark:text-purple-400">
                {stats.dailyTimeSpentHours}h {stats.dailyTimeSpentMinutes}m
              </p>
            </div>
            <div className="p-2 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
              <Clock className="w-5 h-5 text-purple-500 dark:text-purple-400" />
            </div>
          </div>
        </Card>
        
        <Card className="p-3 hover:shadow-md transition-shadow border-l-4 border-green-500">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">Completed</h3>
              <p className="mt-1 text-xl sm:text-3xl font-semibold text-green-600 dark:text-green-400">{completedTasks.length}</p>
            </div>
            <div className="p-2 bg-green-50 dark:bg-green-900/30 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-500 dark:text-green-400" />
            </div>
          </div>
        </Card>
        
        <Card className="p-3 hover:shadow-md transition-shadow border-l-4 border-blue-500">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">Active Tasks</h3>
              <p className="mt-1 text-xl sm:text-3xl font-semibold text-blue-600 dark:text-blue-400">{activeTasks.length}</p>
            </div>
            <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
              <Target className="w-5 h-5 text-blue-500 dark:text-blue-400" />
            </div>
          </div>
        </Card>
        
        <Card className="p-3 hover:shadow-md transition-shadow border-l-4 border-amber-500">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">Total Items</h3>
              <p className="mt-1 text-xl sm:text-3xl font-semibold text-amber-600 dark:text-amber-400">{items.length}</p>
            </div>
            <div className="p-2 bg-amber-50 dark:bg-amber-900/30 rounded-lg">
              <BookOpen className="w-5 h-5 text-amber-500 dark:text-amber-400" />
            </div>
          </div>
        </Card>
      </div>

      {/* Main Content Grid - Update this */}
      <div className="grid grid-cols-2 gap-4">
        {/* Calendar takes exactly half the page */}
        <Card className="p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <CalendarIcon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </div>
              <h2 className="text-lg font-semibold">Calendar</h2>
            </div>
            <Button onClick={() => onAddItem(selectedDate)} className="gap-2 bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="w-full">
            <Calendar 
              items={items}
              onDateSelect={handleDateSelect}
              selectedDate={selectedDate}
              onAddItem={onAddItem}
            />
          </div>
          
          {/* Streak Display */}
          <div className="mt-6">
            <StreakDisplay items={items} />
          </div>
        </Card>

        {/* Today's Goals - Takes the other half */}
        <Card className="p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                <Target className="w-5 h-5 text-blue-500 dark:text-blue-400" />
              </div>
              <h2 className="text-lg font-semibold">Today's Goals</h2>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-sm font-medium bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300">
              {activeTasks.length}
            </span>
          </div>
          {activeTasks.length === 0 ? (
            <div className="text-center py-6">
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-full inline-block mb-3">
                <Target className="h-6 w-6 text-gray-400 dark:text-gray-500" />
              </div>
              <h3 className="text-base font-medium text-gray-900 dark:text-gray-100">No goals</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Add tasks to get started</p>
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

        {/* Flashcards and Completed Tasks - Take full width or split evenly on large screens */}
        <Card className="p-4 hover:shadow-md transition-shadow col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
                <Library className="w-5 h-5 text-purple-500 dark:text-purple-400" />
              </div>
              <h2 className="text-lg font-semibold">Flashcards</h2>
            </div>
            <Button 
              variant="outline" 
              onClick={() => onFlashcardsSelect && onFlashcardsSelect()}
              className="text-sm"
            >
              View All
            </Button>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {flashcards && flashcards.length > 0 ? (
              flashcards.slice(0, 4).map((deck) => (
                <div 
                  key={deck.id} 
                  className="border rounded-lg p-3 hover:shadow-md transition-all cursor-pointer"
                  onClick={() => onFlashcardDeckSelect && onFlashcardDeckSelect(deck.id)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium">{deck.name}</h3>
                      <p className="text-sm text-muted-foreground">{deck.cards?.length || 0} cards</p>
                    </div>
                    <Badge variant={getReviewStatusBadge(deck.reviewStatus || 'none')}>
                      {formatReviewStatus(deck.reviewStatus || 'none')}
                    </Badge>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-2 text-center py-6">
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-full inline-block mb-3">
                  <Library className="h-6 w-6 text-gray-400 dark:text-gray-500" />
                </div>
                <h3 className="text-base font-medium text-gray-900 dark:text-gray-100">No flashcard decks</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Create a deck to start studying</p>
              </div>
            )}
          </div>
        </Card>
        
        <Card className="p-4 hover:shadow-md transition-shadow col-span-2 lg:col-span-1">
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

      {/* Add Goal Dialog */}
      {showGoalDialog && (
        <Dialog open={showGoalDialog} onOpenChange={setShowGoalDialog}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Add Learning Goal</DialogTitle>
            </DialogHeader>
            <LearningGoals items={items} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}