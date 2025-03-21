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
import { Plus, Search, Tag as TagIcon, Loader2, Clock, Filter, X, BookOpen } from 'lucide-react';
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
        {/* Enhanced Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-gray-100 dark:border-gray-800">
          <div>
            <div className="flex items-center gap-2">
              <BookOpen className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-500 bg-clip-text text-transparent dark:from-blue-400 dark:via-blue-300 dark:to-indigo-400">
                Learning Cards
              </h1>
            </div>
            <p className="text-gray-600 dark:text-gray-300 mt-2 text-sm md:text-base max-w-xl">
              Create and organize your study notes, insights, and knowledge in beautiful cards. 
              Review them anytime to reinforce your learning.
            </p>
          </div>
          <Button 
            onClick={handleCreateCard} 
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/20 dark:shadow-blue-700/20 transition-all duration-200 px-5 py-2 h-auto"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Card
          </Button>
        </div>

        {/* Enhanced Filter Section */}
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-start p-5 bg-gray-50 dark:bg-gray-800/50 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-500 dark:text-blue-400 w-4 h-4" />
              <Input
                type="text"
                placeholder="Search cards..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={cn(
                  "pl-9",
                  "bg-white dark:bg-gray-800",
                  "text-gray-900 dark:text-gray-100",
                  "border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600",
                  "focus-visible:ring-2 focus-visible:ring-blue-500 dark:focus-visible:ring-blue-600 focus-visible:ring-offset-1 dark:focus-visible:ring-offset-gray-800",
                  "placeholder:text-gray-500 dark:placeholder:text-gray-400",
                  "shadow-sm",
                  "transition-all duration-200"
                )}
              />
            </div>

            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className={cn(
                "bg-white dark:bg-gray-800",
                "text-gray-900 dark:text-gray-100",
                "border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600",
                "focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 dark:focus:ring-offset-gray-800",
                "shadow-sm",
                "transition-all duration-200"
              )}>
                <Filter className="w-4 h-4 mr-2 text-blue-500 dark:text-blue-400" />
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg">
                <SelectItem value="all" className="focus:bg-blue-50 focus:text-blue-600 dark:focus:bg-blue-900/50 dark:focus:text-blue-300">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category} value={category} className="focus:bg-blue-50 focus:text-blue-600 dark:focus:bg-blue-900/50 dark:focus:text-blue-300">
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={(value) => setSortBy(value as 'updated' | 'created' | 'mastered')}>
              <SelectTrigger className={cn(
                "bg-white dark:bg-gray-800",
                "text-gray-900 dark:text-gray-100",
                "border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600",
                "focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 dark:focus:ring-offset-gray-800",
                "shadow-sm",
                "transition-all duration-200"
              )}>
                <Clock className="w-4 h-4 mr-2 text-blue-500 dark:text-blue-400" />
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg">
                <SelectItem value="updated" className="focus:bg-blue-50 focus:text-blue-600 dark:focus:bg-blue-900/50 dark:focus:text-blue-300">Last Updated</SelectItem>
                <SelectItem value="created" className="focus:bg-blue-50 focus:text-blue-600 dark:focus:bg-blue-900/50 dark:focus:text-blue-300">Created Date</SelectItem>
                <SelectItem value="mastered" className="focus:bg-blue-50 focus:text-blue-600 dark:focus:bg-blue-900/50 dark:focus:text-blue-300">Mastered First</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {allTags.length > 0 && (
            <div className="flex flex-wrap gap-2 items-center p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 shadow-sm">
              <TagIcon className="w-4 h-4 text-blue-500 dark:text-blue-400" />
              {allTags.map((tag) => (
                <Badge
                  key={tag}
                  variant={selectedTags.includes(tag) ? "default" : "secondary"}
                  className={cn(
                    "cursor-pointer transition-colors",
                    selectedTags.includes(tag)
                      ? "bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-200 dark:bg-blue-800 dark:text-blue-200 dark:hover:bg-blue-700 dark:border-blue-700"
                      : "bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 dark:border-gray-700",
                    "py-1 px-3 rounded-full font-medium"
                  )}
                  onClick={() => toggleTag(tag)}
                >
                  {tag}
                  {selectedTags.includes(tag) && (
                    <X className="w-3 h-3 ml-1.5 text-blue-500 dark:text-blue-300" />
                  )}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Enhanced Card Grid */}
        <div className="mt-8">
          {loading ? (
            <div className="flex justify-center items-center min-h-[400px] bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-blue-500 dark:text-blue-400" />
                <p className="text-gray-600 dark:text-gray-300 font-medium">Loading your cards...</p>
              </div>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {filteredCards.map((card) => (
                  <motion.div
                    key={card.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className="card-container"
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
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
              <div className="text-gray-500 dark:text-gray-400 mb-6 max-w-md">
                {searchTerm || selectedTags.length > 0 || selectedCategory !== 'all'
                  ? 'No cards match your filters. Try adjusting your search criteria or create a new card.'
                  : 'No cards yet. Create your first card to get started with your learning journey!'}
              </div>
              <Button
                onClick={handleCreateCard}
                variant="outline"
                className="bg-white dark:bg-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/30 border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-600 text-blue-600 dark:text-blue-300 hover:text-blue-700 dark:hover:text-blue-200 transition-all duration-200"
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
