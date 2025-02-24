import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { supabase } from '../lib/supabase';
import { useToast } from './ui/use-toast';
import { Alert, AlertTitle, AlertDescription } from './ui/alert';
import { Bell } from 'lucide-react';
import type { FlashcardDeck } from '../types';

interface FlashcardDecksProps {
  onSelectDeck: (deckId: string) => void;
}

interface DeckFormData {
  name: string;
  description: string;
  tags: string[];
}

export const FlashcardDecks: React.FC<FlashcardDecksProps> = ({ onSelectDeck }) => {
  const [decks, setDecks] = useState<FlashcardDeck[]>([]);
  const [loading, setLoading] = useState(true);
  const [dueCards, setDueCards] = useState<{ [key: string]: number }>({});
  const [cardCounts, setCardCounts] = useState<{ [key: string]: { total: number; mastered: number } }>({});
  const [isCreatingDeck, setIsCreatingDeck] = useState(false);
  const [formData, setFormData] = useState<DeckFormData>({
    name: '',
    description: '',
    tags: []
  });
  const { toast } = useToast();

  useEffect(() => {
    loadDecks();
  }, []);

  const loadDecks = async () => {
    try {
      setLoading(true);
      // First get all decks
      const { data: decksData, error: decksError } = await supabase
        .from('flashcard_decks')
        .select('*');

      if (decksError) throw decksError;

      // Get card counts and mastery status for each deck
      const { data: cardData, error: cardError } = await supabase
        .from('flashcards')
        .select('deck_id, mastered');

      if (cardError) throw cardError;

      // Calculate card counts
      const counts: { [key: string]: { total: number; mastered: number } } = {};
      cardData?.forEach(card => {
        if (!counts[card.deck_id]) {
          counts[card.deck_id] = { total: 0, mastered: 0 };
        }
        counts[card.deck_id].total++;
        if (card.mastered) {
          counts[card.deck_id].mastered++;
        }
      });
      setCardCounts(counts);

      // Then get due cards (not mastered and due)
      const now = new Date().toISOString();
      const { data: dueCardsData, error: dueError } = await supabase
        .from('flashcards')
        .select('deck_id, id')
        .lt('next_review', now)
        .eq('mastered', false);

      if (dueError) throw dueError;

      // Count due cards per deck
      const dueCountByDeck = dueCardsData?.reduce((acc: { [key: string]: number }, card) => {
        acc[card.deck_id] = (acc[card.deck_id] || 0) + 1;
        return acc;
      }, {});

      setDecks(decksData || []);
      setDueCards(dueCountByDeck || {});

      // Show toast if there are any due cards
      if (dueCardsData && dueCardsData.length > 0) {
        const dueDecks = decksData
          ?.filter(deck => dueCountByDeck[deck.id])
          .map(deck => ({
            name: deck.name,
            count: dueCountByDeck[deck.id]
          }));

        const dueMessage = dueDecks
          ?.map(deck => `${deck.count} in "${deck.name}"`)
          .join(', ');

        toast({
          title: "Time to review!",
          description: `You have cards due: ${dueMessage}`,
          duration: 5000,
        });
      }
    } catch (error) {
      console.error('Error loading decks:', error);
      toast({
        title: "Error",
        description: "Failed to load flashcard decks",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDeck = async (e: React.FormEvent) => {
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

      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        throw new Error('Not authenticated');
      }

      const { data: deck, error } = await supabase
        .from('flashcard_decks')
        .insert({
          name: formData.name.trim(),
          description: formData.description.trim(),
          tags: formData.tags,
          user_id: userData.user.id
        })
        .select()
        .single();

      if (error) throw error;

      setDecks([...decks, deck]);
      setIsCreatingDeck(false);
      setFormData({ name: '', description: '', tags: [] });
      
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

  const handleDeleteDeck = async (deckId: string) => {
    if (!window.confirm('Are you sure you want to delete this deck? This action cannot be undone.')) {
      return;
    }

    try {
      // First delete all cards in the deck
      const { error: cardsError } = await supabase
        .from('flashcards')
        .delete()
        .eq('deck_id', deckId);

      if (cardsError) throw cardsError;

      // Then delete the deck
      const { error: deckError } = await supabase
        .from('flashcard_decks')
        .delete()
        .eq('id', deckId);

      if (deckError) throw deckError;

      // Update local state
      setDecks(decks.filter(deck => deck.id !== deckId));
      
      toast({
        title: "Success",
        description: "Deck deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting deck:', error);
      toast({
        title: "Error",
        description: "Failed to delete deck. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleTagInput = (value: string) => {
    const tags = value.split(',').map(tag => tag.trim()).filter(Boolean);
    setFormData(prev => ({ ...prev, tags }));
  };

  if (loading) {
    return <div className="p-4">Loading decks...</div>;
  }

  const totalDueCards = Object.values(dueCards).reduce((a, b) => a + b, 0);
  const dueDecks = decks
    .filter(deck => dueCards[deck.id])
    .map(deck => ({
      name: deck.name,
      count: dueCards[deck.id]
    }));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">My Flashcard Decks</h2>
        <Button
          className="bg-blue-600 text-white hover:bg-blue-700"
          onClick={() => setIsCreatingDeck(true)}
        >
          Create New Deck
        </Button>
      </div>

      {totalDueCards > 0 && (
        <Alert className="bg-blue-50 border-blue-200">
          <Bell className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-800">Time to Review!</AlertTitle>
          <AlertDescription className="text-blue-600 space-y-1">
            <p>You have {totalDueCards} card{totalDueCards === 1 ? '' : 's'} due for review:</p>
            <ul className="list-disc list-inside pl-2">
              {dueDecks.map(deck => (
                <li key={deck.name}>
                  {deck.count} card{deck.count === 1 ? '' : 's'} in "{deck.name}"
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <Dialog open={isCreatingDeck} onOpenChange={setIsCreatingDeck}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Deck</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateDeck} className="space-y-4">
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {decks.map((deck) => {
          const deckStats = cardCounts[deck.id] || { total: 0, mastered: 0 };
          return (
            <div
              key={deck.id}
              className="bg-white rounded-lg shadow-md p-6 border border-gray-200 hover:shadow-lg transition-shadow"
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-xl font-semibold">{deck.name}</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  onClick={() => handleDeleteDeck(deck.id)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </Button>
              </div>
              <p className="text-gray-600 mb-4">{deck.description || 'No description'}</p>
              <div className="flex items-center justify-between">
                <div className="text-sm space-y-1">
                  <div className="text-gray-500">
                    {deckStats.total} card{deckStats.total === 1 ? '' : 's'} total
                  </div>
                  <div className="text-green-600">
                    {deckStats.mastered} mastered
                  </div>
                  {dueCards[deck.id] > 0 && (
                    <div className="text-blue-600 font-medium">
                      {dueCards[deck.id]} due
                    </div>
                  )}
                </div>
                <Button
                  className="bg-blue-600 text-white hover:bg-blue-700"
                  onClick={() => onSelectDeck(deck.id)}
                >
                  Study Now
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};