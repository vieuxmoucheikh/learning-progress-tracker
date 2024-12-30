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
import { Plus, Search, Tag as TagIcon, Loader2, Clock } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { motion, AnimatePresence } from 'framer-motion';

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
  const [sortBy, setSortBy] = useState<'updated' | 'created' | 'mastered'>('updated');
  const { toast } = useToast();

  const allTags = Array.from(
    new Set(cards.flatMap((card) => card.tags))
  ).sort();

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
  }, []);

  const handleCreateCard = async () => {
    try {
      const newCard = await learningCardsService.createCard({
        title: 'New Card',
        content: '',
        tags: [],
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
        title: 'Success',
        description: 'Card deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting card:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete card. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const filteredCards = cards.filter((card) => {
    const matchesSearch =
      searchTerm === '' ||
      card.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      card.content.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesTags =
      selectedTags.length === 0 ||
      selectedTags.every((tag) => card.tags.includes(tag));

    return matchesSearch && matchesTags;
  });

  const sortedAndFilteredCards = filteredCards.sort((a, b) => {
    switch (sortBy) {
      case 'updated':
        return new Date(b.updatedAt || '').getTime() - new Date(a.updatedAt || '').getTime();
      case 'created':
        return new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime();
      case 'mastered':
        // Safely handle mastered property with type assertion
        const aMastered = (a as any).mastered || false;
        const bMastered = (b as any).mastered || false;
        if (aMastered === bMastered) {
          return new Date(b.updatedAt || '').getTime() - new Date(a.updatedAt || '').getTime();
        }
        return (bMastered ? 1 : 0) - (aMastered ? 1 : 0);
      default:
        return 0;
    }
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex-1 w-full sm:w-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search cards..."
              className="pl-9 w-full"
            />
          </div>
        </div>
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <Select
            value={selectedTags.join(',') || 'all'}
            onValueChange={(value) =>
              setSelectedTags(value === 'all' ? [] : value.split(','))
            }
          >
            <SelectTrigger className="w-[180px]">
              <div className="flex items-center">
                <TagIcon className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter by tags" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tags</SelectItem>
              {allTags.map((tag) => (
                <SelectItem key={tag} value={tag}>
                  {tag}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={sortBy}
            onValueChange={(value: 'updated' | 'created' | 'mastered') => setSortBy(value)}
          >
            <SelectTrigger className="w-[180px]">
              <div className="flex items-center">
                <Clock className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Sort by" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="updated">Last Updated</SelectItem>
              <SelectItem value="created">Created Date</SelectItem>
              <SelectItem value="mastered">Mastery Status</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleCreateCard} className="whitespace-nowrap">
            <Plus className="w-4 h-4 mr-2" />
            New Card
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {filteredCards.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="flex flex-col items-center justify-center h-[400px] text-center"
          >
            <div className="text-muted-foreground">
              {searchTerm || selectedTags.length > 0 ? (
                <>
                  <h3 className="text-lg font-semibold mb-2">No matching cards found</h3>
                  <p>Try adjusting your search or filters</p>
                </>
              ) : (
                <>
                  <h3 className="text-lg font-semibold mb-2">No cards yet</h3>
                  <p>Create your first card to get started</p>
                </>
              )}
            </div>
            <Button
              onClick={handleCreateCard}
              variant="outline"
              className="mt-4"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Card
            </Button>
          </motion.div>
        ) : (
          <motion.div
            layout
            className="grid grid-cols-1 lg:grid-cols-2 gap-6 auto-rows-[450px]"
          >
            {sortedAndFilteredCards.map((card) => (
              <motion.div
                key={card.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
                className="h-[450px]"
              >
                <EnhancedLearningCard
                  id={card.id}
                  title={card.title}
                  content={card.content}
                  media={card.media}
                  tags={card.tags}
                  createdAt={card.createdAt}
                  updatedAt={card.updatedAt}
                  onSave={handleSaveCard}
                  onDelete={handleDeleteCard}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
