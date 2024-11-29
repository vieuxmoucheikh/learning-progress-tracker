import { useState, useMemo } from "react";
import { LearningItem } from "@/types";
import LearningItemCard from "./LearningItemCard";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Select } from "./ui/select";
import { Plus, Search, Calendar as CalendarIcon } from "lucide-react";
import { Card } from "./ui/card";
import { Calendar } from "./Calendar";

interface ItemsTabProps {
  items: LearningItem[];
  onAddItem: () => void;
  onUpdate: (id: string, updates: Partial<LearningItem>) => void;
  onDelete: (id: string) => void;
  onStartTracking: (id: string) => void;
  onStopTracking: (id: string) => void;
  onNotesUpdate: (id: string, notes: string) => void;
  onSessionNoteAdd: (id: string, note: string) => void;
  onSetActiveItem: (id: string | null) => void;
}

export function ItemsTab({ 
  items, 
  onAddItem,
  onUpdate, 
  onDelete,
  onStartTracking,
  onStopTracking,
  onNotesUpdate,
  onSessionNoteAdd,
  onSetActiveItem 
}: ItemsTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Filter items based on search and status
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase());
      if (selectedStatus === 'all') return matchesSearch;
      return matchesSearch && item.status === selectedStatus;
    });
  }, [items, searchQuery, selectedStatus]);

  const handleDateSelect = (date: Date, activeTasks: LearningItem[], completedTasks: LearningItem[]) => {
    setSelectedDate(date);
    // You can add additional logic here if needed, such as filtering items by date
  };

  return (
    <div className="space-y-6">
      {/* Controls Section */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex-1 w-full sm:w-auto">
          <Input
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-md"
          />
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Select
            value={selectedStatus}
            onValueChange={setSelectedStatus}
            className="w-full sm:w-[180px]"
            items={[
              { value: 'all', label: 'All Items' },
              { value: 'not_started', label: 'Not Started' },
              { value: 'in_progress', label: 'In Progress' },
              { value: 'completed', label: 'Completed' },
              { value: 'on_hold', label: 'On Hold' },
              { value: 'archived', label: 'Archived' }
            ]}
          />
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => setShowCalendar(!showCalendar)}
          >
            <CalendarIcon className="h-4 w-4" />
            {showCalendar ? 'Hide Calendar' : 'Show Calendar'}
          </Button>
          <Button onClick={() => onAddItem()} className="gap-2 bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4" />
            Add Item
          </Button>
        </div>
      </div>

      {/* Calendar Section */}
      {showCalendar && (
        <Card className="p-4">
          <Calendar 
            items={items}
            onDateSelect={handleDateSelect}
            selectedDate={selectedDate}
            onAddItem={onAddItem}
          />
        </Card>
      )}

      {/* Items List */}
      <div className="space-y-4">
        {filteredItems.map((item) => (
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
  );
}
