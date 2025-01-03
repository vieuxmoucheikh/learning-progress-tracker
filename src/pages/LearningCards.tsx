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
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [categories, setCategories] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'updated' | 'created' | 'mastered'>('updated');
  const { toast } = useToast();

  const allTags = Array.from(
    new Set(cards.flatMap((card) => card.tags))
  ).sort();

  // Memoized search function for better performance
  const searchCards = useCallback((cards: CardType[], searchTerm: string) => {
    const terms = searchTerm.toLowerCase().split(' ').filter(Boolean);
    if (terms.length === 0) return cards;

    return cards.filter(card => {
      const searchableText = `${card.title} ${card.content} ${card.category} ${card.tags.join(' ')}`.toLowerCase();
      return terms.every(term => searchableText.includes(term));
    });
  }, []);

  // Filter and sort cards with better performance
  const filteredCards = useMemo(() => {
    let result = [...cards];

    // Apply search filter
    if (searchTerm) {
      result = searchCards(result, searchTerm);
    }

    // Apply category filter
    if (selectedCategory !== 'all') {
      result = result.filter(card => card.category === selectedCategory);
    }

    // Apply tag filter
    if (selectedTags.length > 0) {
      result = result.filter(card => 
        selectedTags.every(tag => card.tags.includes(tag))
      );
    }

    // Apply sorting with proper date comparison
    return result.sort((a, b) => {
      switch (sortBy) {
        case 'updated':
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        case 'created':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'mastered':
          // First sort by mastered status
          if (a.mastered !== b.mastered) {
            return a.mastered ? -1 : 1;
          }
          // Then by update date
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        default:
          return 0;
      }
    });
  }, [cards, searchTerm, selectedCategory, selectedTags, sortBy, searchCards]);

  // Fetch cards and update state
  const fetchCards = useCallback(async () => {
    try {
      setLoading(true);
      const items = await learningCardsService.getCards();
      setCards(items);
      
      // Extract unique categories, filter out empty ones, and sort
      const uniqueCategories = Array.from(
        new Set(
          items
            .map(item => item.category)
            .filter((category): category is string => 
              typeof category === 'string' && 
              category.trim().length > 0
            )
            .map(category => category.trim())
        )
      ).sort((a, b) => a.localeCompare(b));
      
      setCategories(uniqueCategories);
      
      // If we have categories but no filter is set, set the first category as default
      if (uniqueCategories.length > 0 && !selectedCategory) {
        setSelectedCategory('All');
      }
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
  }, [toast, selectedCategory]);

  // Handle card update
  const handleCardUpdate = async (cardId: string, updates: Partial<CardType>) => {
    try {
      const updatedCard = await learningCardsService.updateCard(cardId, updates);
      setCards(prevCards => 
        prevCards.map(card => 
          card.id === cardId ? updatedCard : card
        )
      );
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
  };

  const handleCreateCard = async () => {
    try {
      const newCard = await learningCardsService.createCard({
        title: 'New Card',
        content: '',
        tags: [],
        category: selectedCategory !== 'all' ? selectedCategory : '',
      });
      setCards((prevCards) => [newCard, ...prevCards]);
      toast({
        title: 'Success',
        description: 'Card created successfully',
      });
    } catch (error) {
      console.error('Error creating card:', error);
      toast({
        title: 'Error',
        description: 'Failed to create card. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteCard = async (id: string) => {
    try {
      await learningCardsService.deleteCard(id);
      setCards((prevCards) => prevCards.filter((card) => card.id !== id));
      toast({
        title: "Success",
        description: "Card deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting card:', error);
      toast({
        title: "Error",
        description: "Failed to delete card. Please try again.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchCards();
  }, []);

  const handleSortChange = (value: string) => {
    if (value === 'updated' || value === 'created' || value === 'mastered') {
      setSortBy(value);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <div className="flex flex-col space-y-4">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Learning Cards</h1>
          <Button onClick={handleCreateCard}>
            <Plus className="w-4 h-4 mr-2" />
            New Card
          </Button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search cards..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Category Filter */}
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Sort By */}
          <Select value={sortBy} onValueChange={handleSortChange}>
            <SelectTrigger>
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="updated">Last Updated</SelectItem>
              <SelectItem value="created">Created Date</SelectItem>
              <SelectItem value="mastered">Mastered First</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Selected Tags */}
        {selectedTags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedTags.map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="cursor-pointer"
                onClick={() => setSelectedTags(selectedTags.filter((t) => t !== tag))}
              >
                {tag}
                <X className="w-3 h-3 ml-1" />
              </Badge>
            ))}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedTags([])}
              className="text-sm"
            >
              Clear all
            </Button>
          </div>
        )}

        {/* Cards Grid */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
            <AnimatePresence>
              {filteredCards.map((card) => (
                <motion.div
                  key={card.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <EnhancedLearningCard
                    {...card}
                    onSave={async (updates) => {
                      return handleCardUpdate(card.id, updates);
                    }}
                    onDelete={async () => {
                      handleDeleteCard(card.id);
                    }}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};