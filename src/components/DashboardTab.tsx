import * as React from 'react';
import { useState } from "react";
import { StreakDisplay } from "./StreakDisplay";
import { Stats } from "./Stats";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Plus } from "lucide-react";
import { LearningItem, Session } from "@/types";
import { Calendar } from "./Calendar";
import { Calendar as CalendarIcon } from 'lucide-react';

interface DashboardTabProps {
  items: LearningItem[];
  onAddItem: (date?: Date) => void;
  onUpdate: (id: string, updates: Partial<LearningItem>) => void;
  onDateSelect: (date: Date) => void;
}

export function DashboardTab({ items, onAddItem, onUpdate, onDateSelect }: DashboardTabProps) {
  const inProgressItems = items.filter(item => !item.completed);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);

  const handleDateSelect = (date: Date, activeTasks: any[], completedTasks: any[]) => {
    setSelectedDate(date);
    onDateSelect(date);
  };

  const getItemsForSelectedDate = () => {
    if (!selectedDate) return [];
    const dateStr = selectedDate.toISOString().split('T')[0];
    return items.filter(item => {
      // Check if the item was created on this date
      const itemDate = new Date(item.date).toISOString().split('T')[0];
      // Or if any session was logged on this date
      const hasSessionOnDate = item.progress?.sessions?.some(session => {
        const sessionDate = new Date(session.date).toISOString().split('T')[0];
        return sessionDate === dateStr;
      });
      return itemDate === dateStr || hasSessionOnDate;
    });
  };

  const calculateSessionDuration = (session: Session) => {
    if (session.duration) {
      return session.duration;
    }
    if (session.startTime && session.endTime) {
      const start = new Date(session.startTime).getTime();
      const end = new Date(session.endTime).getTime();
      const durationMs = end - start;
      const hours = Math.floor(durationMs / (1000 * 60 * 60));
      const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
      return { hours, minutes };
    }
    return { hours: 0, minutes: 0 };
  };

  const handleUpdateItem = (item: LearningItem, updates: Partial<LearningItem>) => {
    onUpdate(item.id, updates);
  };

  const selectedDateItems = getItemsForSelectedDate();
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Button
          onClick={() => setShowCalendar(!showCalendar)}
          variant="outline"
          className="flex items-center gap-2"
        >
          <CalendarIcon className="h-4 w-4" />
          {showCalendar ? 'Hide Calendar' : 'Show Calendar'}
        </Button>
      </div>
      
      {showCalendar && (
        <div className="mb-6">
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Activity Calendar</h2>
            <Calendar 
              items={items} 
              onDateSelect={handleDateSelect}
              selectedDate={selectedDate}
            />
          </Card>
        </div>
      )}
      
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Your Progress</h2>
            <StreakDisplay items={items} />
          </Card>
          
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Statistics</h2>
            <Stats items={items} />
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">
                {selectedDate 
                  ? `Items for ${selectedDate.toLocaleDateString()}`
                  : 'Select a date to view items'}
              </h2>
              <Button onClick={() => onAddItem()} className="bg-blue-500 hover:bg-blue-600">
                <Plus className="w-4 h-4 mr-2" />
                Add Item
              </Button>
            </div>
            
            <div className="space-y-4 max-h-[500px] overflow-y-auto">
              {!selectedDate ? (
                <p className="text-gray-500 text-center py-4">Select a date to view items</p>
              ) : selectedDateItems.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No items found for this date</p>
              ) : (
                selectedDateItems.map(item => (
                  <div key={item.id} className="p-4 border rounded-lg hover:border-blue-500 transition-colors">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-lg">{item.title}</h3>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleUpdateItem(item, {
                            completed: !item.completed,
                            completed_at: !item.completed ? new Date().toISOString() : null,
                            status: !item.completed ? 'completed' : 'not_started'
                          })}
                          className={`px-2 py-1 rounded text-sm ${
                            item.completed 
                              ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                              : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                          }`}
                        >
                          {item.completed ? 'Completed' : 'Mark Complete'}
                        </button>
                      </div>
                    </div>
                    
                    <div className="mt-2 space-y-2 text-sm text-gray-600">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="p-2 bg-gray-50 rounded">
                          <span className="font-medium">Category:</span> {item.category}
                        </div>
                        <div className="p-2 bg-gray-50 rounded">
                          <span className="font-medium">Priority:</span> {item.priority}
                        </div>
                      </div>
                      
                      <div className="p-2 bg-gray-50 rounded">
                        <div className="flex items-center">
                          <div className="flex-1">
                            <span className="font-medium">Progress:</span> {item.progress?.current?.hours}h {item.progress?.current?.minutes}m 
                            / {item.progress?.total?.hours}h {item.progress?.total?.minutes}m
                          </div>
                          <div className="ml-2 font-medium">
                            ({Math.round((item.progress?.current?.hours || 0) / (item.progress?.total?.hours || 1) * 100)}%)
                          </div>
                        </div>
                      </div>
                      
                      {item.notes && (
                        <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                          <div className="font-medium text-blue-800 mb-1">Notes:</div>
                          <div className="italic text-blue-700">{item.notes}</div>
                        </div>
                      )}
                      
                      {item.progress?.sessions?.filter(session => {
                        const sessionDate = new Date(session.date).toISOString().split('T')[0];
                        const selectedDateStr = selectedDate.toISOString().split('T')[0];
                        return sessionDate === selectedDateStr;
                      }).map((session, index) => {
                        const duration = calculateSessionDuration(session);
                        return (
                          <div key={index} className="p-3 bg-green-50 rounded-lg border border-green-100">
                            <div className="flex justify-between items-center text-green-800">
                              <div className="font-medium">
                                Duration: {duration.hours}h {duration.minutes}m
                              </div>
                              <div className="text-sm">
                                {new Date(session.startTime).toLocaleTimeString()} 
                                {session.endTime && ` - ${new Date(session.endTime).toLocaleTimeString()}`}
                              </div>
                            </div>
                            {session.notes && session.notes.length > 0 && (
                              <div className="mt-2 space-y-1">
                                <div className="font-medium text-green-800">Session Notes:</div>
                                {session.notes.map((note, i) => (
                                  <div key={i} className="italic text-green-700 pl-2 border-l-2 border-green-200">
                                    "{typeof note === 'string' ? note : note.content}"
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
