import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Search, Filter, Clock, TagIcon, Loader2, X } from 'lucide-react';
import { EnhancedLearningCard } from '@/components/EnhancedLearningCard';
import { learningCardsService } from '@/lib/learningCards';
import type { EnhancedLearningCard as CardType } from '@/types';
import { useToast } from '@/hooks/useToast';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { getLearningItems } from '@/lib/database';
import { format } from 'date-fns';

interface CardMedia {
  id: string;
  url: string;
  type: 'link' | 'image';
  createdAt?: string;
}

interface ProgressData {
  difficulty: string;
  count: number;
  progress: number;
}

interface FocusData {
  category: string;
  value: number;
}

export const LearningCardsPage = () => {
  const [cards, setCards] = useState<CardType[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<string[]>(['All']);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const { toast } = useToast();

  // Fetch cards and update state
  const fetchCards = useCallback(async () => {
    try {
      setLoading(true);
      const items = await learningCardsService.getCards();
      
      // Extract unique categories and sort them
      const uniqueCategories = ['All', ...new Set(
        items
          .map(item => item.category)
          .filter((category): category is string => 
            typeof category === 'string' && 
            category.trim().length > 0
          )
          .map(category => category.trim())
      )].sort((a, b) => a === 'All' ? -1 : b === 'All' ? 1 : a.localeCompare(b));
      
      setCategories(uniqueCategories);
      setCards(items);
      
    } catch (error) {
      console.error('Error fetching cards:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch cards',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Filter cards based on selected category
  const filteredCards = useMemo(() => {
    if (!selectedCategory || selectedCategory === 'All') {
      return cards;
    }
    return cards.filter(card => card.category === selectedCategory);
  }, [cards, selectedCategory]);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
          Learning Cards
        </h1>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full sm:w-auto">
          <Select
            value={selectedCategory}
            onValueChange={setSelectedCategory}
          >
            <SelectTrigger className="w-full sm:w-[180px] bg-white dark:bg-gray-900">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem 
                  key={category} 
                  value={category}
                  className="cursor-pointer"
                >
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            onClick={() => {
              const now = new Date().toISOString();
              const newCard: CardType = {
                id: crypto.randomUUID(),
                title: 'New Card',
                content: '',
                tags: [],
                category: selectedCategory === 'All' ? '' : selectedCategory,
                mastered: false,
                createdAt: now,
                updatedAt: now,
              };
              setCards(prev => [newCard, ...prev]);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Card
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center min-h-[200px]">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" />
        </div>
      ) : (
        <div className="grid gap-6">
          {filteredCards.map((card) => (
            <EnhancedLearningCard
              key={card.id}
              {...card}
              onSave={async (updates) => {
                try {
                  await learningCardsService.updateCard(card.id, updates);
                  fetchCards(); // Refresh cards after update
                  return true;
                } catch (error) {
                  console.error('Error updating card:', error);
                  toast({
                    title: 'Error',
                    description: 'Failed to update card',
                    variant: 'destructive',
                  });
                  return false;
                }
              }}
              onDelete={async () => {
                try {
                  await learningCardsService.deleteCard(card.id);
                  fetchCards(); // Refresh cards after deletion
                  toast({
                    title: 'Success',
                    description: 'Card deleted successfully',
                  });
                } catch (error) {
                  console.error('Error deleting card:', error);
                  toast({
                    title: 'Error',
                    description: 'Failed to delete card',
                    variant: 'destructive',
                  });
                }
              }}
            />
          ))}
          {filteredCards.length === 0 && !loading && (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              {selectedCategory === 'All' 
                ? 'No cards found. Create your first card!'
                : `No cards found in category "${selectedCategory}"`
              }
            </div>
          )}
        </div>
      )}
    </div>
  );
};