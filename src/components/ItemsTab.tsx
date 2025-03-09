import React, { useState, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Search, Download, LucideCalendar, CalendarIcon, Plus, Filter, BookOpen } from 'lucide-react';
import LearningItemCard from "./LearningItemCard";
import { CustomSelect } from "./ui/select";
import type { Options as Html2PdfOptions } from 'html2pdf.js';
import type { LearningItem } from '@/types';
// @ts-ignore
import html2pdf from 'html2pdf.js';
import { cn } from "@/lib/utils";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { clsx } from "clsx";

interface ItemsTabProps {
  items: LearningItem[];
  onAddItem: () => void;
  onUpdate: (id: string, updates: Partial<LearningItem>) => void;
  onDelete: (id: string) => void;
  onStartTracking: (id: string) => void;
  onStopTracking: (id: string) => void;
  onNotesUpdate: (id: string, notes: string) => void;
  onSetActiveItem: (id: string | null) => void;
  onSessionNoteAdd: (id: string, note: string) => void;
}

export const ItemsTab: React.FC<ItemsTabProps> = ({
  items,
  onAddItem,
  onUpdate,
  onDelete,
  onStartTracking,
  onStopTracking,
  onNotesUpdate,
  onSetActiveItem,
  onSessionNoteAdd,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("all");
  const [newGoal, setNewGoal] = useState({
    title: '',
    targetDate: '',
    targetHours: 0,
    category: '',
    priority: 'medium' as const,
  });

  // Extract unique categories from items
  const categoryOptions = useMemo(() => {
    const categories = items
      .map(item => item.category)
      .filter((category): category is string => !!category); // Filter out undefined/null
    
    const uniqueCategories = Array.from(new Set(categories)).sort();
    
    return [
      { value: 'all', label: 'All Categories' },
      ...uniqueCategories.map(category => ({
        value: category,
        label: category.charAt(0).toUpperCase() + category.slice(1) // Capitalize first letter
      }))
    ];
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch =
        searchQuery === "" ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.notes && item.notes.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.category.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus =
        selectedStatus === "all" || 
        (selectedStatus === "completed" && item.completed) ||
        (selectedStatus === "not_started" && !item.completed && !item.progress?.current) ||
        (selectedStatus === "in_progress" && !item.completed && item.progress?.current);

      const matchesCategory =
        selectedCategoryFilter === "all" ||
        (item.category === selectedCategoryFilter);

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [items, searchQuery, selectedStatus, selectedCategoryFilter]);

  const exportToPdf = useCallback(() => {
    const element = document.createElement('div');
    element.className = 'pdf-container';
    
    // Add title
    const title = document.createElement('h1');
    title.textContent = 'Learning Cards';
    title.className = 'text-2xl font-bold mb-8 text-center';
    element.appendChild(title);
    
    // Create a copy of each card for the PDF
    filteredItems.forEach((item) => {
      const card = document.createElement('div');
      card.className = 'mb-8 p-6 border border-gray-200 rounded-lg';
      
      const cardTitle = document.createElement('h2');
      cardTitle.textContent = item.title;
      cardTitle.className = 'text-xl font-bold mb-4';
      card.appendChild(cardTitle);
      
      if (item.notes) {
        const cardNotes = document.createElement('div');
        cardNotes.innerHTML = item.notes;
        cardNotes.className = 'prose max-w-none';
        card.appendChild(cardNotes);
      }
      
      const cardInfo = document.createElement('div');
      cardInfo.className = 'mt-4 text-sm text-gray-600';
      cardInfo.innerHTML = `
        <div>Category: ${item.category}</div>
        <div>Status: ${item.completed ? 'Completed' : item.progress?.current ? 'In Progress' : 'Not Started'}</div>
        ${item.completed_at ? `<div>Completed: ${new Date(item.completed_at).toLocaleDateString()}</div>` : ''}
      `;
      card.appendChild(cardInfo);
      
      element.appendChild(card);
    });
    
    // Configure PDF options
    const opt: Html2PdfOptions = {
      margin: [15, 15],
      filename: 'learning-cards.pdf',
      image: { 
        type: 'jpeg', 
        quality: 0.98 
      },
      html2canvas: { 
        scale: 2,
        useCORS: true,
        letterRendering: true
      },
      jsPDF: { 
        unit: 'mm', 
        format: 'a4', 
        orientation: 'portrait'
      }
    };
    
    // Generate PDF
    html2pdf()
      .set(opt)
      .from(element)
      .save()
      .catch(error => {
        console.error('Error generating PDF:', error);
      });
  }, [filteredItems]);

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <div className="flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
            <BookOpen className="w-5 h-5 text-blue-500 dark:text-blue-400" />
          </div>
          <h2 className="text-xl font-semibold">Learning Items</h2>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportToPdf}
            className="export-button flex items-center gap-1 px-3 py-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded text-sm transition-colors"
          >
            <Download size={16} className="dark:text-white" />
            <span className="dark:text-white">Export</span>
          </button>
          <Button 
            onClick={onAddItem} 
            size="sm" 
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Item
          </Button>
        </div>
      </div>

      {/* Search and filters */}
      <div className="flex flex-col gap-4 bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg border border-gray-100 dark:border-gray-800">
        <div className="w-full">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <Input
              placeholder="Search items..."
              className="pl-10 h-12 text-base rounded-lg border-gray-200 dark:border-gray-700 focus:border-blue-500 focus:ring-blue-500 w-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Label className="text-sm text-gray-500 dark:text-gray-400 mb-1 block">Status</Label>
            <CustomSelect
              value={selectedStatus}
              onValueChange={setSelectedStatus}
              items={[
                { value: 'all', label: 'All Items' },
                { value: 'not_started', label: 'Not Started' },
                { value: 'in_progress', label: 'In Progress' },
                { value: 'completed', label: 'Completed' }
              ]}
            />
          </div>
          <div className="flex-1">
            <Label className="text-sm text-gray-500 dark:text-gray-400 mb-1 block">Category</Label>
            <CustomSelect
              value={selectedCategoryFilter}
              onValueChange={setSelectedCategoryFilter}
              items={categoryOptions}
            />
          </div>
        </div>
        <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 pt-2">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <span>Filtered results: {filteredItems.length} items</span>
          </div>
          {filteredItems.length > 0 && (
            <div>
              {filteredItems.filter(item => item.completed).length} completed / 
              {filteredItems.filter(item => !item.completed && item.progress?.current).length} in progress
            </div>
          )}
        </div>
      </div>

      {/* Items grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
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
        {filteredItems.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/30 rounded-lg border border-dashed border-gray-200 dark:border-gray-700">
            <BookOpen className="h-12 w-12 mb-4 text-gray-300 dark:text-gray-600" />
            <p className="text-lg font-medium">No items found</p>
            <p className="text-sm mt-1">Try adjusting your search or filters</p>
            <Button 
              onClick={onAddItem} 
              variant="outline" 
              size="sm" 
              className="mt-4"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add New Item
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
