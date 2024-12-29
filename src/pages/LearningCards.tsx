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
import { useToast } from '@/hooks/useToast';
import { Plus, Search, SearchX, FileText } from 'lucide-react';
import type { EnhancedLearningCard as CardType, CardMedia } from '@/types';

export function LearningCardsPage() {
  const [cards, setCards] = useState<CardType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const { toast } = useToast();

  const fetchCards = async () => {
    try {
      const fetchedCards = await learningCardsService.getCards();
      setCards(fetchedCards);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch cards. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
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
        media: [],
        tags: [],
      });
      setCards(prevCards => [newCard, ...prevCards]);
      toast({
        title: 'Success',
        description: 'New card created successfully!',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create card. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleSaveCard = async (card: {
    id: string;
    title: string;
    content: string;
    media?: CardMedia[];
    tags: string[];
  }): Promise<boolean> => {
    try {
      await learningCardsService.updateCard(card.id, {
        title: card.title,
        content: card.content,
        tags: card.tags,
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
      setCards(prevCards => prevCards.filter(card => card.id !== id));
      toast({
        title: 'Success',
        description: 'Card deleted successfully!',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete card. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const allTags = Array.from(
    new Set(cards.flatMap(card => card.tags))
  ).sort();

  const filteredCards = cards.filter(card => {
    const matchesSearch = !searchQuery || 
      card.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      card.content.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesTags = selectedTags.length === 0 || 
      selectedTags.every(tag => card.tags.includes(tag));
    
    return matchesSearch && matchesTags;
  });

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Learning Cards</h1>
          <p className="text-muted-foreground mt-1">
            Create and manage your learning notes
          </p>
        </div>
        <Button
          onClick={handleCreateCard}
          size="default"
          className="hover:scale-105 transition-transform"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Card
        </Button>
      </div>

      <div className="flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search cards..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={selectedTags.join(',') || 'all'}
          onValueChange={(value) => setSelectedTags(value === 'all' ? [] : value.split(','))}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by tags" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tags</SelectItem>
            {allTags.map(tag => (
              <SelectItem key={tag} value={tag}>
                {tag}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2 xl:grid-cols-2 auto-rows-fr">
        {filteredCards.map((card) => (
          <div key={card.id} className="h-full">
            <EnhancedLearningCard
              {...card}
              onSave={handleSaveCard}
              onDelete={handleDeleteCard}
            />
          </div>
        ))}
        {filteredCards.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground bg-muted/30 rounded-lg">
            {searchQuery || selectedTags.length > 0 ? (
              <>
                <SearchX className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-lg font-medium">No cards match your search criteria</p>
                <p className="mt-1">Try adjusting your search or filters</p>
              </>
            ) : (
              <>
                <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-lg font-medium">No cards yet</p>
                <p className="mt-1">Click "New Card" to create your first learning card!</p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
