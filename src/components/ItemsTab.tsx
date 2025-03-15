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

type StatusFilterType = 'all' | 'active' | 'completed';

interface StatusFilterProps {
  selectedStatus: StatusFilterType;
  onChange: (status: StatusFilterType) => void;
}

const StatusFilter: React.FC<StatusFilterProps> = ({ selectedStatus, onChange }) => {
  return (
    <div className="flex items-center">
      <CustomSelect
        value={selectedStatus}
        onValueChange={(value) => onChange(value as StatusFilterType)}
        options={[
          { value: 'all', label: 'All Items' },
          { value: 'active', label: 'Active' },
          { value: 'completed', label: 'Completed' }
        ]}
        className="w-[140px]"
      />
    </div>
  );
};

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
  const [filterStatus, setFilterStatus] = useState<StatusFilterType>("all");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Définition de la fonction handleSearchChange qui manquait
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1); // Reset to first page when search changes
  };

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
        filterStatus === "all" || 
        (filterStatus === "completed" && item.completed) ||
        (filterStatus === "active" && !item.completed);

      const matchesCategory =
        selectedCategoryFilter === "all" ||
        (item.category === selectedCategoryFilter);

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [items, searchQuery, filterStatus, selectedCategoryFilter]);

  // Pagination
  const pageCount = Math.ceil(filteredItems.length / itemsPerPage);
  const currentItems = filteredItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold mb-2 text-gray-800 dark:text-gray-100">
            All Learning Items
          </h2>
          <p className="text-gray-600 dark:text-gray-300">
            Organize and manage your learning resources
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="w-full sm:w-auto">
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="w-full sm:w-[200px] lg:w-[260px]"
            />
          </div>
          
          <div className="flex gap-2">
            <StatusFilter selectedStatus={filterStatus} onChange={setFilterStatus} />
            
            <Button 
              variant="default" 
              onClick={onAddItem}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all"
            >
              <Plus className="h-4 w-4" /> Add Item
            </Button>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 gap-6">
        {/* Ajustement des styles ici pour assurer que les cartes ont suffisamment d'espace */}
        <div className="grid-items-wrapper space-y-6">
          {currentItems.map((item) => (
            <div key={item.id} className="item-wrapper w-full">
              <LearningItemCard
                item={item}
                onUpdate={onUpdate}
                onDelete={onDelete}
                onStartTracking={onStartTracking}
                onStopTracking={onStopTracking}
                onNotesUpdate={onNotesUpdate}
                onSessionNoteAdd={onSessionNoteAdd}
                onSetActiveItem={onSetActiveItem}
              />
            </div>
          ))}
        </div>
        
        {filteredItems.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400">No items found. Try adjusting your search or filters.</p>
          </div>
        )}
        
        {filteredItems.length > 0 && pageCount > 1 && (
          <div className="pagination-controls flex justify-center mt-6">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              
              <span className="text-sm text-gray-600 dark:text-gray-300">
                Page {currentPage} of {pageCount}
              </span>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.min(pageCount, currentPage + 1))}
                disabled={currentPage === pageCount}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ItemsTab;
