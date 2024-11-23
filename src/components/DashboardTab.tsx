import * as React from 'react';
import { useState } from "react";
import { StreakDisplay } from "./StreakDisplay";
import { Stats } from "./Stats";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Plus } from "lucide-react";
import { LearningItem, Session } from "@/types";
import { Calendar } from "./Calendar";

interface DashboardTabProps {
  items: LearningItem[];
  onAddItem: () => void;
  onUpdate: (item: LearningItem) => void;
  onDateSelect: (date: Date) => void;
}

export function DashboardTab({ items, onAddItem, onUpdate, onDateSelect }: DashboardTabProps) {
  const inProgressItems = items.filter(item => !item.completed);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  
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

  const selectedDateItems = getItemsForSelectedDate();
  
  return (
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
          <h2 className="text-lg font-semibold mb-4">Activity Calendar</h2>
          <Calendar 
            items={items} 
            onDateSelect={handleDateSelect} 
          />
        </Card>

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
                    <span className={`px-2 py-1 rounded text-sm ${
                      item.completed 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {item.completed ? 'Completed' : 'In Progress'}
                    </span>
                  </div>
                  
                  <div className="mt-2 space-y-2 text-sm text-gray-600">
                    <div>Category: {item.category}</div>
                    <div>Priority: {item.priority}</div>
                    <div className="flex items-center">
                      <div className="flex-1">
                        Progress: {item.progress?.current?.hours}h {item.progress?.current?.minutes}m 
                        / {item.progress?.total?.hours}h {item.progress?.total?.minutes}m
                      </div>
                      <div className="ml-2">
                        ({Math.round((item.progress?.current?.hours || 0) / (item.progress?.total?.hours || 1) * 100)}%)
                      </div>
                    </div>
                    
                    {item.progress?.sessions?.filter(session => {
                      const sessionDate = new Date(session.date).toISOString().split('T')[0];
                      const selectedDateStr = selectedDate.toISOString().split('T')[0];
                      return sessionDate === selectedDateStr;
                    }).map((session, index) => {
                      const duration = calculateSessionDuration(session);
                      return (
                        <div key={index} className="bg-gray-50 p-2 rounded mt-2">
                          <div className="flex justify-between items-center">
                            <div>
                              Duration: {duration.hours}h {duration.minutes}m
                            </div>
                            <div className="text-sm text-gray-500">
                              {new Date(session.startTime).toLocaleTimeString()} 
                              {session.endTime && ` - ${new Date(session.endTime).toLocaleTimeString()}`}
                            </div>
                          </div>
                          {session.notes && session.notes.length > 0 && (
                            <div className="mt-1 text-gray-600 italic space-y-1">
                              {session.notes.map((note, i) => (
                                <div key={i}>"{note}"</div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    
                    {item.notes && (
                      <div className="mt-2 text-gray-600">
                        <div className="font-medium">Notes:</div>
                        <div className="italic">{item.notes}</div>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
