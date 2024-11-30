import * as React from 'react';
import { useState, useCallback, useEffect } from "react";
import { StreakDisplay } from "./StreakDisplay";
import { Stats } from "./Stats";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Plus } from "lucide-react";
import { LearningItem, Session } from "@/types";
import { Calendar } from "./Calendar";
import { Calendar as CalendarIcon } from 'lucide-react';
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
  onAddItem: (date?: Date) => void;
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

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Calendar Section - Takes up 2/5 of the space */}
        <div className="lg:col-span-2">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Calendar</h3>
              <Button 
                onClick={() => onAddItem(selectedDate ?? undefined)}
                className="gap-2 bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
                Add Item
              </Button>
            </div>
            <Calendar 
              items={items} 
              onDateSelect={handleDateSelect}
              selectedDate={selectedDate}
              onAddItem={() => onAddItem(selectedDate ?? undefined)}
            />
          </Card>
        </div>

        {/* Tasks Section - Takes up 3/5 of the space */}
        <div className="lg:col-span-3 space-y-6">
          {/* Active Tasks */}
          {activeTasks.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Active Tasks</h3>
              <div className="space-y-4">
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
            </div>
          )}

          {/* Completed Tasks */}
          {completedTasks.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Completed Tasks</h3>
              <div className="space-y-4">
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
            </div>
          )}

          {/* No Tasks Message */}
          {activeTasks.length === 0 && completedTasks.length === 0 && (
            <Card className="p-6 text-center">
              <h3 className="text-lg font-semibold mb-2">No Tasks for Selected Date</h3>
              <p className="text-muted-foreground mb-4">Add a new task or select a different date</p>
              <Button 
                onClick={() => onAddItem(selectedDate ?? undefined)}
                className="gap-2 bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
                Add New Task
              </Button>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
