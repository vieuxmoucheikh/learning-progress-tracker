import * as React from 'react';
import { useState, useCallback, useEffect, useMemo } from "react";
import { StreakDisplay } from "./StreakDisplay";
import { Stats } from "./Stats";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "./ui/card";
import { Button } from "./ui/button";
import { Plus, BookOpen, CheckCircle, Clock, Target, Calendar as CalendarIcon, Trophy, ChartBar, User, Library, CalendarCheck, RefreshCw, Timer } from "lucide-react";
import { LearningItem, Session } from "@/types";
import { Calendar } from "@/components/ui/calendar";
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
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showDetails, setShowDetails] = useState<Record<string, boolean>>({});
  const [activeTasks, setActiveTasks] = useState<LearningItem[]>([]);
  const [completedTasks, setCompletedTasks] = useState<LearningItem[]>([]);
  const [showGoalDialog, setShowGoalDialog] = useState(false);

  // Toggle details visibility for an item
  const toggleDetails = (id: string) => {
    setShowDetails(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const getDateStr = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const formatReviewStatus = (status: string) => {
    switch (status) {
      case 'due': return 'Due for review';
      case 'learning': return 'In progress';
      case 'complete': return 'Completed';
      case 'none': return 'Not started';
      default: return status;
    }
  };

  const getReviewStatusBadge = (status: string) => {
    switch (status) {
      case 'due': return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Due</Badge>;
      case 'learning': return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Learning</Badge>;
      case 'complete': return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Complete</Badge>;
      case 'none': return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">Not Started</Badge>;
      default: return null;
    }
  };

  // Today's date for comparison
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Group items by date
  const itemsByDate = useMemo(() => {
    const grouped: Record<string, LearningItem[]> = {};
    
    items.forEach(item => {
      if (!item.date) return;
      
      const dateKey = getDateStr(item.date);
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(item);
    });
    
    return grouped;
  }, [items]);

  // Get dates sorted in descending order (newest first)
  const sortedDates = useMemo(() => {
    return Object.keys(itemsByDate).sort((a, b) => {
      return new Date(b).getTime() - new Date(a).getTime();
    });
  }, [itemsByDate]);

  // Handle date selection
  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    onDateSelect(date);
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
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold hidden md:block">Overview</h2>
        <Button 
          onClick={() => onAddItem(selectedDate)} 
          className="ml-auto"
        >
          <Plus className="w-4 h-4 mr-2" /> Add Item
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Today's Items</h3>
              <p className="text-2xl font-bold mt-1">
                {itemsByDate[getDateStr(new Date())]?.length || 0}
              </p>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/30 p-3 rounded-full">
              <CalendarCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">In Progress</h3>
              <p className="text-2xl font-bold mt-1">
                {items.filter(item => !item.completed).length}
              </p>
            </div>
            <div className="bg-amber-50 dark:bg-amber-900/30 p-3 rounded-full">
              <Timer className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Completed</h3>
              <p className="text-2xl font-bold mt-1">
                {items.filter(item => item.completed).length}
              </p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/30 p-3 rounded-full">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total</h3>
              <p className="text-2xl font-bold mt-1">
                {items.length}
              </p>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/30 p-3 rounded-full">
              <BookOpen className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-medium mb-4">Calendar</h3>
        <div className="overflow-x-auto">
          <Calendar
            mode="single"
            selected={selectedDate || undefined}
            onSelect={(date: Date | undefined) => date && handleDateSelect(date)}
            className="rounded border"
            initialFocus
          />
        </div>
      </div>

      <div className="space-y-2 mt-6">
        <h3 className="text-lg font-medium mb-4">Recent Learning Items</h3>
        
        {sortedDates.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No learning items yet</h3>
            <p className="text-gray-500 mb-6">Track your learning by adding items</p>
            <Button 
              onClick={() => onAddItem(selectedDate)}
            >
              <Plus className="w-4 h-4 mr-2" /> Add Your First Item
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedDates.map(dateStr => (
              <div key={dateStr} className="space-y-3">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-gray-500" />
                  <h4 className="text-md font-medium">
                    {new Date(dateStr).toLocaleDateString(undefined, {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </h4>
                </div>
                
                <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                  {itemsByDate[dateStr].map(item => (
                    <Card key={item.id} className="overflow-hidden bg-white dark:bg-gray-800 shadow-sm">
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <CardTitle className="text-base font-medium">{item.title}</CardTitle>
                            <CardDescription className="text-sm text-gray-500">
                              {item.category}
                            </CardDescription>
                          </div>
                          <div className="flex items-center gap-2">
                            {item.completed ? (
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                Completed
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                In Progress
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      
                      <CardContent className="text-sm">
                        {showDetails[item.id] && (
                          <div className="mt-2 space-y-2">
                            {item.notes && (
                              <div>
                                <p className="font-medium text-xs text-gray-500 mb-1">Notes:</p>
                                <p className="text-gray-600 dark:text-gray-400">{item.notes}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </CardContent>
                      
                      <CardFooter className="flex justify-end pt-0 px-4 pb-4 gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleDetails(item.id)}
                          className="h-8 text-xs"
                        >
                          {showDetails[item.id] ? 'Hide Details' : 'Show Details'}
                        </Button>
                        
                        {!item.completed ? (
                          <Button
                            size="sm"
                            onClick={() => onUpdate(item.id, { completed: true })}
                            className="h-8 text-xs bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="w-3 h-3 mr-1" /> Mark Complete
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onUpdate(item.id, { completed: false })}
                            className="h-8 text-xs"
                          >
                            <RefreshCw className="w-3 h-3 mr-1" /> Mark Incomplete
                          </Button>
                        )}
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
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