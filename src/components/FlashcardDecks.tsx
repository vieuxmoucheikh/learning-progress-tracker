import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Alert, AlertTitle, AlertDescription } from './ui/alert';
import { Bell, LayoutGrid, Check, Clock, Trash2, BookOpen } from 'lucide-react';
import type { FlashcardDeck, Flashcard } from '../types';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from './ui/alert-dialog';
import { useToast } from './ui/use-toast';

interface FlashcardDecksProps {
  onSelectDeck: (deckId: string) => void;
}

interface DeckStats {
  total: number;
  mastered: number;
  dueToday: number;
  notStarted: number;
}

export const FlashcardDecks: React.FC<FlashcardDecksProps> = ({ onSelectDeck }) => {
  const [decks, setDecks] = useState<FlashcardDeck[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [deckStats, setDeckStats] = useState<Record<string, DeckStats>>({});
  const { toast } = useToast();

  useEffect(() => {
    loadDecks();
  }, []);

  const loadDecks = async () => {
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

      const { data: decks, error: decksError } = await supabase
        .from('flashcard_decks')
        .select('*')
        .eq('user_id', userData.user?.id)
        .order('created_at', { ascending: false });

      if (decksError) throw decksError;

      if (decks) {
        setDecks(decks);
        // Load stats for each deck
        decks.forEach(deck => loadDeckStats(deck.id));
      }
    } catch (error) {
      console.error('Error loading decks:', error);
      toast({
        title: "Error",
        description: "Failed to load flashcard decks",
        variant: "destructive"
      });
    }
  };

  const loadDeckStats = async (deckId: string) => {
    try {
      const { data: cards, error } = await supabase
        .from('flashcards')
        .select('*')
        .eq('deck_id', deckId);

      if (error) throw error;

      if (cards) {
        const now = new Date();
        const stats: DeckStats = {
          total: cards.length,
          mastered: cards.filter(card => card.mastered).length,
          dueToday: cards.filter(card => {
            if (card.next_review && !card.mastered) {
              const reviewDate = new Date(card.next_review);
              return reviewDate <= now;
            }
            return false;
          }).length,
          notStarted: cards.filter(card => !card.last_reviewed).length
        };

        setDeckStats(prev => ({
          ...prev,
          [deckId]: stats
        }));
      }
    } catch (error) {
      console.error('Error loading deck stats:', error);
    }
  };

  const handleCreateDeck = async () => {
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      
      if (userError) throw userError;
      if (!userData.user) {
        toast({
          title: "Error",
          description: "You must be logged in to create a deck",
          variant: "destructive"
        });
        return;
      }

      const { data: deck, error } = await supabase
        .from('flashcard_decks')
        .insert([
          {
            name: formData.name,
            description: formData.description,
            user_id: userData.user.id
          }
        ])
        .select()
        .single();

      if (error) throw error;

      if (deck) {
        setDecks([deck, ...decks]);
        setIsCreating(false);
        setFormData({ name: '', description: '' });
        toast({
          title: "Success",
          description: "Deck created successfully",
        });
      }
    } catch (error) {
      console.error('Error creating deck:', error);
      toast({
        title: "Error",
        description: "Failed to create deck",
        variant: "destructive"
      });
    }
  };

  const handleDeleteDeck = async (deckId: string) => {
    try {
      // First delete all flashcards in the deck
      const { error: flashcardsError } = await supabase
        .from('flashcards')
        .delete()
        .eq('deck_id', deckId);

      if (flashcardsError) throw flashcardsError;

      // Then delete the deck
      const { error: deckError } = await supabase
        .from('flashcard_decks')
        .delete()
        .eq('id', deckId);

      if (deckError) throw deckError;

      setDecks(decks.filter(deck => deck.id !== deckId));
      toast({
        title: "Success",
        description: "Deck deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting deck:', error);
      toast({
        title: "Error",
        description: "Failed to delete deck",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">My Flashcard Decks</h2>
        <Button
          className="bg-blue-600 text-white hover:bg-blue-700"
          onClick={() => setIsCreating(true)}
        >
          Create New Deck
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {decks.map((deck) => {
          const stats = deckStats[deck.id];
          return (
            <div
              key={deck.id}
              className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow cursor-pointer"
              onClick={() => onSelectDeck(deck.id)}
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-semibold mb-2">{deck.name}</h3>
                  {deck.description && (
                    <p className="text-gray-600 mb-4">{deck.description}</p>
                  )}
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-600 hover:text-red-700"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Deck</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete this deck? All flashcards in this deck will be permanently deleted.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDeleteDeck(deck.id)}
                        className="bg-red-600 text-white hover:bg-red-700"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>

              {stats && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2 text-sm">
                    <BookOpen className="h-4 w-4 text-blue-600" />
                    <span>{stats.total} cards total</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-600" />
                    <span>{stats.mastered} mastered</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-yellow-600" />
                    <span>{stats.dueToday} due today</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Bell className="h-4 w-4 text-purple-600" />
                    <span>{stats.notStarted} not started</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {decks.length === 0 && (
        <div className="text-center py-8">
          <LayoutGrid className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-xl font-medium mb-2">No flashcard decks yet</h3>
          <p className="text-gray-600 mb-4">Create your first deck to get started!</p>
          <Button
            className="bg-blue-600 text-white hover:bg-blue-700"
            onClick={() => setIsCreating(true)}
          >
            Create New Deck
          </Button>
        </div>
      )}

      <Dialog open={isCreating} onOpenChange={setIsCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Deck</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium">Name</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter deck name"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description (optional)</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter deck description"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsCreating(false)}>
                Cancel
              </Button>
              <Button
                className="bg-blue-600 text-white hover:bg-blue-700"
                onClick={handleCreateDeck}
                disabled={!formData.name.trim()}
              >
                Create Deck
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};