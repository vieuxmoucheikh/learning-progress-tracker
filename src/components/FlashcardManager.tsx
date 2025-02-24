import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { createFlashcard, getCardsByDeck, deleteFlashcard } from '../lib/flashcards';
import { useToast } from './ui/use-toast';
import type { Flashcard } from '../types';

interface FlashcardManagerProps {
  deckId: string;
  onStartStudying: () => void;
}

export const FlashcardManager: React.FC<FlashcardManagerProps> = ({ deckId, onStartStudying }) => {
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [selectedCard, setSelectedCard] = useState<Flashcard | null>(null);
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [formData, setFormData] = useState({
    front: '',
    back: '',
  });
  const { toast } = useToast();

  useEffect(() => {
    if (deckId) {
      loadCards();
    }
  }, [deckId]);

  const loadCards = async () => {
    try {
      const deckCards = await getCardsByDeck(deckId);
      setCards(deckCards);
    } catch (error) {
      console.error('Error loading cards:', error);
      toast({
        title: 'Error',
        description: 'Failed to load flashcards',
        variant: 'destructive',
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createFlashcard(deckId, formData.front, formData.back);
      setFormData({ front: '', back: '' });
      setIsAddingCard(false);
      loadCards();
      toast({
        title: 'Success',
        description: 'Flashcard created successfully',
      });
    } catch (error) {
      console.error('Error creating flashcard:', error);
      toast({
        title: 'Error',
        description: 'Failed to create flashcard',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    if (!window.confirm('Are you sure you want to delete this card?')) {
      return;
    }

    try {
      await deleteFlashcard(cardId);
      setCards(cards.filter(card => card.id !== cardId));
      toast({
        title: 'Success',
        description: 'Flashcard deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting flashcard:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete flashcard',
        variant: 'destructive',
      });
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Manage Flashcards</h2>
        <div className="space-x-2">
          <Button
            className="bg-blue-600 text-white hover:bg-blue-700"
            onClick={() => setIsAddingCard(true)}
          >
            Add New Card
          </Button>
          <Button
            className="bg-blue-600 text-white hover:bg-blue-700"
            onClick={onStartStudying}
          >
            Start Studying
          </Button>
        </div>
      </div>

      <Dialog open={isAddingCard} onOpenChange={setIsAddingCard}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Flashcard</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Front</label>
              <Textarea
                value={formData.front}
                onChange={(e) => setFormData(prev => ({ ...prev, front: e.target.value }))}
                placeholder="Enter the front content"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">Back</label>
              <Textarea
                value={formData.back}
                onChange={(e) => setFormData(prev => ({ ...prev, back: e.target.value }))}
                placeholder="Enter the back content"
                required
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddingCard(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-blue-600 text-white hover:bg-blue-700"
              >
                Create Card
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedCard} onOpenChange={(open) => !open && setSelectedCard(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Flashcard Details</DialogTitle>
          </DialogHeader>
          {selectedCard && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium mb-2">Front</h3>
                <p className="p-4 bg-gray-50 rounded whitespace-pre-wrap">
                  {selectedCard.front_content}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium mb-2">Back</h3>
                <p className="p-4 bg-gray-50 rounded whitespace-pre-wrap">
                  {selectedCard.back_content}
                </p>
              </div>
              <div className="flex justify-end">
                <Button
                  className="bg-blue-600 text-white hover:bg-blue-700"
                  onClick={() => setSelectedCard(null)}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map(card => (
          <Card
            key={card.id}
            className="p-4 cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => setSelectedCard(card)}
          >
            <div className="flex justify-between items-start">
              <div className="flex-1 overflow-hidden">
                <p className="text-gray-900 font-medium mb-2 line-clamp-3 whitespace-pre-wrap">
                  {card.front_content}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-red-500 hover:text-red-700 ml-2"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteCard(card.id);
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </Button>
            </div>
            {card.next_review && (
              <div className="text-sm text-gray-500 mt-2">
                Next review: {new Date(card.next_review).toLocaleDateString()}
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
};
