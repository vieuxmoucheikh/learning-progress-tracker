import * as React from 'react';
import { useState, useEffect, useMemo } from 'react';
import { Plus, Link as LinkIcon, Clock, X } from 'lucide-react';
import { LearningItemFormData as BaseLearningItemFormData } from '../types';
import { Button } from './ui/button';
import { getLearningItems } from '../lib/database';

// Extend the imported type to include tags and difficulty
interface LearningItemFormData extends BaseLearningItemFormData {
  tags: string[];
  difficulty: 'easy' | 'medium' | 'hard';
}

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
    const date = selectedDate ? new Date (selectedDate) : new Date();
    date.setHours(0, 0, 0, 0); 
    return {
      ...initialFormData,
      date: getAdjustedDateStr(date)
    };
  });

  // Update form data when selected date changes
  useEffect(() => {
    if (selectedDate) {
      setFormData(prevData => ({
        ...prevData,
        date: getAdjustedDateStr(selectedDate)
      }));
    }
  }, [selectedDate]);

  const [existingCategories, setExistingCategories] = useState<string[]>([]);
  const [showCustomCategory, setShowCustomCategory] = useState(false);
  const [customCategory, setCustomCategory] = useState('');

  // Fetch existing categories from the database
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const items = await getLearningItems();
        const categories = new Set(items.map(item => item.category));
        setExistingCategories(Array.from(categories).filter(Boolean).sort());
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };

    if (isOpen) {
      fetchCategories();
    }
  }, [isOpen]);

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle category change
  const handleCategoryChange = (value: string) => {
    if (value === 'custom') {
      setShowCustomCategory(true);
      setFormData({ ...formData, category: customCategory });
    } else {
      setShowCustomCategory(false);
      setFormData({ ...formData, category: value });
    }
  };

  // Handle custom category input
  const handleCustomCategoryChange = (value: string) => {
    setCustomCategory(value);
    setFormData({ ...formData, category: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (!formData || typeof formData !== 'object') {
        throw new Error('Invalid form data');
      }

      if (!(formData.title || '').trim()) {
        throw new Error('Title is required');
      }

      // Validate type field
      const validTypes = ['video', 'pdf', 'url', 'book', 'course', 'article'] as const;
      if (!validTypes.includes(formData.type as typeof validTypes[number])) {
        throw new Error('Invalid item type');
      }

      // Create a clean object with only the necessary data
      const formDataToSubmit = {
        title: formData.title,
        type: formData.type as 'video' | 'pdf' | 'url' | 'book',
        current: {
          hours: Math.max(0, parseInt(String(formData.current?.hours || 0)) || 0),
          minutes: Math.max(0, parseInt(String(formData.current?.minutes || 0)) || 0)
        },
        unit: formData.unit || 'hours',
        url: formData.url,
        notes: formData.notes,
        completed: formData.completed,
        priority: formData.priority || 'medium',
        tags: formData.tags || [],
        category: formData.category || '',
        date: selectedDate ? 
          getAdjustedDateStr(selectedDate) : 
          getAdjustedDateStr(new Date()),
        difficulty: formData.difficulty || 'medium',
        status: formData.status || 'not_started'
      } as LearningItemFormData;

      // Add https:// to URL if needed
      if (formDataToSubmit.url && !formDataToSubmit.url.startsWith('http://') && !formDataToSubmit.url.startsWith('https://')) {
        formDataToSubmit.url = 'https://' + formDataToSubmit.url;
      }

      await onAdd(formDataToSubmit);
      onClose();
      resetForm();
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      setError(error instanceof Error ? error.message : 'Failed to add item. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData(initialFormData);
  };

  const handleTagsChange = (value: string) => {
    const tags = value.split(',').map(tag => tag.trim()).filter(Boolean);
    setFormData(prev => ({
      ...prev, 
      tags
    }));
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" />
        
        {/* Modal position trick */}
        <span className="hidden sm:inline-block sm:h-screen sm:align-middle" aria-hidden="true">&#8203;</span>
        
        {/* Modal panel */}
        <div 
          className="relative inline-block transform overflow-hidden rounded-lg bg-white text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl sm:align-middle"
          onClick={e => e.stopPropagation()}
        >
          <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold text-gray-900" id="modal-title">Add Learning Item</h2>
              <button
                onClick={onClose}
                className="rounded-md p-2 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Close"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {error && (
              <div className="mb-4 rounded-md bg-red-50 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Title and Type - Primary Information */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="What are you learning?"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="video">Video</option>
                      <option value="article">Article</option>
                      <option value="book">Book</option>
                      <option value="course">Course</option>
                      <option value="pdf">PDF</option>
                      <option value="url">URL</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category <span className="text-red-500">*</span>
                    </label>
                    {showCustomCategory ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          required
                          value={customCategory}
                          onChange={(e) => handleCustomCategoryChange(e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Enter new category"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setShowCustomCategory(false);
                            setCustomCategory('');
                            setFormData({ ...formData, category: '' });
                          }}
                          className="px-2 py-1 text-sm text-gray-600 hover:text-gray-800"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <select
                        required
                        value={formData.category}
                        onChange={(e) => handleCategoryChange(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select category</option>
                        {existingCategories.map((category) => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                        <option value="custom">+ Add new category</option>
                      </select>
                    )}
                  </div>
                </div>
              </div>

              {/* URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                  <LinkIcon className="h-4 w-4" /> Resource URL
                </label>
                <input
                  type="text"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="https://..."
                />
              </div>

              {/* Priority and Difficulty */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priority Level
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Difficulty Level
                  </label>
                  <select
                    value={formData.difficulty}
                    onChange={(e) => setFormData({ ...formData, difficulty: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="javascript, web development, react"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[100px]"
                  placeholder="Add any additional notes or thoughts about this learning item..."
                />
              </div>

              {/* Submit Button */}
              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
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