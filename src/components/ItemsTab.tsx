import { useState } from "react";
import { LearningItem } from "@/types";
import { LearningItemCard } from "./LearningItemCard";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Select } from "./ui/select";
import { Plus, Search } from "lucide-react";

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
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const categories = Array.from(new Set(items.map(item => item.category)));

  const filteredItems = items.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
    
    const matchesStatus = statusFilter === "all" ||
      (statusFilter === "completed" && item.completed) ||
      (statusFilter === "in-progress" && !item.completed);

    return matchesSearch && matchesCategory && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              type="text"
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <Select
          value={categoryFilter}
          onValueChange={setCategoryFilter}
          items={[
            { value: "all", label: "All Categories" },
            ...categories.map(cat => ({ value: cat, label: cat }))
          ]}
          className="w-full sm:w-48"
        />
        
        <Select
          value={statusFilter}
          onValueChange={setStatusFilter}
          items={[
            { value: "all", label: "All Status" },
            { value: "in-progress", label: "In Progress" },
            { value: "completed", label: "Completed" }
          ]}
          className="w-full sm:w-48"
        />
        
        <Button onClick={onAddItem} className="w-full sm:w-auto bg-blue-500 hover:bg-blue-600">
          <Plus className="w-4 h-4 mr-2" />
          Add Item
        </Button>
      </div>

      {filteredItems.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">No items found</p>
          <Button onClick={onAddItem} variant="outline">
            Add Your First Item
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredItems.map(item => (
            <LearningItemCard
              key={item.id}
              item={item}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onStartTracking={onStartTracking}
              onStopTracking={onStopTracking}
              onNotesUpdate={onNotesUpdate}
              onSessionNoteAdd={onSessionNoteAdd}
              onSetActiveItem={onSetActiveItem}
            />
          ))}
        </div>
      )}
    </div>
  );
}
