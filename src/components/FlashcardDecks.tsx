import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from './ui/dialog';
import { createDeck, getDecks, deleteDeck } from '../lib/flashcards';
import { useToast } from './ui/use-toast';
import type { FlashcardDeck } from '../types';

interface DeckFormData {
  name: string;
  description: string;
  tags: string[];
}

interface FlashcardDecksProps {
  onSelectDeck: (deckId: string) => void;
}

export const FlashcardDecks: React.FC<FlashcardDecksProps> = ({ onSelectDeck }) => {
  const [decks, setDecks] = useState<FlashcardDeck[]>([]);
  const [dueCards, setDueCards] = useState<{ [key: string]: number }>({});
  const [isCreatingDeck, setIsCreatingDeck] = useState(false);
  const [formData, setFormData] = useState<DeckFormData>({
    name: '',
    description: '',
    tags: []
  });
  const { toast } = useToast();

  useEffect(() => {
    loadDecks();
    checkDueCards();
  }, []);

  const loadDecks = async () => {
    try {
      const fetchedDecks = await getDecks();
      setDecks(fetchedDecks);
    } catch (error) {
      console.error('Error loading decks:', error);
      toast({
        title: "Error",
        description: "Failed to load flashcard decks. Please try again.",
        variant: "destructive"
      });
    }
  };

  const checkDueCards = async () => {
    try {
      const now = new Date().toISOString();
      const { data: cards, error } = await supabase
        .from('flashcards')
        .select('deck_id, id')
        .lt('next_review', now);

      if (error) throw error;

      if (cards) {
        const dueByDeck: { [key: string]: number } = {};
        cards.forEach(card => {
          dueByDeck[card.deck_id] = (dueByDeck[card.deck_id] || 0) + 1;
        });
        setDueCards(dueByDeck);

        const totalDue = Object.values(dueByDeck).reduce((a, b) => a + b, 0);
        if (totalDue > 0) {
          toast({
            title: "Time to review!",
            description: `You have ${totalDue} cards due for review.`,
            duration: 5000,
          });
        }
      }
    } catch (error) {
      console.error('Error checking due cards:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!formData.name.trim()) {
        toast({
          title: "Error",
          description: "Please enter a deck name",
          variant: "destructive"
        });
        return;
      }

      await createDeck(formData.name, formData.description, formData.tags);
      setIsCreatingDeck(false);
      setFormData({ name: '', description: '', tags: [] });
      await loadDecks();
      
      toast({
        title: "Success",
        description: "Deck created successfully!",
      });
    } catch (error) {
      console.error('Error creating deck:', error);
      toast({
        title: "Error",
        description: "Failed to create deck. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleTagInput = (value: string) => {
    const tags = value.split(',').map(tag => tag.trim()).filter(Boolean);
    setFormData(prev => ({ ...prev, tags }));
  };

  const handleDeleteDeck = async (deckId: string) => {
    if (!window.confirm('Are you sure you want to delete this deck? This will also delete all cards in the deck.')) {
      return;
    }

    try {
      await deleteDeck(deckId);
      // Remove the deck from local state
      setDecks(decks.filter(deck => deck.id !== deckId));
    } catch (error) {
      console.error('Error deleting deck:', error);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">My Flashcard Decks</h2>
        <Button
          className="bg-blue-600 text-white hover:bg-blue-700"
          onClick={() => setIsCreatingDeck(true)}
        >
          Create New Deck
        </Button>
      </div>

      {Object.values(dueCards).some(count => count > 0) && (
        <Alert className="bg-blue-50 border-blue-200">
          <Bell className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-800">Time to Review!</AlertTitle>
          <AlertDescription className="text-blue-600">
            You have cards due for review in your decks.
          </AlertDescription>
        </Alert>
      )}

      <Dialog open={isCreatingDeck} onOpenChange={setIsCreatingDeck}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Deck</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Name</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter deck name"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter deck description"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Tags (comma-separated)</label>
              <Input
                value={formData.tags.join(', ')}
                onChange={(e) => handleTagInput(e.target.value)}
                placeholder="tag1, tag2, tag3"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreatingDeck(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-blue-600 text-white hover:bg-blue-700"
              >
                Create Deck
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {decks.length === 0 ? (
          <div className="col-span-full text-center py-8">
            <p className="text-gray-600">No flashcard decks yet. Create your first deck to get started!</p>
          </div>
        ) : (
          decks.map(deck => (
            <Card key={deck.id} className="p-6 cursor-pointer hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-semibold">{deck.name}</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-red-500 hover:text-red-700"
                  onClick={() => handleDeleteDeck(deck.id)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </Button>
              </div>
              {deck.description && (
                <p className="text-gray-600 mb-4">{deck.description}</p>
              )}
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">
                  {deck.cardCount || 0} cards
                </span>
                {dueCards[deck.id] > 0 && (
                  <span className="text-blue-600 font-medium">
                    {dueCards[deck.id]} due
                  </span>
                )}
                <div className="space-x-2">
                  <Button
                    className="bg-blue-600 text-white hover:bg-blue-700"
                    onClick={() => onSelectDeck(deck.id)}
                  >
                    Study Now
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};