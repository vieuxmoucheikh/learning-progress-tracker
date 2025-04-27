import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus } from 'lucide-react';
import LearningItemCard from "./LearningItemCard";
import { CustomSelect, SelectOption } from "./ui/select";
import type { LearningItem } from '@/types';

type StatusFilterType = 'all' | 'active' | 'completed';

interface StatusFilterProps {
  selectedStatus: StatusFilterType;
  onChange: (status: StatusFilterType) => void;
}

interface CategoryFilterProps {
  selectedCategory: string;
  onChange: (category: string) => void;
  options: SelectOption[];
}

const StatusFilter: React.FC<StatusFilterProps> = ({ selectedStatus, onChange }) => {
  const options: SelectOption[] = [
    { value: 'all', label: 'All Items' },
    { value: 'active', label: 'Active' },
    { value: 'completed', label: 'Completed' }
  ];

  return (
    <div className="flex items-center">
      <CustomSelect
        value={selectedStatus}
        onValueChange={(value) => onChange(value as StatusFilterType)}
        options={options}
        className="w-[140px]"
      />
    </div>
  );
};

const CategoryFilter: React.FC<CategoryFilterProps> = ({ selectedCategory, onChange, options }) => {
  return (
    <div className="flex items-center">
      <CustomSelect
        value={selectedCategory}
        onValueChange={(value) => onChange(value)}
        options={options}
        className="w-[160px]"
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

export function ItemsTab({
  items,
  onAddItem,
  onUpdate,
  onDelete,
  onStartTracking,
  onStopTracking,
  onNotesUpdate,
  onSetActiveItem,
  onSessionNoteAdd,
}: ItemsTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<StatusFilterType>("all");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1); // Reset to first page when search changes
  };

  // Safe extraction des catégories
  const categoryOptions = useMemo(() => {
    // Vérification de sécurité pour s'assurer que items existe et est un tableau
    if (!items || !Array.isArray(items)) {
      return [{ value: 'all', label: 'All Categories' }];
    }
    
    const categories = items
      .filter(item => item && typeof item.category === 'string') // Ensure category is a string
      .map(item => item.category as string) // Type assertion since we filtered for strings
      .filter(Boolean); // Filtre supplémentaire pour s'assurer qu'il n'y a pas de valeurs falsy
    
    const uniqueCategories = Array.from(new Set(categories)).sort();
    
    return [
      { value: 'all', label: 'All Categories' },
      ...uniqueCategories.map(category => ({
        value: category,
        label: category.charAt(0).toUpperCase() + category.slice(1)
      }))
    ];
  }, [items]);

  const filteredItems = useMemo(() => {
    // Vérification de sécurité
    if (!items || !Array.isArray(items)) {
      return [];
    }
    
    return items.filter((item) => {
      if (!item) return false; // Filtre des éléments null/undefined
      
      const matchesSearch =
        searchQuery === "" ||
        (item.title && item.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.notes && item.notes.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.category && item.category.toLowerCase().includes(searchQuery.toLowerCase()));

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

  // Pagination avec vérification de sécurité
  const pageCount = Math.max(1, Math.ceil(filteredItems.length / itemsPerPage));
  const currentItems = filteredItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

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
            <CategoryFilter 
              selectedCategory={selectedCategoryFilter} 
              onChange={setSelectedCategoryFilter} 
              options={categoryOptions} 
            />
            
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
        {/* Vérification de sécurité avant de mapper les éléments */}
        <div className="grid-items-wrapper space-y-6">
          {currentItems && currentItems.length > 0 ? (
            currentItems.map((item) => (
              item && (
                <div key={item.id || Math.random().toString()} className="item-wrapper w-full">
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
              )
            ))
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400">No items found. Try adjusting your search or filters.</p>
            </div>
          )}
        </div>
        
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
}

// S'assurer que le composant est aussi exporté par défaut pour compatibilité
export default ItemsTab;
