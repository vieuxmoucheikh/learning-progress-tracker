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
  const [sortBy, setSortBy] = useState("date");

  const categories = Array.from(new Set(items.map(item => item.category)));

  const filteredItems = items.filter(item => {
    const matchesSearch = 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.notes?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
    
    const matchesStatus = statusFilter === "all" ||
      (statusFilter === "not_started" && !item.started) ||
      (statusFilter === "in_progress" && item.started && !item.completed) ||
      (statusFilter === "completed" && item.completed) ||
      (statusFilter === "on_hold" && item.on_hold) ||
      (statusFilter === "archived" && item.archived);

    return matchesSearch && matchesCategory && matchesStatus;
  }).sort((a, b) => {
    switch (sortBy) {
      case "date":
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      case "priority":
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      case "title":
        return a.title.localeCompare(b.title);
      case "progress":
        const aProgress = (a.progress?.current?.hours || 0) / (a.progress?.total?.hours || 1);
        const bProgress = (b.progress?.current?.hours || 0) / (b.progress?.total?.hours || 1);
        return bProgress - aProgress;
      case "time_spent":
        const aTimeSpent = a.progress?.current?.hours || 0;
        const bTimeSpent = b.progress?.current?.hours || 0;
        return bTimeSpent - aTimeSpent;
      default:
        return 0;
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              type="text"
              placeholder="Search by title, category, or notes..."
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
            { value: "not_started", label: "Not Started" },
            { value: "in_progress", label: "In Progress" },
            { value: "completed", label: "Completed" },
            { value: "on_hold", label: "On Hold" },
            { value: "archived", label: "Archived" }
          ]}
          className="w-full sm:w-48"
        />

        <Select
          value={sortBy}
          onValueChange={setSortBy}
          items={[
            { value: "date", label: "Sort by Date" },
            { value: "priority", label: "Sort by Priority" },
            { value: "title", label: "Sort by Title" },
            { value: "progress", label: "Sort by Progress" },
            { value: "time_spent", label: "Sort by Time Spent" }
          ]}
          className="w-full sm:w-48"
        />
      </div>

      {filteredItems.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">No items found</p>
          <p className="text-sm text-gray-400">Try adjusting your search or filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 mt-6">
          {filteredItems.map((item) => (
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
