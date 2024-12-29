import React, { useState, useEffect } from 'react';
import { EnhancedLearningCard } from '@/components/EnhancedLearningCard';
import { learningCardsService } from '@/lib/learningCards';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, Grid, List } from 'lucide-react';
import type { EnhancedLearningContent } from '@/types';
import { useToast } from '@/hooks/useToast';

export const LearningCardsPage: React.FC = () => {
  const [cards, setCards] = useState<EnhancedLearningContent[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isLoading, setIsLoading] = useState(true);
  const [allTags, setAllTags] = useState<string[]>([]);
  const { toast } = useToast();

  const loadCards = async () => {
    try {
      setIsLoading(true);
      let fetchedCards: EnhancedLearningContent[];
      
      if (searchQuery) {
        fetchedCards = await learningCardsService.search(searchQuery);
      } else if (selectedTags.length > 0) {
        fetchedCards = await learningCardsService.getByTags(selectedTags);
      } else {
        fetchedCards = await learningCardsService.getAll();
      }
      
      setCards(fetchedCards);
      
      // Update all unique tags
      const tags = new Set<string>();
      fetchedCards.forEach(card => {
        card.tags.forEach(tag => tags.add(tag));
      });
      setAllTags(Array.from(tags));
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load learning cards",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCards();
  }, [searchQuery, selectedTags]);

  const handleCreateCard = async () => {
    try {
      const newCard = await learningCardsService.create({
        title: "New Learning Card",
        content: "",
        tags: [],
      });
      setCards(prev => [newCard, ...prev]);
      toast({
        title: "Success",
        description: "New card created",
      });
    } catch (error) {
      console.error('Failed to create card:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create new card",
        variant: "destructive",
      });
    }
  };

  const handleSaveCard = async (cardData: {
    id: string;
    title: string;
    content: string;
    tags: string[];
  }) => {
    try {
      const updatedCard = await learningCardsService.update(cardData.id, cardData);
      setCards(prev => prev.map(card => 
        card.id === updatedCard.id ? updatedCard : card
      ));
      // Update allTags with any new tags
      setAllTags(prev => {
        const newTags = cardData.tags.filter(tag => !prev.includes(tag));
        return newTags.length > 0 ? [...prev, ...newTags] : prev;
      });
      toast({
        title: "Success",
        description: "Card updated successfully",
      });
    } catch (error) {
      console.error('Failed to update card:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update card",
        variant: "destructive",
      });
    }
  };

  const handleDeleteCard = async (id: string) => {
    try {
      await learningCardsService.delete(id);
      setCards(prev => prev.filter(card => card.id !== id));
      toast({
        title: "Success",
        description: "Card deleted successfully",
      });
      loadCards(); // Refresh to update tags
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete card",
        variant: "destructive",
      });
    }
  };

  const filteredCards = cards.filter(card => 
    (!searchQuery || card.title.toLowerCase().includes(searchQuery.toLowerCase())) 
    && (selectedTags.length === 0 || card.tags.some(tag => selectedTags.includes(tag)))
  );

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
          value={selectedTags.join(',')}
          onValueChange={(value) => setSelectedTags(value ? value.split(',') : [])}
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

      <div className="grid gap-6">
        {filteredCards.map((card) => (
          <EnhancedLearningCard
            key={card.id}
            {...card}
            onSave={handleSaveCard}
            onDelete={handleDeleteCard}
          />
        ))}
        {filteredCards.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            {searchQuery || selectedTags.length > 0 ? (
              <p>No cards match your search criteria</p>
            ) : (
              <p>No cards yet. Click "New Card" to create one!</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
