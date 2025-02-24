import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { createFlashcard, getCardsByDeck, deleteFlashcard } from '../lib/flashcards';
import { useToast } from './ui/use-toast';
import type { Flashcard } from '../types';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from './ui/alert-dialog';

interface FlashcardManagerProps {
  deckId: string;
  onStartStudying: () => void;
  onBackToDecks: () => void;
}

export const FlashcardManager: React.FC<FlashcardManagerProps> = ({ deckId, onStartStudying, onBackToDecks }) => {
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [selectedCard, setSelectedCard] = useState<Flashcard | null>(null);
  const [isCreatingCard, setIsCreatingCard] = useState(false);
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
      setIsCreatingCard(false);
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
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b pb-4">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            className="bg-blue-600 text-white hover:bg-blue-700"
            onClick={onBackToDecks}
          >
            ← Back to Decks
          </Button>
          <h2 className="text-2xl font-bold">Manage Flashcards</h2>
        </div>
        <div className="flex items-center space-x-4">
          <Button
            className="bg-blue-600 text-white hover:bg-blue-700"
            onClick={() => setIsCreatingCard(true)}
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

      {cards.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-600">No flashcards yet. Create your first card to get started!</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {cards.map((card) => (
            <div
              key={card.id}
              className="bg-white rounded-lg shadow-sm border p-4 relative"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1 pr-8">
                  <p className="font-medium mb-2">{card.front_content}</p>
                  <p className="text-gray-600">{card.back_content}</p>
                  {card.next_review && (
                    <p className="text-sm text-gray-500 mt-2">
                      Next review: {new Date(card.next_review).toLocaleDateString()}
                    </p>
                  )}
                  {card.mastered && (
                    <span className="text-sm text-green-600 font-medium mt-2 inline-block">
                      Mastered
                    </span>
                  )}
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 absolute top-4 right-4"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Flashcard</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete this flashcard? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-red-600 text-white hover:bg-red-700"
                        onClick={() => handleDeleteCard(card.id)}
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={isCreatingCard} onOpenChange={setIsCreatingCard}>
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
                onClick={() => setIsCreatingCard(false)}
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
    </div>
  );
};
