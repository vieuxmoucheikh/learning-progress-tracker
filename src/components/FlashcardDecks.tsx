import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Alert, AlertTitle, AlertDescription } from './ui/alert';
import { Bell, LayoutGrid, Check, Clock, Trash2 } from 'lucide-react';
import type { FlashcardDeck } from '../types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from './ui/alert-dialog';
import { useToast } from './ui/use-toast';

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
      }, {}) || {};

      setDecks(decksData || []);
      setDueCards(dueCountByDeck);

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

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold">Your Flashcard Decks</h1>
        <Button 
          className="w-full sm:w-auto bg-blue-600 text-white hover:bg-blue-700"
          onClick={() => setIsCreatingDeck(true)}
        >
          Create New Deck
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      ) : decks.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-600">No decks yet. Create your first deck to get started!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {decks.map((deck) => (
            <Card 
              key={deck.id} 
              className="relative hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => onSelectDeck(deck.id)}
            >
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-xl font-bold">{deck.name}</CardTitle>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Deck</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete this deck and all its flashcards? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel onClick={(e) => e.stopPropagation()}>
                          Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-red-600 text-white hover:bg-red-700"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteDeck(deck.id);
                          }}
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
                {deck.description && (
                  <CardDescription>{deck.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <LayoutGrid className="h-4 w-4" />
                    <span>{cardCounts[deck.id]?.total || 0} cards</span>
                  </div>
                  <div className="flex items-center gap-1 text-green-600">
                    <Check className="h-4 w-4" />
                    <span>{cardCounts[deck.id]?.mastered || 0} mastered</span>
                  </div>
                  {dueCards[deck.id] > 0 && (
                    <div className="flex items-center gap-1 text-blue-600">
                      <Clock className="h-4 w-4" />
                      <span>{dueCards[deck.id]} due</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
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
    </div>
  );
};