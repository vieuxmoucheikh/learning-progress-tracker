import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { useToast } from './ui/use-toast';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from './ui/alert-dialog';
import { Plus, Trash2, Play, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { createDeck, getDecks, getDecksSummary } from '../lib/flashcards';
import type { FlashcardDeck } from '../types';
import type { DeckSummary } from '../lib/flashcards';
import { supabase } from '../lib/supabase';

interface FlashcardDecksProps {
  onSelectDeck: (deckId: string) => void;
  onStudyDeck: (deckId: string) => void;
}

export const FlashcardDecks: React.FC<FlashcardDecksProps> = ({ onSelectDeck, onStudyDeck }) => {
  const [decks, setDecks] = useState<FlashcardDeck[]>([]);
  const [deckSummaries, setDeckSummaries] = useState<DeckSummary[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const { toast } = useToast();

  useEffect(() => {
    loadDecks();
  }, []);

  const loadDecks = async () => {
    try {
      const [decksData, summariesData] = await Promise.all([
        getDecks(),
        getDecksSummary()
      ]);
      setDecks(decksData);
      setDeckSummaries(summariesData);
    } catch (error) {
      console.error('Error loading decks:', error);
      toast({
        title: "Error",
        description: "Failed to load flashcard decks",
        variant: "destructive"
      });
    }
  };

  const getTotalDueCards = () => {
    return deckSummaries.reduce((total, summary) => total + summary.dueToday, 0);
  };

  const getTotalNotStartedCards = () => {
    return deckSummaries.reduce((total, summary) => total + summary.notStarted, 0);
  };

  const getDeckSummary = (deckId: string) => {
    return deckSummaries.find(summary => summary.deckId === deckId);
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
      const { error } = await supabase
        .from('flashcard_decks')
        .delete()
        .eq('id', deckId)
        .order('created_at', { ascending: true });

      if (error) {
        throw error;
      }

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
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Your Flashcard Decks</h2>
        <Button onClick={() => setIsCreating(true)}>
          <Plus className="w-4 h-4 mr-2" /> Create Deck
        </Button>
      </div>

      {/* Summary Alerts */}
      {getTotalDueCards() > 0 && (
        <Alert variant="default" className="bg-yellow-50 border-yellow-200">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertTitle className="text-yellow-600">Cards Due Today</AlertTitle>
          <AlertDescription>
            You have {getTotalDueCards()} cards due for review today across all decks.
          </AlertDescription>
        </Alert>
      )}

      {getTotalNotStartedCards() > 0 && (
        <Alert variant="default" className="bg-blue-50 border-blue-200">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-600">New Cards Available</AlertTitle>
          <AlertDescription>
            You have {getTotalNotStartedCards()} cards that haven't been studied yet.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {decks.map((deck) => {
          const summary = getDeckSummary(deck.id);
          return (
            <div
              key={deck.id}
              className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow space-y-4"
            >
              <div>
                <h3 className="text-xl font-semibold mb-2">{deck.name}</h3>
                <p className="text-gray-600 dark:text-gray-300">{deck.description}</p>
              </div>

              {/* Deck Statistics */}
              {summary && (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Total Cards:</span>
                    <span className="font-medium">{summary.totalCards}</span>
                  </div>
                  {summary.dueToday > 0 && (
                    <div className="flex justify-between text-yellow-600">
                      <span>Due Today:</span>
                      <span className="font-medium">{summary.dueToday}</span>
                    </div>
                  )}
                  {summary.notStarted > 0 && (
                    <div className="flex justify-between text-blue-600">
                      <span>Not Started:</span>
                      <span className="font-medium">{summary.notStarted}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end space-x-2">
                <Button variant="outline" size="sm" onClick={() => onSelectDeck(deck.id)}>
                  Manage
                </Button>
                <Button variant="outline" size="sm" onClick={() => onStudyDeck(deck.id)}>
                  <Play className="w-4 h-4 mr-1" /> Study
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Deck</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete this deck? All flashcards in this deck will be permanently deleted.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDeleteDeck(deck.id)}>
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          );
        })}
      </div>

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