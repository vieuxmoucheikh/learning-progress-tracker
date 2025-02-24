import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { supabase } from '../lib/supabase';
import { useToast } from './ui/use-toast';
import { Alert, AlertTitle, AlertDescription } from './ui/alert';
import { Bell } from 'lucide-react';
import type { FlashcardDeck } from '../types';

interface FlashcardDecksProps {
  onSelectDeck: (deckId: string) => void;
}

export const FlashcardDecks: React.FC<FlashcardDecksProps> = ({ onSelectDeck }) => {
  const [decks, setDecks] = useState<FlashcardDeck[]>([]);
  const [loading, setLoading] = useState(true);
  const [dueCards, setDueCards] = useState<{ [key: string]: number }>({});
  const { toast } = useToast();

  useEffect(() => {
    loadDecks();
  }, []);

  const loadDecks = async () => {
    try {
      setLoading(true);
      const { data: decksData, error: decksError } = await supabase
        .from('flashcard_decks')
        .select('*');

      if (decksError) throw decksError;

      const now = new Date().toISOString();
      const { data: dueCardsData, error: dueError } = await supabase
        .from('flashcards')
        .select('deck_id, id')
        .lt('next_review', now);

      if (dueError) throw dueError;

      // Count due cards per deck
      const dueCountByDeck = dueCardsData?.reduce((acc: { [key: string]: number }, card) => {
        acc[card.deck_id] = (acc[card.deck_id] || 0) + 1;
        return acc;
      }, {});

      setDecks(decksData || []);
      setDueCards(dueCountByDeck || {});

      // Show toast if there are any due cards
      const totalDueCards = Object.values(dueCountByDeck || {}).reduce((a, b) => a + b, 0);
      if (totalDueCards > 0) {
        toast({
          title: "Time to review!",
          description: `You have ${totalDueCards} card${totalDueCards === 1 ? '' : 's'} due for review.`,
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

  if (loading) {
    return <div className="p-4">Loading decks...</div>;
  }

  const totalDueCards = Object.values(dueCards).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      {totalDueCards > 0 && (
        <Alert className="bg-blue-50 border-blue-200">
          <Bell className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-800">Time to Review!</AlertTitle>
          <AlertDescription className="text-blue-600">
            You have {totalDueCards} card{totalDueCards === 1 ? '' : 's'} due for review
            across {Object.keys(dueCards).length} deck{Object.keys(dueCards).length === 1 ? '' : 's'}.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {decks.map((deck) => (
          <div
            key={deck.id}
            className="bg-white rounded-lg shadow-md p-6 border border-gray-200 hover:shadow-lg transition-shadow"
          >
            <h3 className="text-xl font-semibold mb-2">{deck.name}</h3>
            <p className="text-gray-600 mb-4">{deck.description || 'No description'}</p>
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">
                {deck.cardCount || 0} cards
                {dueCards[deck.id] > 0 && (
                  <span className="ml-2 text-blue-600 font-medium">
                    • {dueCards[deck.id]} due
                  </span>
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
        ))}
      </div>
    </div>
  );
};