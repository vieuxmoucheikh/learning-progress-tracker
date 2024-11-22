import { StreakDisplay } from "./StreakDisplay";
import { Stats } from "./Stats";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Plus } from "lucide-react";
import { LearningItem } from "@/types";

interface DashboardTabProps {
  items: LearningItem[];
  onAddItem: () => void;
  onUpdate: (item: LearningItem) => void;
}

export function DashboardTab({ items, onAddItem, onUpdate }: DashboardTabProps) {
  const inProgressItems = items.filter(item => !item.completed);
  
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

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">In Progress Items</h2>
          <Button onClick={onAddItem} className="bg-blue-500 hover:bg-blue-600">
            <Plus className="w-4 h-4 mr-2" />
            Add Item
          </Button>
        </div>
        
        <div className="grid grid-cols-1 gap-4">
          {inProgressItems.slice(0, 3).map(item => (
            <Card key={item.id} className="p-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-medium">{item.title}</h3>
                  <p className="text-sm text-gray-500">{item.category}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-blue-600">
                    {Math.round((item.progress?.current?.hours || 0) / (item.progress?.target?.hours || 1) * 100)}%
                  </p>
                  <p className="text-xs text-gray-500">
                    {item.progress?.current?.hours || 0}h / {item.progress?.target?.hours || 0}h
                  </p>
                </div>
              </div>
              <div className="mt-2 h-2 bg-blue-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all duration-300"
                  style={{
                    width: `${Math.round((item.progress?.current?.hours || 0) / (item.progress?.target?.hours || 1) * 100)}%`
                  }}
                />
              </div>
            </Card>
          ))}
          {inProgressItems.length > 3 && (
            <Button
              variant="outline"
              onClick={() => window.location.hash = "#items"}
              className="w-full"
            >
              View All ({inProgressItems.length}) Items
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
