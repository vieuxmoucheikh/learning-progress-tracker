import { useState, useMemo } from "react";
import { LearningItem } from "@/types";
import LearningItemCard from "./LearningItemCard";
import { Input } from "./ui/input";
import { CustomSelect } from "./ui/select";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RichTextEditor } from "./RichTextEditor";
import { EnhancedLearningCard, defaultBackgroundColors } from "@/lib/learningCards";

interface ItemsTabProps {
  items: EnhancedLearningCard[];
  onAddItem: (selectedDate?: Date) => void;
  onUpdate: (id: string, updates: Partial<EnhancedLearningCard>) => void;
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
  const [editingId, setEditingId] = useState<string | null>(null);

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

  const handleEdit = (id: string) => {
    setEditingId(id);
  };

  const handleSave = async (id: string) => {
    setEditingId(null);
  };

  const handleCancel = () => {
    setEditingId(null);
  };

  return (
    <div className="space-y-6">
      {/* Controls Section */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          {/* Search Input */}
          <div className="flex-1 w-full sm:w-auto relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn(
                "pl-9 max-w-md",
                "bg-white dark:bg-white",
                "text-gray-900 dark:text-gray-900",
                "border-gray-200",
                "focus-visible:ring-2 focus-visible:ring-blue-500",
                "placeholder:text-gray-500"
              )}
            />
          </div>
          {/* Filter Selects */}
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <CustomSelect
              value={selectedStatus}
              onValueChange={setSelectedStatus}
              className={cn(
                "w-full sm:w-[180px]",
                "bg-white dark:bg-white",
                "text-gray-900 dark:text-gray-900"
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
                "bg-white dark:bg-white",
                "text-gray-900 dark:text-gray-900"
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
              <div
                key={item.id}
                className={cn(
                  "rounded-lg border p-4",
                  item.backgroundColor || "bg-white",
                  editingId === item.id ? "ring-2 ring-blue-500" : ""
                )}
              >
                {editingId === item.id ? (
                  <div className="space-y-4">
                    <div>
                      <Label>Title</Label>
                      <Input
                        value={item.title}
                        onChange={(e) =>
                          onUpdate(item.id, { title: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <Label>Content</Label>
                      <RichTextEditor
                        content={item.content}
                        onChange={(content) =>
                          onUpdate(item.id, { content })
                        }
                      />
                    </div>
                    <div>
                      <Label>Category</Label>
                      <Select
                        value={item.category}
                        onValueChange={(category) =>
                          onUpdate(item.id, { category })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from(new Set(items.map(item => item.category?.toLowerCase() || '').filter(Boolean)))
                            .sort()
                            .map(category => (
                              <SelectItem key={category} value={category}>
                                {category}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Background Color</Label>
                      <Select
                        value={item.backgroundColor || "bg-white"}
                        onValueChange={(color) =>
                          onUpdate(item.id, { backgroundColor: color })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {defaultBackgroundColors.map((color) => (
                            <SelectItem 
                              key={color.value} 
                              value={color.value}
                              className={cn("flex items-center gap-2", color.value)}
                            >
                              <div className={cn("w-4 h-4 rounded border", color.value)} />
                              {color.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={handleCancel}>
                        Cancel
                      </Button>
                      <Button onClick={() => handleSave(item.id)}>Save</Button>
                    </div>
                  </div>
                ) : (
                  <LearningItemCard
                    item={item}
                    onUpdate={onUpdate}
                    onDelete={onDelete}
                    onStartTracking={onStartTracking}
                    onStopTracking={onStopTracking}
                    onNotesUpdate={onNotesUpdate}
                    onSetActiveItem={onSetActiveItem}
                    onSessionNoteAdd={onSessionNoteAdd}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
