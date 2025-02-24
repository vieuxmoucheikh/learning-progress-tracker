import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card } from './ui/card';
import { useToast } from './ui/use-toast';
import type { Flashcard } from '../types';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from './ui/alert-dialog';
import { Trash2 } from 'lucide-react';
import { createFlashcard, getCardsByDeck, deleteFlashcard } from '../lib/flashcards';

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
                      <Trash2 className="h-4 w-4" />
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
              <Input
                value={formData.front}
                onChange={(e) => setFormData(prev => ({ ...prev, front: e.target.value }))}
                placeholder="Enter the front content"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">Back</label>
              <Input
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
