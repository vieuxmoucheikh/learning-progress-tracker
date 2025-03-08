import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { useToast } from './ui/use-toast';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from './ui/alert-dialog';
import { Plus, Trash2, Play, Clock, BookOpen, Star, PlusCircle, Edit, FileEdit, Library } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { createDeck, getDecks, getDecksSummary } from '../lib/flashcards';
import type { FlashcardDeck } from '../types';
import type { DeckSummary } from '../lib/flashcards';
import { supabase } from '../lib/supabase';
import { Card, CardHeader, CardContent, CardFooter, CardTitle, CardDescription } from './ui/card';
import { Badge } from './ui/badge';

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
  const [isCreatingDeck, setIsCreatingDeck] = useState(false);
  const [isAddingFlashcard, setIsAddingFlashcard] = useState(false);
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);
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
  
  const handleEditDeckClick = (deckId: string) => {
    onEditDeck(deckId);
  };

  const handleAddFlashcardClick = (deckId: string) => {
    setSelectedDeckId(deckId);
    setIsAddingFlashcard(true);
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
          <h2 className="text-3xl font-bold">Flashcards</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Create decks and flashcards to enhance your learning</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => setIsAddingFlashcard(true)} 
            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
          >
            <PlusCircle className="w-4 h-4 mr-2" /> Add Flashcard
          </Button>
          <Button 
            onClick={() => setIsCreatingDeck(true)} 
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
          >
            <Library className="w-4 h-4 mr-2" /> Create Deck
          </Button>
        </div>
      </div>

      {/* Dashboard Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xl text-blue-600 dark:text-blue-400 flex items-center gap-2">
              <Library className="w-5 h-5" /> Decks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{decks.length}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xl text-blue-600 dark:text-blue-400 flex items-center gap-2">
              <Clock className="w-5 h-5" /> Due Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{getTotalDueCards()}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xl text-purple-600 dark:text-purple-400 flex items-center gap-2">
              <Star className="w-5 h-5" /> New Cards
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{getTotalNotStartedCards()}</p>
          </CardContent>
        </Card>
      </div>
      
      <div className="border-b pb-1 mb-4">
        <h3 className="text-xl font-semibold">Your Flashcard Decks</h3>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-3 mb-6 overflow-x-auto pb-2">
        {decks.map((deck) => (
          <div 
            key={`quick-${deck.id}`}
            className="min-w-[200px] bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/50 dark:to-blue-950/50 p-4 rounded-lg border border-blue-100 dark:border-blue-900 flex flex-col"
          >
            <h4 className="font-medium text-indigo-800 dark:text-indigo-300 mb-2 truncate">{deck.name}</h4>
            
            <div className="flex gap-2 mt-auto">
              <Button 
                size="sm" 
                onClick={() => onStudyDeck(deck.id)}
                className="flex-1 bg-green-600 hover:bg-green-700 h-8 text-xs"
              >
                <Play className="w-3 h-3 mr-1" /> Study
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => handleAddFlashcardClick(deck.id)}
                className="flex-1 h-8 text-xs"
              >
                <Plus className="w-3 h-3 mr-1" /> Add Card
              </Button>
            </div>
          </div>
        ))}
        <div 
          onClick={() => setIsCreatingDeck(true)}
          className="min-w-[200px] bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg border border-dashed border-gray-300 dark:border-gray-700 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800/80 transition-colors"
        >
          <PlusCircle className="w-6 h-6 text-blue-600 dark:text-blue-400 mb-2" />
          <p className="font-medium text-gray-600 dark:text-gray-400">New Deck</p>
        </div>
      </div>

      {/* Decks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {decks.map((deck) => {
          const summary = getDeckSummary(deck.id);
          return (
            <Card key={deck.id} className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle>{deck.name}</CardTitle>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 h-8 w-8">
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
                <CardDescription className="line-clamp-2">{deck.description}</CardDescription>
              </CardHeader>
              
              <CardContent className="pb-2">
                {summary && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    <Badge variant="outline" className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800">
                      {summary.totalCards} Total Cards
                    </Badge>
                    {summary.dueToday > 0 && (
                      <Badge variant="outline" className="bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800">
                        {summary.dueToday} Due
                      </Badge>
                    )}
                    {summary.notStarted > 0 && (
                      <Badge variant="outline" className="bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800">
                        {summary.notStarted} New
                      </Badge>
                    )}
                  </div>
                )}
              </CardContent>
              
              <CardFooter className="pt-2 grid grid-cols-3 gap-2">
                <Button 
                  onClick={() => onStudyDeck(deck.id)}
                  className="bg-green-600 hover:bg-green-700 h-9"
                >
                  <Play className="w-4 h-4 mr-1" /> Study
                </Button>
                <Button 
                  onClick={() => handleEditDeckClick(deck.id)}
                  variant="outline" 
                  className="h-9"
                >
                  <Edit className="w-4 h-4 mr-1" /> Edit
                </Button>
                <Button 
                  onClick={() => handleAddFlashcardClick(deck.id)}
                  variant="outline" 
                  className="h-9"
                >
                  <Plus className="w-4 h-4 mr-1" /> Card
                </Button>
              </CardFooter>
            </Card>
          );
        })}

        {/* Create New Deck Card */}
        <Card 
          onClick={() => setIsCreatingDeck(true)}
          className="border-dashed cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors flex flex-col items-center justify-center py-10"
        >
          <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-full mb-3">
            <PlusCircle className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <p className="text-lg font-semibold text-gray-600 dark:text-gray-400">Create New Deck</p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">Organize your flashcards by topics</p>
        </Card>
      </div>

      {decks.length === 0 && (
        <div className="text-center p-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-medium mb-2">No flashcard decks yet</h3>
          <p className="text-gray-500 mb-6">Create your first deck to start learning</p>
          <Button 
            onClick={() => setIsCreatingDeck(true)}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
          >
            <Plus className="w-4 h-4 mr-2" /> Create Your First Deck
          </Button>
        </div>
      )}

      {/* Create Deck Dialog */}
      <Dialog open={isCreatingDeck} onOpenChange={setIsCreatingDeck}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Flashcard Deck</DialogTitle>
            <DialogDescription>
              Create a category to organize your flashcards
            </DialogDescription>
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
                setIsCreatingDeck(false);
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
                setIsCreatingDeck(false);
                setFormData({ name: '', description: '' });
                toast({
                  title: "Success",
                  description: "New deck created successfully",
                });
              }}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
            >
              Create Deck
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Flashcard Dialog */}
      <Dialog open={isAddingFlashcard} onOpenChange={setIsAddingFlashcard}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Flashcard</DialogTitle>
            <DialogDescription>
              Create a new flashcard to help you learn and remember key concepts
            </DialogDescription>
          </DialogHeader>
          
          {decks.length > 0 ? (
            <div className="space-y-4">
              {!selectedDeckId && (
                <div>
                  <label className="block text-sm font-medium mb-2">Select Deck</label>
                  <div className="grid grid-cols-2 gap-2">
                    {decks.map(deck => (
                      <Button 
                        key={deck.id}
                        variant="outline"
                        className={`justify-start px-3 py-6 h-auto ${selectedDeckId === deck.id ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : ''}`}
                        onClick={() => setSelectedDeckId(deck.id)}
                      >
                        <div className="text-left">
                          <p className="font-medium">{deck.name}</p>
                          <p className="text-xs text-gray-500 line-clamp-1">{deck.description}</p>
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>
              )}
              
              {selectedDeckId && (
                <>
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label htmlFor="front" className="block text-sm font-medium">Front (Question)</label>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-6 text-xs" 
                        onClick={() => setSelectedDeckId(null)}
                      >
                        Change Deck
                      </Button>
                    </div>
                    <Textarea
                      id="front"
                      placeholder="Enter the question or concept"
                      className="min-h-[100px]"
                    />
                  </div>
                  <div>
                    <label htmlFor="back" className="block text-sm font-medium mb-1">Back (Answer)</label>
                    <Textarea
                      id="back"
                      placeholder="Enter the answer or explanation"
                      className="min-h-[100px]"
                    />
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-gray-500 mb-4">You need to create a deck first to add flashcards</p>
              <Button 
                onClick={() => {
                  setIsAddingFlashcard(false);
                  setIsCreatingDeck(true);
                }}
              >
                Create a Deck First
              </Button>
            </div>
          )}
          
          <div className="flex justify-end space-x-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setIsAddingFlashcard(false);
                setSelectedDeckId(null);
              }}
            >
              Cancel
            </Button>
            <Button 
              disabled={!selectedDeckId}
              onClick={() => {
                toast({
                  title: "Success",
                  description: "Flashcard added successfully",
                });
                setIsAddingFlashcard(false);
                setSelectedDeckId(null);
              }}
            >
              Add Flashcard
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};