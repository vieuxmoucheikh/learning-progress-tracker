import { useState, useMemo } from "react";
import { LearningItem } from "@/types";
import LearningItemCard from "./LearningItemCard";
import { Input } from "./ui/input";
import { Select } from "./ui/select";
import { Search } from "lucide-react";

interface ItemsTabProps {
  items: LearningItem[];
  onAddItem: (selectedDate?: Date) => void;
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
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Helper function to get date string in YYYY-MM-DD format
  const getDateStr = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Filter items based on search, status and category
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = selectedStatus === 'all' || item.status === selectedStatus;
      const matchesCategory = selectedCategory === 'all' || 
        (item.category?.toLowerCase() === selectedCategory.toLowerCase());
      
      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [items, searchQuery, selectedStatus, selectedCategory]);

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
          <Select
            value={selectedCategory}
            onValueChange={setSelectedCategory}
            className="w-full sm:w-[180px]"
            items={[
              { value: 'all', label: 'All Categories' },
              ...Array.from(new Set(items.map(item => item.category?.toLowerCase() || '').filter(Boolean)))
                .sort()
                .map(category => ({
                  value: category,
                  label: category.charAt(0).toUpperCase() + category.slice(1)
                }))
            ]}
          />
        </div>
      </div>

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
