import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { createFlashcard, getCardsByDeck } from '../lib/flashcards';
import type { Flashcard } from '../types';

interface FlashcardManagerProps {
  deckId: string;
}

export const FlashcardManager: React.FC<FlashcardManagerProps> = ({ deckId }) => {
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newCard, setNewCard] = useState({
    frontContent: '',
    backContent: '',
    tags: [] as string[]
  });

  useEffect(() => {
    if (deckId) {
      loadCards();
    }
  }, [deckId]);

  const loadCards = async () => {
    try {
      const fetchedCards = await getCardsByDeck(deckId);
      setCards(fetchedCards);
    } catch (error) {
      console.error('Error loading cards:', error);
    }
  };

  const handleCreateCard = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createFlashcard(
        deckId,
        newCard.frontContent,
        newCard.backContent,
        newCard.tags
      );
      setIsCreateDialogOpen(false);
      setNewCard({ frontContent: '', backContent: '', tags: [] });
      await loadCards();
    } catch (error) {
      console.error('Error creating card:', error);
    }
  };

  const handleTagInput = (value: string) => {
    const tags = value.split(',').map(tag => tag.trim()).filter(Boolean);
    setNewCard(prev => ({ ...prev, tags }));
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Manage Flashcards</h2>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>Add New Card</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Flashcard</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateCard} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Front</label>
                <Input
                  value={newCard.frontContent}
                  onChange={(e) => setNewCard(prev => ({ ...prev, frontContent: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Back</label>
                <Input
                  value={newCard.backContent}
                  onChange={(e) => setNewCard(prev => ({ ...prev, backContent: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Tags (comma-separated)</label>
                <Input
                  value={newCard.tags.join(', ')}
                  onChange={(e) => handleTagInput(e.target.value)}
                  placeholder="tag1, tag2, tag3"
                />
              </div>
              <Button type="submit" className="w-full">Create Card</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map(card => (
          <Card key={card.id} className="p-6">
            <div className="mb-4">
              <h3 className="font-semibold mb-2">Front</h3>
              <p className="text-gray-600">{card.front_content}</p>
            </div>
            <div className="mb-4">
              <h3 className="font-semibold mb-2">Back</h3>
              <p className="text-gray-600">{card.back_content}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {card.tags.map(tag => (
                <span
                  key={tag}
                  className="px-2 py-1 bg-gray-100 rounded-full text-xs"
                >
                  {tag}
                </span>
              ))}
            </div>
            <div className="mt-4 text-sm text-gray-500">
              Next review: {new Date(card.next_review).toLocaleDateString()}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
