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
  const [deckToDelete, setDeckToDelete] = useState<FlashcardDeck | null>(null);
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

  const handleDeleteDeck = async (deck: FlashcardDeck) => {
    try {
      await onDeleteDeck(deck.id);
      toast({
        title: "Success",
        description: `Deck "${deck.name}" has been deleted`,
      });
      setDeckToDelete(null);
    } catch (error) {
      console.error('Error deleting deck:', error);
      toast({
        title: "Error",
        description: "Failed to delete the deck",
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
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Due Today</h3>
              <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{getTotalDueCards()}</p>
            </div>
            <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-full">
              <Clock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Not Started</h3>
              <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">{getTotalNotStartedCards()}</p>
            </div>
            <div className="p-3 bg-purple-50 dark:bg-purple-900/30 rounded-full">
              <Star className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Decks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {decks.map((deck) => {
          const summary = getDeckSummary(deck.id);
          return (
            <div key={deck.id} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold mb-2">{deck.name}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{deck.description}</p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Deck</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete "{deck.name}"? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDeleteDeck(deck)} className="bg-red-600 hover:bg-red-700">
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
              
              <div className="flex flex-col space-y-2">
                {summary && (
                  <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-4">
                    <span>Due today: {summary.dueToday}</span>
                    <span>Total cards: {summary.totalCards}</span>
                  </div>
                )}
                <div className="flex space-x-2">
                  <Button 
                    onClick={() => onStudyDeck(deck.id)}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    <Play className="w-4 h-4 mr-2" /> Study
                  </Button>
                  <Button 
                    onClick={() => onEditDeck(deck.id)}
                    variant="outline" 
                    className="flex-1"
                  >
                    <BookOpen className="w-4 h-4 mr-2" /> Edit
                  </Button>
                </div>
              </div>
            </div>
          );
        })}

        {/* Create New Deck Card */}
        <div 
          onClick={() => setIsCreating(true)}
          className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-lg shadow-sm border border-dashed border-gray-300 dark:border-gray-700 flex flex-col items-center justify-center space-y-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800/80 transition-colors"
        >
          <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-full">
            <PlusCircle className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <p className="text-lg font-semibold text-gray-600 dark:text-gray-400">Create New Deck</p>
        </div>
      </div>

      {/* Create Deck Dialog */}
      <Dialog open={isCreating} onOpenChange={setIsCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Flashcard Deck</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-1">Deck Name</label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter deck name"
              />
            </div>
            <div>
              <label htmlFor="description" className="block text-sm font-medium mb-1">Description</label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter deck description"
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setIsCreating(false);
                setFormData({ name: '', description: '' });
              }}
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