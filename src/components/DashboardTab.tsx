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

  return (
    <div className="space-y-4">
      {/* Stats Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="p-4">
          <h3 className="text-sm font-medium text-gray-500">Total Items</h3>
          <p className="mt-2 text-3xl font-semibold">{items.length}</p>
        </Card>
        <Card className="p-4">
          <h3 className="text-sm font-medium text-gray-500">Active Items</h3>
          <p className="mt-2 text-3xl font-semibold text-blue-600">
            {items.filter(item => item.status === 'in_progress').length}
          </p>
        </Card>
        <Card className="p-4">
          <h3 className="text-sm font-medium text-gray-500">Completed Today</h3>
          <p className="mt-2 text-3xl font-semibold text-green-600">{completedTasks.length}</p>
        </Card>
        <Card className="p-4">
          <h3 className="text-sm font-medium text-gray-500">Pending Today</h3>
          <p className="mt-2 text-3xl font-semibold text-yellow-600">{activeTasks.length}</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Calendar Section */}
        <Card className="p-4 lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Calendar</h2>
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
        <div className="lg:col-span-2 space-y-4">
          {/* Active Tasks */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Active Tasks</h2>
              <span className="px-2.5 py-0.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                {activeTasks.length} items
              </span>
            </div>
            {activeTasks.length === 0 ? (
              <Card className="p-6 text-center">
                <CalendarIcon className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                <h3 className="text-lg font-medium text-gray-900">No active tasks</h3>
                <p className="text-gray-500 mt-1">Add some tasks to get started</p>
              </Card>
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
          </div>

          {/* Completed Tasks */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Completed Tasks</h2>
              <span className="px-2.5 py-0.5 rounded-full text-sm font-medium bg-green-100 text-green-800">
                {completedTasks.length} items
              </span>
            </div>
            {completedTasks.length === 0 ? (
              <Card className="p-6 text-center">
                <CalendarIcon className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                <h3 className="text-lg font-medium text-gray-900">No completed tasks</h3>
                <p className="text-gray-500 mt-1">Complete some tasks to see them here</p>
              </Card>
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
          </div>
        </div>
      </div>
    </div>
  );
}
