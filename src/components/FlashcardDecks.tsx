import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { useToast } from './ui/use-toast';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from './ui/alert-dialog';
import { Plus, Trash2, Play, Clock, BookOpen, Star, PlusCircle, Edit, FileEdit, Library, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { createDeck, getDecks, getDecksSummary, createFlashcard } from '../lib/flashcards';
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
  const [deckFormData, setDeckFormData] = useState({ name: '', description: '' });
  const [flashcardFormData, setFlashcardFormData] = useState({ front: '', back: '' });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Refresh deck summaries whenever decks change
  useEffect(() => {
    loadDeckSummaries();
  }, [decks]);

  const loadDeckSummaries = async () => {
    try {
      setIsLoading(true);
      const summariesData = await getDecksSummary();
      setDeckSummaries(summariesData);
    } catch (error) {
      console.error('Error loading decks:', error);
      toast({
        title: "Error",
        description: "Failed to load flashcard decks",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteDeck = async (deck: FlashcardDeck) => {
    try {
      await onDeleteDeck(deck.id);
      toast({
        title: "Success",
        description: `Deck "${deck.name}" has been deleted`,
      });
      await loadDeckSummaries();
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

  const handleAddFlashcardSubmit = async () => {
    if (!selectedDeckId) return;
    
    if (!flashcardFormData.front.trim()) {
      toast({
        title: "Error",
        description: "Please provide content for the front of the flashcard",
        variant: "destructive"
      });
      return;
    }

    if (!flashcardFormData.back.trim()) {
      toast({
        title: "Error",
        description: "Please provide content for the back of the flashcard",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsLoading(true);
      await createFlashcard({
        deckId: selectedDeckId,
        front: flashcardFormData.front,
        back: flashcardFormData.back
      });

      toast({
        title: "Success",
        description: "Flashcard added successfully",
      });
      
      // Reset form and close dialog
      setFlashcardFormData({ front: '', back: '' });
      setIsAddingFlashcard(false);
      setSelectedDeckId(null);
      
      // Refresh summaries to update counts
      await loadDeckSummaries();
    } catch (error) {
      console.error('Error adding flashcard:', error);
      toast({
        title: "Error",
        description: "Failed to add flashcard",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
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

  const hasDueCards = getTotalDueCards() > 0;
  const hasNewCards = getTotalNotStartedCards() > 0;

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
            disabled={isLoading}
          >
            <PlusCircle className="w-4 h-4 mr-2" /> Add Flashcard
          </Button>
          <Button 
            onClick={() => setIsCreatingDeck(true)} 
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            disabled={isLoading}
          >
            <Library className="w-4 h-4 mr-2" /> Create Deck
        </Button>
        </div>
      </div>

      {/* Review Alert Messages */}
      <div className="space-y-4">
        {hasDueCards && (
          <Alert variant="default" className="bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800">
            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <AlertTitle className="text-amber-800 dark:text-amber-300">Cards Due for Review</AlertTitle>
            <AlertDescription className="text-amber-700 dark:text-amber-400">
              You have {getTotalDueCards()} cards that need to be reviewed today.
            </AlertDescription>
          </Alert>
        )}
        
        {hasNewCards && (
          <Alert variant="default" className="bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800">
            <Star className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <AlertTitle className="text-blue-800 dark:text-blue-300">New Cards Available</AlertTitle>
            <AlertDescription className="text-blue-700 dark:text-blue-400">
              You have {getTotalNotStartedCards()} new cards to start learning.
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Dashboard Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg sm:text-xl text-blue-600 dark:text-blue-400 flex items-center gap-2">
              <Library className="w-4 h-4 sm:w-5 sm:h-5" /> Decks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl sm:text-3xl font-bold">{decks.length}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg sm:text-xl text-blue-600 dark:text-blue-400 flex items-center gap-2">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5" /> Due Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl sm:text-3xl font-bold">{getTotalDueCards()}</p>
          </CardContent>
        </Card>

        <Card className="sm:col-span-2 md:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg sm:text-xl text-purple-600 dark:text-purple-400 flex items-center gap-2">
              <Star className="w-4 h-4 sm:w-5 sm:h-5" /> New Cards
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl sm:text-3xl font-bold">{getTotalNotStartedCards()}</p>
          </CardContent>
        </Card>
      </div>
      
      <div className="border-b pb-1 mb-4">
        <h3 className="text-xl font-semibold">Your Flashcard Decks</h3>
      </div>

      {/* Decks Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {decks.map((deck) => {
          const summary = getDeckSummary(deck.id);
          return (
            <Card key={deck.id} className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-base sm:text-lg">{deck.name}</CardTitle>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 h-8 w-8"
                        disabled={isLoading}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="max-w-[90vw] sm:max-w-lg">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Deck</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete "{deck.name}"? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeleteDeck(deck)} className="bg-red-600 hover:bg-red-700">
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
                <CardDescription className="line-clamp-2 text-xs sm:text-sm">{deck.description}</CardDescription>
              </CardHeader>
              
              <CardContent className="pb-2">
                {summary && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    <Badge variant="outline" className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 text-xs">
                      {summary.totalCards} Total Cards
                    </Badge>
                    {summary.dueToday > 0 && (
                      <Badge variant="outline" className="bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 text-xs">
                        {summary.dueToday} Due
                      </Badge>
                    )}
                    {summary.notStarted > 0 && (
                      <Badge variant="outline" className="bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800 text-xs">
                        {summary.notStarted} New
                      </Badge>
                    )}
                  </div>
                )}
              </CardContent>
              
              <CardFooter className="pt-2 grid grid-cols-3 gap-2">
                <Button 
                  onClick={() => onStudyDeck(deck.id)}
                  className="bg-green-600 hover:bg-green-700 h-8 sm:h-9 text-xs sm:text-sm"
                  disabled={isLoading}
                >
                  <Play className="w-3 h-3 sm:w-4 sm:h-4 mr-1" /> Study
                </Button>
                <Button 
                  onClick={() => handleEditDeckClick(deck.id)}
                  variant="outline" 
                  className="h-8 sm:h-9 text-xs sm:text-sm"
                  disabled={isLoading}
                >
                  <Edit className="w-3 h-3 sm:w-4 sm:h-4 mr-1" /> Edit
                </Button>
                <Button 
                  onClick={() => handleAddFlashcardClick(deck.id)}
                  variant="outline" 
                  className="h-8 sm:h-9 text-xs sm:text-sm"
                  disabled={isLoading}
                >
                  <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1" /> Card
                </Button>
              </CardFooter>
            </Card>
          );
        })}

        {/* Create New Deck Card */}
        {decks.length > 0 && (
          <Card 
            onClick={() => !isLoading && setIsCreatingDeck(true)}
            className={`border-dashed cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors flex flex-col items-center justify-center py-10 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-full mb-3">
              <PlusCircle className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <p className="text-lg font-semibold text-gray-600 dark:text-gray-400">Create New Deck</p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">Organize your flashcards by topics</p>
          </Card>
        )}
      </div>

      {decks.length === 0 && (
        <div className="text-center p-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-medium mb-2">No flashcard decks yet</h3>
          <p className="text-gray-500 mb-6">Create your first deck to start learning</p>
          <Button 
            onClick={() => setIsCreatingDeck(true)}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            disabled={isLoading}
          >
            <Plus className="w-4 h-4 mr-2" /> Create Your First Deck
          </Button>
        </div>
      )}

      {/* Create Deck Dialog */}
      <Dialog open={isCreatingDeck} onOpenChange={(open) => !isLoading && setIsCreatingDeck(open)}>
        <DialogContent className="max-w-[90vw] sm:max-w-lg">
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
                value={deckFormData.name}
                onChange={(e) => setDeckFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter deck name"
                disabled={isLoading}
                className="w-full"
              />
            </div>
            <div>
              <label htmlFor="description" className="block text-sm font-medium mb-1">Description</label>
              <Textarea
                id="description"
                value={deckFormData.description}
                onChange={(e) => setDeckFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter deck description"
                disabled={isLoading}
                className="w-full min-h-[80px] sm:min-h-[100px]"
              />
            </div>
          </div>
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-2 mt-4">
            <Button 
              variant="outline" 
              onClick={() => {
                setIsCreatingDeck(false);
                setDeckFormData({ name: '', description: '' });
              }}
              className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button 
              onClick={async () => {
                if (!deckFormData.name.trim()) {
                  toast({
                    title: "Error",
                    description: "Please provide a name for the deck",
                    variant: "destructive"
                  });
                  return;
                }
                try {
                  setIsLoading(true);
                  await onAddDeck(deckFormData);
                  setIsCreatingDeck(false);
                  setDeckFormData({ name: '', description: '' });
                  toast({
                    title: "Success",
                    description: "New deck created successfully",
                  });
                  await loadDeckSummaries();
                } catch (error) {
                  console.error('Error creating deck:', error);
                  toast({
                    title: "Error",
                    description: "Failed to create deck",
                    variant: "destructive"
                  });
                } finally {
                  setIsLoading(false);
                }
              }}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white w-full sm:w-auto"
              disabled={isLoading}
            >
              {isLoading ? 'Creating...' : 'Create Deck'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Flashcard Dialog */}
      <Dialog open={isAddingFlashcard} onOpenChange={(open) => !isLoading && setIsAddingFlashcard(open)}>
        <DialogContent className="max-w-[90vw] sm:max-w-lg">
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[40vh] overflow-y-auto pr-1">
                    {decks.map(deck => (
                      <Button 
                        key={deck.id}
                        variant="outline"
                        className={`justify-start px-3 py-4 sm:py-6 h-auto ${selectedDeckId === deck.id ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : ''}`}
                        onClick={() => setSelectedDeckId(deck.id)}
                        disabled={isLoading}
                      >
                        <div className="text-left">
                          <p className="font-medium text-sm">{deck.name}</p>
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
                        disabled={isLoading}
                      >
                        Change Deck
                      </Button>
                    </div>
                    <Textarea
                      id="front"
                      placeholder="Enter the question or concept"
                      className="min-h-[80px] sm:min-h-[100px] w-full"
                      value={flashcardFormData.front}
                      onChange={(e) => setFlashcardFormData(prev => ({ ...prev, front: e.target.value }))}
                      disabled={isLoading}
                    />
                  </div>
                  <div>
                    <label htmlFor="back" className="block text-sm font-medium mb-1">Back (Answer)</label>
                    <Textarea
                      id="back"
                      placeholder="Enter the answer or explanation"
                      className="min-h-[80px] sm:min-h-[100px] w-full"
                      value={flashcardFormData.back}
                      onChange={(e) => setFlashcardFormData(prev => ({ ...prev, back: e.target.value }))}
                      disabled={isLoading}
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
                disabled={isLoading}
                className="w-full sm:w-auto"
              >
                Create a Deck First
              </Button>
            </div>
          )}
          
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-2 mt-4">
            <Button 
              variant="outline" 
              onClick={() => {
                setIsAddingFlashcard(false);
                setSelectedDeckId(null);
                setFlashcardFormData({ front: '', back: '' });
              }}
              disabled={isLoading}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button 
              disabled={!selectedDeckId || isLoading}
              onClick={handleAddFlashcardSubmit}
              className="w-full sm:w-auto"
            >
              {isLoading ? 'Adding...' : 'Add Flashcard'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};