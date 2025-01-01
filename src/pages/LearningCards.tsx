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
import { Plus, Search, Tag as TagIcon, Loader2, Clock, Filter } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { getLearningItems } from '@/lib/database';

interface CardMedia {
  id: string;
  url: string;
  type: 'link' | 'image';
  createdAt?: string;
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
      const matchesCategory = selectedCategory === 'all' || card.category === selectedCategory;
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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-700 to-blue-500 bg-clip-text text-transparent">
            Learning Cards
          </h1>
          <Button onClick={handleCreateCard} className="shrink-0">
            <Plus className="w-4 h-4 mr-2" />
            New Card
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              type="text"
              placeholder="Search cards..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger>
              <Filter className="w-4 h-4 mr-2" />
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

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger>
              <Clock className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="updated">Last Updated</SelectItem>
              <SelectItem value="created">Created Date</SelectItem>
              <SelectItem value="mastered">Mastery Level</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-2 items-center">
            <TagIcon className="w-4 h-4 text-gray-400" />
            {allTags.map((tag) => (
              <Badge
                key={tag}
                variant={selectedTags.includes(tag) ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => {
                  setSelectedTags((prev) =>
                    prev.includes(tag)
                      ? prev.filter((t) => t !== tag)
                      : [...prev, tag]
                  );
                }}
              >
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center min-h-[200px]">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
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
          <div className="text-center py-12">
            <p className="text-gray-500">No cards found. Create one to get started!</p>
          </div>
        )}
      </div>
    </div>
  );
};
