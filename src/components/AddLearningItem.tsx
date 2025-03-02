import * as React from 'react';
import { useState, useEffect, useMemo } from 'react';
import { Plus, Link as LinkIcon, Clock, X, CalendarIcon } from 'lucide-react';
import { LearningItemFormData } from '../types';
import { Button } from './ui/button';
import { getLearningItems } from '../lib/database';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar } from './ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

// Add generateId function
const generateId = (): string => {
  return 'id-' + Math.random().toString(36).substr(2, 9);
};

const getAdjustedDateStr = (date: Date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);  // Set to midnight in local timezone
  return d.toISOString().split('T')[0];
};

interface Props {
  onAdd: (item: LearningItemFormData) => void;
  onClose: () => void;
  isOpen: boolean;
  selectedDate?: Date | null;
}

export function AddLearningItem({ onAdd, onClose, isOpen, selectedDate }: Props) {
  const initialFormData: LearningItemFormData = {
    title: '',
    type: 'video' as const,
    url: '',
    notes: '',
    completed: false,
    category: '',
    priority: 'medium' as const,
    tags: [] as string[],
    current: { hours: 0, minutes: 0 },
    total: undefined,
    unit: 'hours' as const,
    date: '',
    difficulty: 'medium' as const,
    status: 'not_started' as const
  };

  const [formData, setFormData] = useState<LearningItemFormData>(() => {
    const date = selectedDate ? new Date(selectedDate) : new Date();
    date.setHours(0, 0, 0, 0);
    return {
      ...initialFormData,
      date: getAdjustedDateStr(date)
    };
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedDateState, setSelectedDateState] = useState<Date | undefined>(
    selectedDate ? new Date(selectedDate) : new Date()
  );

  // Update form data when selected date changes
  useEffect(() => {
    if (selectedDate) {
      const date = new Date(selectedDate);
      date.setHours(0, 0, 0, 0);
      setFormData(prev => ({
        ...prev,
        date: getAdjustedDateStr(date)
      }));
      setSelectedDateState(date);
    }
  }, [selectedDate]);

  // Handle date change from calendar
  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      setSelectedDateState(date);
      setFormData(prev => ({
        ...prev,
        date: getAdjustedDateStr(date)
      }));
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleTimeInputChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    timeType: 'current' | 'total'
  ) => {
    const { name, value } = e.target;
    const numValue = parseInt(value, 10) || 0;

    setFormData(prev => ({
      ...prev,
      [timeType]: {
        ...prev[timeType],
        [name]: numValue
      }
    }));
  };

  const handleTagsChange = (tagsString: string) => {
    const tags = tagsString
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag);

    setFormData(prev => ({
      ...prev,
      tags
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await onAdd(formData);
      setFormData(initialFormData);
      onClose();
    } catch (error) {
      console.error('Error adding item:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get unique categories from existing items
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const items = await getLearningItems();
        const uniqueCategories = Array.from(
          new Set(items.map(item => item.category).filter(Boolean))
        );
        setCategories(uniqueCategories as string[]);
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };

    fetchCategories();
  }, []);

  if (!isOpen) return null;

  return (
    <div className="w-full">
      <div className="bg-white rounded-lg">
        <div className="p-0">
          <div className="mt-2">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="Learning item title"
                />
              </div>

              {/* Type and Category */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-colors"
                  >
                    <option value="video">Video</option>
                    <option value="article">Article</option>
                    <option value="book">Book</option>
                    <option value="course">Course</option>
                    <option value="pdf">PDF</option>
                    <option value="url">Website/URL</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      name="category"
                      value={formData.category}
                      onChange={handleInputChange}
                      list="categories"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="e.g., Programming, Design"
                    />
                    <datalist id="categories">
                      {categories.map((category, index) => (
                        <option key={index} value={category} />
                      ))}
                    </datalist>
                  </div>
                </div>
              </div>

              {/* URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  URL
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <LinkIcon className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="url"
                    name="url"
                    value={formData.url}
                    onChange={handleInputChange}
                    className="w-full pl-10 px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="https://example.com"
                  />
                </div>
              </div>

              {/* Date and Difficulty */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date
                  </label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !selectedDateState && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedDateState ? (
                          format(selectedDateState, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 z-50" align="start">
                      <Calendar
                        mode="single"
                        selected={selectedDateState}
                        onSelect={handleDateChange}
                        initialFocus
                        className="rounded-md border shadow-md bg-white p-3"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Difficulty
                  </label>
                  <select
                    name="difficulty"
                    value={formData.difficulty}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-colors"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </div>

              {/* Priority and Status */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priority
                  </label>
                  <select
                    name="priority"
                    value={formData.priority}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-colors"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-colors"
                  >
                    <option value="not_started">Not Started</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="on_hold">On Hold</option>
                  </select>
                </div>
              </div>

              {/* Current and Total Time */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Current Progress
                  </label>
                  <div className="flex items-center space-x-2">
                    <div className="flex-1">
                      <input
                        type="number"
                        name="hours"
                        min="0"
                        value={formData.current.hours}
                        onChange={(e) => handleTimeInputChange(e, 'current')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        placeholder="Hours"
                      />
                    </div>
                    <span className="text-gray-500">h</span>
                    <div className="flex-1">
                      <input
                        type="number"
                        name="minutes"
                        min="0"
                        max="59"
                        value={formData.current.minutes}
                        onChange={(e) => handleTimeInputChange(e, 'current')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        placeholder="Minutes"
                      />
                    </div>
                    <span className="text-gray-500">m</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Total Expected Time (optional)
                  </label>
                  <div className="flex items-center space-x-2">
                    <div className="flex-1">
                      <input
                        type="number"
                        name="hours"
                        min="0"
                        value={formData.total?.hours || ''}
                        onChange={(e) => handleTimeInputChange(e, 'total')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        placeholder="Hours"
                      />
                    </div>
                    <span className="text-gray-500">h</span>
                    <div className="flex-1">
                      <input
                        type="number"
                        name="minutes"
                        min="0"
                        max="59"
                        value={formData.total?.minutes || ''}
                        onChange={(e) => handleTimeInputChange(e, 'total')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        placeholder="Minutes"
                      />
                    </div>
                    <span className="text-gray-500">m</span>
                  </div>
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tags <span className="text-gray-500 text-xs">(comma-separated)</span>
                </label>
                <input
                  type="text"
                  value={formData.tags.join(', ')}
                  onChange={(e) => handleTagsChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="javascript, web development, react"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[100px] transition-colors"
                  placeholder="Add any additional notes or thoughts about this learning item..."
                />
              </div>

              {/* Submit Button */}
              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  {isSubmitting ? 'Adding...' : 'Add Item'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}