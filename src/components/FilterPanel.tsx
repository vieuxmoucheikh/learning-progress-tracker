import React from 'react';
import { LearningItem } from '../types';

interface Props {
  filters: {
    type: string;
    status: string;
    priority: string;
    category: string;
  };
  setFilters: React.Dispatch<React.SetStateAction<{
    type: string;
    status: string;
    priority: string;
    category: string;
  }>>;
  items: LearningItem[];
}

export function FilterPanel({ filters, setFilters, items }: Props) {
  const categories = Array.from(new Set(items.map(item => item.category).filter(Boolean)));

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6">
      <div className="grid grid-cols-4 gap-4">
        {/* Type Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
          <select
            value={filters.type}
            onChange={(e) => setFilters({ ...filters, type: e.target.value })}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="all">All Types</option>
            <option value="video">Video</option>
            <option value="pdf">PDF</option>
            <option value="url">URL</option>
            <option value="book">Book</option>
          </select>
        </div>
        {/* Status Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="all">All Status</option>
            <option value="completed">Completed</option>
            <option value="in-progress">In Progress</option>
          </select>
        </div>
        {/* Priority Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
          <select
            value={filters.priority}
            onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="all">All Priorities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
        {/* Category Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
          <select
            value={filters.category}
            onChange={(e) => setFilters({ ...filters, category: e.target.value })}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="all">All Categories</option>
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}