import * as React from 'react';
import { useState } from 'react';
import { Plus, Link as LinkIcon, Clock, X } from 'lucide-react';
import { LearningItemFormData } from '../types';
import { Button } from './ui/button';

interface Props {
  onAdd: (item: LearningItemFormData) => void;
  onClose: () => void;
  isOpen: boolean;
  selectedDate?: Date | null;
}

export function AddLearningItem({ onAdd, onClose, isOpen, selectedDate }: Props) {
  const [formData, setFormData] = useState<LearningItemFormData>({
    title: '',
    type: 'video' as const,
    url: '',
    notes: '',
    completed: false,
    category: '',
    priority: 'medium' as const,
    tags: [],
    current: { hours: 0, minutes: 0 },
    total: { hours: 0, minutes: 0 },
    date: selectedDate ? selectedDate.toISOString() : new Date().toISOString(),
    difficulty: 'medium' as const,
    status: 'not_started' as const,
    unit: 'hours' as const
  });

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      const cleanData = {
        title: (formData.title || '').trim(),
        type: formData.type as typeof validTypes[number],
        url: (formData.url || '').trim(),
        notes: (formData.notes || '').trim(),
        completed: Boolean(formData.completed),
        category: (formData.category || '').trim(),
        priority: (formData.priority || 'medium') as 'low' | 'medium' | 'high',
        tags: Array.isArray(formData.tags) ? formData.tags.map(tag => (tag || '').trim()).filter(Boolean) : [],
        current: {
          hours: Math.max(0, parseInt(String(formData.current?.hours || 0)) || 0),
          minutes: Math.max(0, parseInt(String(formData.current?.minutes || 0)) || 0)
        },
        total: {
          hours: Math.max(0, parseInt(String(formData.total?.hours || 0)) || 0),
          minutes: Math.max(0, parseInt(String(formData.total?.minutes || 0)) || 0)
        },
        date: selectedDate ? selectedDate.toISOString() : new Date().toISOString(),
        difficulty: (formData.difficulty || 'medium') as 'easy' | 'medium' | 'hard',
        status: (formData.status || 'not_started') as 'not_started' | 'in_progress' | 'completed' | 'on_hold' | 'archived',
        unit: (formData.unit || 'hours') as 'hours' | 'pages' | 'percent'
      };

      // Add https:// to URL if needed
      if (cleanData.url && !cleanData.url.startsWith('http://') && !cleanData.url.startsWith('https://')) {
        cleanData.url = 'https://' + cleanData.url;
      }

      await onAdd(cleanData);
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
    setFormData({
      title: '',
      type: 'video' as const,
      url: '',
      notes: '',
      completed: false,
      category: '',
      priority: 'medium' as const,
      tags: [],
      current: { hours: 0, minutes: 0 },
      total: { hours: 0, minutes: 0 },
      date: selectedDate ? selectedDate.toISOString() : new Date().toISOString(),
      difficulty: 'medium' as const,
      status: 'not_started' as const,
      unit: 'hours' as const
    });
  };

  const handleTagsChange = (value: string) => {
    const tags = value.split(',').map(tag => tag.trim()).filter(Boolean);
    setFormData(prev => ({ ...prev, tags }));
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
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter title"
                />
              </div>

              {/* Type and Category */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type *
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
                    Category *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Programming, Design"
                  />
                </div>
              </div>

              {/* URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  URL
                </label>
                <input
                  type="text"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="https://..."
                />
              </div>

              {/* Time Tracking */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Total Duration (optional)
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <input
                      type="number"
                      min="0"
                      value={formData.total?.hours || 0}
                      onChange={(e) => setFormData({
                        ...formData,
                        total: {
                          hours: parseInt(e.target.value) || 0,
                          minutes: formData.total?.minutes || 0
                        }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Hours"
                    />
                  </div>
                  <div>
                    <input
                      type="number"
                      min="0"
                      max="59"
                      value={formData.total?.minutes || 0}
                      onChange={(e) => setFormData({
                        ...formData,
                        total: {
                          hours: formData.total?.hours || 0,
                          minutes: parseInt(e.target.value) || 0
                        }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Minutes"
                    />
                  </div>
                </div>
              </div>

              {/* Priority and Difficulty */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priority
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Difficulty
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
                  Tags
                </label>
                <input
                  type="text"
                  value={formData.tags.join(', ')}
                  onChange={(e) => handleTagsChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter tags separated by commas"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="Add any notes..."
                />
              </div>

              {/* Submit Button */}
              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors"
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