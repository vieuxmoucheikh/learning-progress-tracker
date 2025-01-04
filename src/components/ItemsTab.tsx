import { useState, useMemo } from "react";
import { LearningItem } from "@/types";
import LearningItemCard from "./LearningItemCard";
import { Input } from "./ui/input";
import { CustomSelect } from "./ui/select";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

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
      <div className="bg-gray-50 p-4 rounded-xl shadow-sm border border-gray-200">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex-1 w-full sm:w-auto relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn(
                "pl-9 max-w-md",
                "bg-gray-50",
                "text-gray-900",
                "border-gray-200",
                "focus-visible:ring-2 focus-visible:ring-blue-500",
                "placeholder:text-gray-500"
              )}
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <CustomSelect
              value={selectedStatus}
              onValueChange={setSelectedStatus}
              className={cn(
                "w-full sm:w-[180px]",
                "bg-gray-50",
                "text-gray-900"
              )}
              items={[
                { value: 'all', label: 'All Items' },
                { value: 'not_started', label: 'Not Started' },
                { value: 'in_progress', label: 'In Progress' },
                { value: 'completed', label: 'Completed' },
                { value: 'on_hold', label: 'On Hold' },
                { value: 'archived', label: 'Archived' }
              ]}
            />
            <CustomSelect
              value={selectedCategory}
              onValueChange={setSelectedCategory}
              className={cn(
                "w-full sm:w-[180px]",
                "bg-gray-50",
                "text-gray-900"
              )}
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
      </div>

      {/* Summary Section */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-sm font-medium text-gray-500">Total Items</h3>
          <p className="mt-2 text-3xl font-semibold">{filteredItems.length}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-sm font-medium text-gray-500">In Progress</h3>
          <p className="mt-2 text-3xl font-semibold text-blue-600">
            {filteredItems.filter(item => item.status === 'in_progress').length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-sm font-medium text-gray-500">Completed</h3>
          <p className="mt-2 text-3xl font-semibold text-green-600">
            {filteredItems.filter(item => item.status === 'completed').length}
          </p>
        </div>
      </div>

      {/* Items List with Empty State */}
      <div className="space-y-4">
        {filteredItems.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="text-gray-400 mb-2">
              <Search className="h-12 w-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900">No items found</h3>
            <p className="text-gray-500 mt-1">
              Try adjusting your search or filter criteria
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
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
        )}
      </div>
    </div>
  );
}
