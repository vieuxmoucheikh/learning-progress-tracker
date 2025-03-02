import * as React from 'react';
import { useState, useCallback, useEffect, useMemo } from "react";
import { StreakDisplay } from "./StreakDisplay";
import { Stats } from "./Stats";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Plus, BookOpen, CheckCircle, Clock, Target, Calendar as CalendarIcon } from "lucide-react";
import { LearningItem, Session } from "@/types";
import { Calendar } from "./Calendar";
import LearningItemCard from './LearningItemCard';

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
            // Legacy fallback if duration isn't available
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
          // For active sessions (no endTime) that started on the selected date
          if (sessionDate === dateStr && !session.endTime) {
            try {
              // Check if this session is paused
              const isPaused = session.status === 'on_hold';
              
              // ALWAYS check for centralized time sources first
              const currentTimeSecondsStr = localStorage.getItem(`sessionCurrentTimeSeconds_${item.id}`);
              
              if (currentTimeSecondsStr) {
                // Use our centralized time source for consistency
                const currentTimeSeconds = parseInt(currentTimeSecondsStr, 10);
                const currentTimeMinutes = Math.floor(currentTimeSeconds / 60);
                
                // Add to daily time spent
                dailyTimeSpent += currentTimeMinutes;
              }
              else {
                const startTime = new Date(session.startTime);
                if (!isNaN(startTime.getTime())) {  // Check if startTime is valid
                  
                  if (isPaused) {
                    // For paused sessions, use the frozen time stored during the pause
                    const frozenTimeStr = localStorage.getItem(`sessionFrozenTime_${item.id}`);
                    if (frozenTimeStr) {
                      // Use seconds directly from frozen time
                      const frozenSeconds = parseInt(frozenTimeStr, 10);
                      dailyTimeSpent += Math.floor(frozenSeconds / 60);
                    } else {
                      // Fallback: get the pause time from localStorage
                      const pauseTimeStr = localStorage.getItem(`sessionPauseTime_${item.id}`);
                      if (pauseTimeStr) {
                        const pauseTime = new Date(parseInt(pauseTimeStr, 10));
                        if (!isNaN(pauseTime.getTime())) {
                          // Calculate minutes until the pause point
                          const pausedMinutes = Math.floor((pauseTime.getTime() - startTime.getTime()) / (1000 * 60));
                          
                          // Get accumulated time (for previous pauses in this session)
                          const accumulatedTimeStr = localStorage.getItem(`sessionAccumulatedTime_${item.id}`);
                          const accumulatedSeconds = accumulatedTimeStr ? parseInt(accumulatedTimeStr, 10) : 0;
                          const accumulatedMinutes = Math.floor(accumulatedSeconds / 60);
                          
                          // Add paused time minus accumulated time (to avoid double counting)
                          if (pausedMinutes > accumulatedMinutes) {
                            dailyTimeSpent += (pausedMinutes - accumulatedMinutes);
                          }
                        }
                      }
                    }
                  } else {
                    // For active sessions, fallback to direct calculation
                    const now = new Date();
                    
                    // Get accumulated time (for previous pauses)
                    const accumulatedTimeStr = localStorage.getItem(`sessionAccumulatedTime_${item.id}`);
                    const accumulatedSeconds = accumulatedTimeStr ? parseInt(accumulatedTimeStr, 10) : 0;
                    const accumulatedMinutes = Math.floor(accumulatedSeconds / 60);
                    
                    // Calculate active minutes, adjusting for accumulated pause time
                    const totalMinutes = Math.floor((now.getTime() - startTime.getTime()) / (1000 * 60));
                    
                    // Only count positive time values
                    if (totalMinutes > accumulatedMinutes) {
                      dailyTimeSpent += (totalMinutes - accumulatedMinutes);
                    }
                  }
                }
              }
            } catch (error) {
              console.error('Error calculating active session time:', error);
            }
          }
        });
      }
    });

    return {
      dailyTimeSpentHours: Math.floor(dailyTimeSpent / 60),
      dailyTimeSpentMinutes: dailyTimeSpent % 60
    };
  }, [items, selectedDate, getDateStr]);

  return (
    <div className="space-y-4">
      {/* Stats Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Card className="p-4 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Time Invested Today</h3>
              <p className="mt-2 text-3xl font-semibold text-purple-600">
                {stats.dailyTimeSpentHours}h {stats.dailyTimeSpentMinutes}m
              </p>
            </div>
            <div className="p-2 bg-purple-50 rounded-lg">
              <Clock className="w-5 h-5 text-purple-500" />
            </div>
          </div>
        </Card>
        <Card className="p-4 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Completed Today</h3>
              <p className="mt-2 text-3xl font-semibold text-green-600">{completedTasks.length}</p>
            </div>
            <div className="p-2 bg-green-50 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-500" />
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Calendar Section */}
        <Card className="p-4 lg:col-span-1 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-gray-100 rounded-lg">
                <CalendarIcon className="w-5 h-5 text-gray-600" />
              </div>
              <h2 className="text-lg font-semibold">Calendar</h2>
            </div>
            <Button onClick={() => onAddItem(selectedDate)} className="gap-2 bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4" />
              Add Item
            </Button>
          </div>
          <div className="max-w-sm mx-auto">
            <Calendar 
              items={items}
              onDateSelect={handleDateSelect}
              selectedDate={selectedDate}
              onAddItem={onAddItem}
            />
          </div>
        </Card>

        {/* Tasks Section */}
        <div className="lg:col-span-2 grid gap-4">
          {/* Active Tasks */}
          <Card className="p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-50 rounded-lg">
                  <Target className="w-5 h-5 text-blue-500" />
                </div>
                <h2 className="text-lg font-semibold">Today's Goals</h2>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                {activeTasks.length} items
              </span>
            </div>
            {activeTasks.length === 0 ? (
              <div className="text-center py-8">
                <div className="p-3 bg-gray-50 rounded-full inline-block mb-3">
                  <Target className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900">No goals for today</h3>
                <p className="text-gray-500 mt-1">Add some tasks to get started</p>
              </div>
            ) : (
              <div className="space-y-2">
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

          {/* Completed Tasks */}
          <Card className="p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-green-50 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                </div>
                <h2 className="text-lg font-semibold">Completed Today</h2>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-sm font-medium bg-green-100 text-green-800">
                {completedTasks.length} items
              </span>
            </div>
            {completedTasks.length === 0 ? (
              <div className="text-center py-8">
                <div className="p-3 bg-gray-50 rounded-full inline-block mb-3">
                  <CheckCircle className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900">No completed tasks</h3>
                <p className="text-gray-500 mt-1">Complete some tasks to see them here</p>
              </div>
            ) : (
              <div className="space-y-2">
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
      </div>
    </div>
  );
}