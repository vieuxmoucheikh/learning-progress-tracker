import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EnhancedLearningCard } from '@/components/EnhancedLearningCard';
import { learningCardsService } from '@/lib/learningCards';
import type { EnhancedLearningCard as CardType } from '@/types';
import { Plus, Search, Tag as TagIcon, Loader2, Clock, Filter, X } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { getLearningItems } from '@/lib/database';
import { cn } from '@/lib/utils';

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

  const fetchCategories = async () => {
    try {
      const items = await getLearningItems();
      const uniqueCategories = Array.from(
        new Set(items.map(item => item.category).filter(Boolean))
      ).sort();
      setCategories(uniqueCategories);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchCards = async () => {
    try {
      const fetchedCards = await learningCardsService.getCards();
      setCards(fetchedCards as CardType[]);
    } catch (error) {
      console.error('Error fetching cards:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch cards. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCards();
    fetchCategories();
  }, []);

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

  const handleSaveCard = async (card: Partial<CardType>): Promise<boolean> => {
    try {
      await learningCardsService.updateCard(card.id!, {
        title: card.title,
        content: card.content,
        media: card.media,
        tags: card.tags,
        mastered: card.mastered,
        category: card.category,
      });
      await fetchCards();
      toast({
        title: "Success",
        description: "Card updated successfully",
      });
      return true;
    } catch (error) {
      console.error('Error updating card:', error);
      toast({
        title: "Error",
        description: "Failed to update card. Please try again.",
        variant: "destructive",
      });
      return false;
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

  const filteredCards = cards
    .filter((card) => {
      const matchesSearch = card.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        card.content.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesTags = selectedTags.length === 0 || selectedTags.every(tag => card.tags.includes(tag));
      const matchesCategory = selectedCategory === 'all' || 
                             (card.category && selectedCategory && 
                              card.category.toLowerCase() === selectedCategory.toLowerCase());
      return matchesSearch && matchesTags && matchesCategory;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'created':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'mastered':
          return (b.mastered ? 1 : 0) - (a.mastered ? 1 : 0);
        default:
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
    });

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag)
        ? prev.filter((t) => t !== tag)
        : [...prev, tag]
    );
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">Learning Cards</h1>
            <p className="text-gray-800 mt-1">Organize and manage your learning notes</p>
          </div>
          <Button 
            onClick={handleCreateCard} 
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 transition-all duration-200"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Card
          </Button>
        </div>

        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
              <Input
                type="text"
                placeholder="Search cards..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={cn(
                  "pl-9",
                  "bg-white",
                  "text-gray-900",
                  "border-gray-200",
                  "focus-visible:ring-2 focus-visible:ring-blue-500",
                  "placeholder:text-gray-500"
                )}
              />
            </div>

            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className={cn(
                "bg-white",
                "text-gray-900",
                "border-gray-200",
                "focus:ring-2 focus:ring-blue-500"
              )}>
                <Filter className="w-4 h-4 mr-2 text-gray-500" />
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={(value) => setSortBy(value as 'updated' | 'created' | 'mastered')}>
              <SelectTrigger className={cn(
                "bg-white",
                "text-gray-900",
                "border-gray-200",
                "focus:ring-2 focus:ring-blue-500"
              )}>
                <Clock className="w-4 h-4 mr-2 text-gray-500" />
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="updated">Last Updated</SelectItem>
                <SelectItem value="created">Created Date</SelectItem>
                <SelectItem value="mastered">Mastered First</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {allTags.length > 0 && (
            <div className="flex flex-wrap gap-2 items-center">
              <TagIcon className="w-4 h-4 text-gray-500" />
              {allTags.map((tag) => (
                <Badge
                  key={tag}
                  variant={selectedTags.includes(tag) ? "default" : "secondary"}
                  className={cn(
                    "cursor-pointer transition-colors",
                    selectedTags.includes(tag)
                      ? "bg-blue-100 text-blue-700 hover:bg-blue-200"
                      : "bg-white text-gray-700 hover:bg-gray-100",
                    "border border-gray-200"
                  )}
                  onClick={() => toggleTag(tag)}
                >
                  {tag}
                  {selectedTags.includes(tag) && (
                    <X className="w-3 h-3 ml-1 text-current" />
                  )}
                </Badge>
              ))}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center items-center min-h-[400px]">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                <p className="text-gray-500">Loading your cards...</p>
              </div>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredCards.map((card) => (
                  <motion.div
                    key={card.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.2 }}
                  >
                    <EnhancedLearningCard
                      {...card}
                      onSave={handleSaveCard}
                      onDelete={() => handleDeleteCard(card.id)}
                    />
                  </motion.div>
                ))}
              </div>
            </AnimatePresence>
          )}

          {!loading && filteredCards.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-gray-50 rounded-lg">
              <div className="text-gray-500 mb-4">
                {searchTerm || selectedTags.length > 0 || selectedCategory !== 'all'
                  ? 'No cards match your filters. Try adjusting your search criteria.'
                  : 'No cards yet. Create your first card to get started!'}
              </div>
              <Button
                onClick={handleCreateCard}
                variant="outline"
                className="bg-white hover:bg-gray-50"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Card
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
