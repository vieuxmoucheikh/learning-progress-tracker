import React, { useState, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Search, Download } from 'lucide-react';
import LearningItemCard from "./LearningItemCard";
import { CustomSelect } from "./ui/select";
import type { Options as Html2PdfOptions } from 'html2pdf.js';
import type { LearningItem } from '@/types';
// @ts-ignore
import html2pdf from 'html2pdf.js';
import { cn } from "@/lib/utils";

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
  const [selectedCategory, setSelectedCategory] = useState("all");

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch =
        searchQuery === "" ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.notes && item.notes.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.type.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus =
        selectedStatus === "all" || 
        (selectedStatus === "completed" && item.completed) ||
        (selectedStatus === "not_started" && !item.completed && !item.progress?.current) ||
        (selectedStatus === "in_progress" && !item.completed && item.progress?.current);

      const matchesCategory =
        selectedCategory === "all" ||
        (item.type === selectedCategory);

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [items, searchQuery, selectedStatus, selectedCategory]);

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
        <div>Type: ${item.type}</div>
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
      <div className="flex flex-col gap-4">
        <div className="w-full">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <Input
              placeholder="Search items..."
              className="pl-10 h-12 text-base rounded-lg border-gray-200 focus:border-blue-500 focus:ring-blue-500 w-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="flex gap-4">
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
          <CustomSelect
            value={selectedCategory}
            onValueChange={setSelectedCategory}
            items={[
              { value: 'all', label: 'All Types' },
              { value: 'video', label: 'Video' },
              { value: 'pdf', label: 'PDF' },
              { value: 'url', label: 'URL' },
              { value: 'book', label: 'Book' },
              { value: 'course', label: 'Course' },
              { value: 'article', label: 'Article' }
            ]}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
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
          <div className="text-center py-8 text-gray-500">
            No items found
          </div>
        )}
      </div>
    </div>
  );
};
