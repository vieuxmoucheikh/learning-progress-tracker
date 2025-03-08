import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { useToast } from './ui/use-toast';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from './ui/alert-dialog';
import { Plus, Trash2, Play, Clock, BookOpen, Star, PlusCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { createDeck, getDecks, getDecksSummary } from '../lib/flashcards';
import type { FlashcardDeck } from '../types';
import type { DeckSummary } from '../lib/flashcards';
import { supabase } from '../lib/supabase';

interface FlashcardDecksProps {
  decks: FlashcardDeck[];
  onSelectDeck: (deckId: string) => void;
  onStudyDeck: (deckId: string) => void;
  onEditDeck: (deckId: string) => void;
  onDeleteDeck: (deckId: string) => void;
  onAddDeck: (data: { name: string; description: string }) => void;
}

export const FlashcardDecks: React.FC<FlashcardDecksProps> = ({ 
  decks,
  onSelectDeck, 
  onStudyDeck,
  onEditDeck,
  onDeleteDeck,
  onAddDeck
}) => {
  const [deckSummaries, setDeckSummaries] = useState<DeckSummary[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const { toast } = useToast();

  useEffect(() => {
    loadDeckSummaries();
  }, []);

  const loadDeckSummaries = async () => {
    try {
      const summariesData = await getDecksSummary();
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold">Your Flashcard Decks</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Manage and study your flashcard collections</p>
        </div>
        <Button onClick={() => setIsCreating(true)} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
          <Plus className="w-4 h-4 mr-2" /> Create Deck
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {getTotalDueCards() > 0 && (
          <Alert variant="default" className="bg-yellow-50 border-yellow-200">
            <Clock className="h-4 w-4 text-yellow-600" />
            <AlertTitle className="text-yellow-600">Cards Due Today</AlertTitle>
            <AlertDescription className="mt-2">
              <div className="space-y-2">
                <p>{getTotalDueCards()} cards need review</p>
                <div className="text-sm space-y-3">
                  {deckSummaries.map(summary => 
                    summary.dueCards.length > 0 && (
                      <div key={summary.deckId} className="pl-4 space-y-1">
                        <h4 className="font-medium text-yellow-800 dark:text-yellow-300">
                          {summary.deckName}
                        </h4>
                        {summary.dueCards.map(card => (
                          <div key={card.id} className="text-yellow-700 dark:text-yellow-400 pl-4">
                            • <span className="font-semibold">{card.front_content}</span>
                          </div>
                        ))}
                      </div>
                    )
                  )}
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}
        {getTotalNotStartedCards() > 0 && (
          <Alert variant="default" className="bg-blue-50 border-blue-200">
            <PlusCircle className="h-4 w-4 text-blue-600" />
            <AlertTitle className="text-blue-600">New Cards</AlertTitle>
            <AlertDescription className="mt-2">
              <div className="space-y-2">
                <p>{getTotalNotStartedCards()} cards to start</p>
                <div className="text-sm space-y-3">
                  {deckSummaries.map(summary => 
                    summary.newCards.length > 0 && (
                      <div key={summary.deckId} className="pl-4 space-y-1">
                        <h4 className="font-medium text-blue-800 dark:text-blue-300">
                          {summary.deckName}
                        </h4>
                        {summary.newCards.map(card => (
                          <div key={card.id} className="text-blue-700 dark:text-blue-400 pl-4">
                            • <span className="font-semibold">{card.front_content}</span>
                          </div>
                        ))}
                      </div>
                    )
                  )}
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {decks.map((deck) => {
          const summary = getDeckSummary(deck.id);
          const masteredPercentage = summary ? (summary.mastered / summary.totalCards) * 100 : 0;
          
          return (
            <div
              key={deck.id}
              className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 overflow-hidden border border-gray-100 dark:border-gray-700"
            >
              <div className="p-6">
                <div className="mb-4">
                  <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">{deck.name}</h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm">{deck.description}</p>
                </div>

                {summary && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-300">Progress</span>
                      <span className="font-medium text-gray-900 dark:text-white">{Math.round(masteredPercentage)}% Complete</span>
                    </div>
                    <div className="h-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-300" 
                        style={{ width: `${masteredPercentage}%` }} 
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700/50 rounded-lg p-2">
                        <BookOpen className="h-4 w-4 text-gray-700 dark:text-gray-300" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">{summary.totalCards} Total</span>
                      </div>
                      <div className="flex items-center gap-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-2">
                        <Star className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
                        <span className="text-sm text-yellow-700 dark:text-yellow-500">{summary.mastered} Mastered</span>
                      </div>
                      {summary.dueToday > 0 && (
                        <div className="flex items-center gap-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg p-2">
                          <Clock className="h-4 w-4 text-orange-600 dark:text-orange-500" />
                          <span className="text-sm text-orange-700 dark:text-orange-500">{summary.dueToday} Due</span>
                        </div>
                      )}
                      {summary.notStarted > 0 && (
                        <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2">
                          <PlusCircle className="h-4 w-4 text-blue-600 dark:text-blue-500" />
                          <span className="text-sm text-blue-700 dark:text-blue-500">{summary.notStarted} New</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t border-gray-100 dark:border-gray-700 p-4 bg-gray-50/80 dark:bg-gray-800/50 backdrop-blur-sm">
                <div className="flex justify-end space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => onSelectDeck(deck.id)}
                    className="bg-white hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                  >
                    Manage
                  </Button>
                  <Button 
                    variant="default"
                    size="sm"
                    onClick={() => onStudyDeck(deck.id)}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                  >
                    <Play className="w-4 h-4 mr-1" /> Study
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => onDeleteDeck(deck.id)}
                        className="bg-red-600 hover:bg-red-700 text-white dark:bg-red-700 dark:hover:bg-red-800"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-gray-900 dark:text-white">Delete Deck</AlertDialogTitle>
                        <AlertDialogDescription className="text-gray-600 dark:text-gray-300">
                          Are you sure you want to delete this deck? All flashcards in this deck will be permanently deleted.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300">Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                          className="bg-red-600 hover:bg-red-700 text-white dark:bg-red-700 dark:hover:bg-red-800"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {decks.length === 0 && (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
          <BookOpen className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
          <h3 className="text-xl font-medium mb-2 text-gray-900 dark:text-white">No flashcard decks yet</h3>
          <p className="text-gray-600 dark:text-gray-300 mb-6">Create your first deck to start learning!</p>
          <Button 
            onClick={() => setIsCreating(true)}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" /> Create Your First Deck
          </Button>
        </div>
      )}

      <Dialog open={isCreating} onOpenChange={setIsCreating}>
        <DialogContent className="bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-white">Create New Deck</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter deck name"
                className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter deck description"
                className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700"
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button 
              variant="outline" 
              onClick={() => setIsCreating(false)}
              className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
            >
              Cancel
            </Button>
            <Button 
              onClick={() => {
                if (!formData.name.trim()) {
                  toast({
                    title: "Error",
                    description: "Please provide a name for the deck",
                    variant: "destructive"
                  });
                  return;
                }
                onAddDeck(formData);
                setIsCreating(false);
                setFormData({ name: '', description: '' });
              }}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
            >
              Create Deck
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};