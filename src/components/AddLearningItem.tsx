import React, { useState } from 'react';
import { Plus, Link as LinkIcon, Clock, X } from 'lucide-react';
import { LearningItemFormData } from '../types';

interface Props {
  onAdd: (item: LearningItemFormData) => void;
  onClose: () => void;
  isOpen: boolean;
  selectedDate?: Date | null;
}

export function AddLearningItem({ onAdd, onClose, isOpen, selectedDate }: Props) {
  const [formData, setFormData] = useState<LearningItemFormData>({
    title: '',
    type: 'video',
    url: '',
    notes: '',
    completed: false,
    category: '',
    priority: 'medium',
    tags: [],
    current: { hours: 0, minutes: 0 },
    total: { hours: 0, minutes: 0 },
    date: selectedDate ? selectedDate.toISOString() : new Date().toISOString(),
    difficulty: 'medium',
    status: 'not_started',
    unit: 'hours'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Ensure URL has https:// prefix if provided
      let processedUrl = formData.url;
      if (processedUrl && !processedUrl.startsWith('http://') && !processedUrl.startsWith('https://')) {
        processedUrl = 'https://' + processedUrl;
      }

      // Tags are already string[] from the form data
      const itemToAdd = {
        ...formData,
        url: processedUrl || '',  
        date: selectedDate ? selectedDate.toISOString() : new Date().toISOString(),
      };

      await onAdd(itemToAdd);
      onClose();
      resetForm();
    } catch (error) {
      console.error('Error in handleSubmit:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      type: 'video',
      url: '',
      notes: '',
      completed: false,
      category: '',
      priority: 'medium',
      tags: [],
      current: { hours: 0, minutes: 0 },
      total: { hours: 0, minutes: 0 },
      date: selectedDate ? selectedDate.toISOString() : new Date().toISOString(),
      difficulty: 'medium',
      status: 'not_started',
      unit: 'hours'
    });
  };

  const handleTagsChange = (value: string) => {
    const tags = value.split(',').map(tag => tag.trim()).filter(Boolean);
    setFormData(prev => ({ ...prev, tags }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold text-gray-900">Add Learning Item</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

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
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors"
              >
                Add Item
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}