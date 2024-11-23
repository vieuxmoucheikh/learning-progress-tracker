import * as React from 'react';
import { useState } from "react";
import { StreakDisplay } from "./StreakDisplay";
import { Stats } from "./Stats";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Plus } from "lucide-react";
import { LearningItem } from "@/types";
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
            <h2 className="text-lg font-semibold">In Progress Items</h2>
            <Button onClick={() => onAddItem()} className="bg-blue-500 hover:bg-blue-600">
              <Plus className="w-4 h-4 mr-2" />
              Add Item
              {selectedDate && <span className="ml-2 text-xs">({selectedDate.toLocaleDateString()})</span>}
            </Button>
          </div>
          
          <div className="space-y-4">
            {inProgressItems.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No items in progress</p>
            ) : (
              inProgressItems.map(item => (
                <div key={item.id} className="p-4 border rounded-lg">
                  <h3 className="font-medium">{item.title}</h3>
                  <div className="text-sm text-gray-500 mt-1">
                    Progress: {item.progress?.current?.hours}h {item.progress?.current?.minutes}m / {item.progress?.total?.hours}h {item.progress?.total?.minutes}m
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
