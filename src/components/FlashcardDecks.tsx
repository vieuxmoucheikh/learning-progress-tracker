import { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { Plus, Trash2, Edit, Library, BookOpen, Play, Clock, PlusCircle, Star, RefreshCw } from 'lucide-react';
import { useToast } from './ui/use-toast';
import { FlashcardDeck } from '@/types';

interface DeckSummary {
  deckId: string;
  total: number;
  dueToday: number;
  reviewStatus: 'up-to-date' | 'due-soon' | 'overdue' | 'not-started';
  lastStudied?: string;
}

interface FlashcardDecksProps {
  decks: FlashcardDeck[];
  onStudyDeck: (deckId: string) => void;
  onEditDeck: (deckId: string) => void;
  onDeleteDeck: (deckId: string) => void;
  onAddDeck: (data: { name: string; description: string }) => void;
}

export const FlashcardDecks: React.FC<FlashcardDecksProps> = ({ 
  decks,
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
  const [localDecks, setLocalDecks] = useState<FlashcardDeck[]>(decks);
  const { toast } = useToast();
  const initializedRef = useRef(false);

  useEffect(() => {
    setLocalDecks(decks);
  }, [decks]);

  useEffect(() => {
    if (!initializedRef.current || localDecks.length !== deckSummaries.length) {
      const summaries = localDecks.map(deck => ({
        deckId: deck.id,
        total: Math.floor(Math.random() * 20) + 1,
        dueToday: Math.floor(Math.random() * 5),
        reviewStatus: ['up-to-date', 'due-soon', 'overdue', 'not-started'][Math.floor(Math.random() * 4)] as 'up-to-date' | 'due-soon' | 'overdue' | 'not-started',
        lastStudied: Math.random() > 0.3 ? new Date(Date.now() - Math.random() * 1000 * 60 * 60 * 24 * 30).toISOString() : undefined
      }));
      setDeckSummaries(summaries);
      initializedRef.current = true;
    }
  }, [localDecks]);

  const handleCreateDeckSubmit = () => {
    if (!deckFormData.name.trim()) {
      toast({
        title: "Error",
        description: "Please provide a name for your deck",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    
    const newDeckId = `deck-${Date.now()}`;
    
    const newDeck: FlashcardDeck = {
      id: newDeckId,
      name: deckFormData.name.trim(),
      description: deckFormData.description.trim(),
      created_at: new Date().toISOString(),
      user_id: 'current-user' // Assuming there's a user_id required
    };
    
    setLocalDecks(prev => [...prev, newDeck]);
    
    const newSummary: DeckSummary = {
      deckId: newDeckId,
      total: 0,
      dueToday: 0,
      reviewStatus: 'not-started',
      lastStudied: undefined
    };
    
    setDeckSummaries(prev => [...prev, newSummary]);
    
    onAddDeck({
      name: deckFormData.name.trim(),
      description: deckFormData.description.trim()
    });
    
    setDeckFormData({ name: '', description: '' });
    setIsCreatingDeck(false);
    setIsLoading(false);
    
    toast({
      title: "Success",
      description: "Deck created successfully",
    });
  };

  const handleDeleteDeck = (deck: FlashcardDeck) => {
    setIsLoading(true);
    onDeleteDeck(deck.id);
    setIsLoading(false);
  };

  const handleEditDeckClick = (deckId: string) => {
    const deck = localDecks.find(d => d.id === deckId);
    if (deck) {
      setDeckFormData({
        name: deck.name,
        description: deck.description || ''
      });
      setIsCreatingDeck(true);
    }
  };

  const handleAddFlashcardSubmit = () => {
    if (!flashcardFormData.front.trim() || !flashcardFormData.back.trim()) {
      toast({
        title: "Error",
        description: "Please fill in both front and back of the flashcard",
        variant: "destructive"
      });
      return;
    }

    if (!selectedDeckId) {
      toast({
        title: "Error",
        description: "Please select a deck",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    
    setTimeout(() => {
      setFlashcardFormData({ front: '', back: '' });
      setIsAddingFlashcard(false);
      setSelectedDeckId(null);
      setIsLoading(false);
      
      toast({
        title: "Success",
        description: "Flashcard added successfully",
      });
      
      const summaries = localDecks.map(deck => ({
        deckId: deck.id,
        total: Math.floor(Math.random() * 20) + 1,
        dueToday: Math.floor(Math.random() * 5),
        reviewStatus: ['up-to-date', 'due-soon', 'overdue', 'not-started'][Math.floor(Math.random() * 4)] as 'up-to-date' | 'due-soon' | 'overdue' | 'not-started',
        lastStudied: Math.random() > 0.3 ? new Date(Date.now() - Math.random() * 1000 * 60 * 60 * 24 * 30).toISOString() : undefined
      }));
      setDeckSummaries(summaries);
    }, 500);
  };

  const getTotalDueCards = () => {
    return deckSummaries.reduce((total, summary) => total + summary.dueToday, 0);
  };

  const getTotalNotStartedCards = () => {
    return deckSummaries.reduce((total, summary) => total + summary.total, 0);
  };

  const getDeckSummary = (deckId: string) => {
    return deckSummaries.find(summary => summary.deckId === deckId);
  };

  const hasDueCards = getTotalDueCards() > 0;
  const hasNewCards = getTotalNotStartedCards() > 0;

  const getReviewStatusBadge = (status: string) => {
    switch (status) {
      case 'up-to-date':
        return 'default';
      case 'due-soon':
        return 'secondary';
      case 'overdue':
        return 'destructive';
      case 'not-started':
        return 'outline';
      default:
        return 'default';
    }
  };

  const formatReviewStatus = (status: string) => {
    switch (status) {
      case 'up-to-date':
        return 'Up to date';
      case 'due-soon':
        return 'Due soon';
      case 'overdue':
        return 'Overdue';
      case 'not-started':
        return 'Not started';
      default:
        return status;
    }
  };

  const syncData = () => {
    setIsLoading(true);
    
    setTimeout(() => {
      const summaries = localDecks.map(deck => ({
        deckId: deck.id,
        total: Math.floor(Math.random() * 20) + 1,
        dueToday: Math.floor(Math.random() * 5),
        reviewStatus: ['up-to-date', 'due-soon', 'overdue', 'not-started'][Math.floor(Math.random() * 4)] as 'up-to-date' | 'due-soon' | 'overdue' | 'not-started',
        lastStudied: Math.random() > 0.3 ? new Date(Date.now() - Math.random() * 1000 * 60 * 60 * 24 * 30).toISOString() : undefined
      }));
      setDeckSummaries(summaries);
      
      setIsLoading(false);
      toast({
        title: "Sync Complete",
        description: "Your flashcard data has been synchronized across all devices.",
      });
    }, 1000);
  };

  const DeckCard = ({ deck, summary }: { deck: FlashcardDeck; summary: DeckSummary }) => {
    return (
      <Card key={deck.id} className="overflow-hidden border-gray-200 dark:border-gray-700 shadow-md hover:shadow-lg transition-all w-full">
        <CardHeader className="pb-2 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-800/20">
          <div className="flex justify-between items-start">
            <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100 break-words">{deck.name}</CardTitle>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 h-8 w-8 flex-shrink-0 ml-2"
                  disabled={isLoading}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Deck</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete "{deck.name}"? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 border-gray-200 dark:border-gray-700">
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={() => handleDeleteDeck(deck)} 
                    className="bg-red-600 hover:bg-red-700 text-white dark:bg-red-600 dark:hover:bg-red-700"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
          <CardDescription className="line-clamp-2 text-gray-600 dark:text-gray-400">{deck.description || 'No description provided'}</CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className="flex flex-col items-center justify-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-xs text-blue-700 dark:text-blue-400 font-medium">Total Cards</p>
              <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{summary.total}</p>
            </div>
            <div className="flex flex-col items-center justify-center p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
              <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">Due Today</p>
              <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{summary.dueToday}</p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-1 mb-3">
            {summary.reviewStatus && (
              <Badge variant={getReviewStatusBadge(summary.reviewStatus)} className="text-xs">
                {formatReviewStatus(summary.reviewStatus)}
              </Badge>
            )}
            {summary.lastStudied && (
              <Badge variant="outline" className="text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                <Clock className="w-3 h-3 mr-1" />
                {new Date(summary.lastStudied).toLocaleDateString()}
              </Badge>
            )}
          </div>
        </CardContent>
        <CardFooter className="pt-0 flex gap-2 flex-wrap">
          <Button 
            variant="outline" 
            size="sm"
            className="flex-1 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300"
            onClick={() => handleEditDeckClick(deck.id)}
          >
            <Edit className="w-3.5 h-3.5 mr-1.5" /> Edit
          </Button>
          <Button 
            variant="default" 
            size="sm"
            className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-600 text-white"
            onClick={() => onStudyDeck(deck.id)}
          >
            <Play className="w-3.5 h-3.5 mr-1.5" /> Study
          </Button>
        </CardFooter>
      </Card>
    );
  };

  return (
    <div className="space-y-6 pb-32 w-full max-w-full overflow-x-hidden min-h-screen">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Your Flashcard Decks</h2>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <Button 
            onClick={() => setIsAddingFlashcard(true)} 
            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-600 shadow-md hover:shadow-lg transition-all"
            disabled={isLoading}
            size="sm"
          >
            <PlusCircle className="w-4 h-4 mr-1.5" /> Add Card
          </Button>
          <Button 
            onClick={() => setIsCreatingDeck(true)}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-600 shadow-md"
            disabled={isLoading}
            size="sm"
          >
            <Library className="w-4 h-4 mr-1.5" /> Create Deck
          </Button>
          <Button
            onClick={syncData}
            variant="outline"
            size="sm"
            className="ml-auto sm:ml-0"
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Syncing...' : 'Sync'}
          </Button>
        </div>
      </div>

      {/* Review Alert Messages */}
      <div className="space-y-4">
        {hasDueCards && (
          <div className="bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800 animate-fadeIn p-4 rounded-lg">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <div>
                <h3 className="text-lg font-medium text-amber-800 dark:text-amber-300">Cards Due for Review</h3>
                <p className="text-sm text-amber-700 dark:text-amber-400">You have {getTotalDueCards()} cards that need to be reviewed today.</p>
              </div>
            </div>
          </div>
        )}
        
        {hasNewCards && (
          <div className="bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800 animate-fadeIn p-4 rounded-lg">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <div>
                <h3 className="text-lg font-medium text-blue-800 dark:text-blue-300">New Cards Available</h3>
                <p className="text-sm text-blue-700 dark:text-blue-400">You have {getTotalNotStartedCards()} new cards to start learning.</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="border-b pb-1 mb-4">
        <h3 className="text-xl font-semibold flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          Your Flashcard Decks
        </h3>
      </div>

      {/* Decks Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
        {localDecks.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-10 px-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-dashed border-gray-300 dark:border-gray-700">
            <Library className="w-12 h-12 text-gray-400 dark:text-gray-500 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No flashcard decks yet</h3>
            <p className="text-gray-500 dark:text-gray-400 text-center mb-4">Create your first flashcard deck to start learning</p>
            <Button 
              onClick={() => setIsCreatingDeck(true)} 
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-600 text-white shadow-md"
            >
              <Plus className="w-4 h-4 mr-2" /> Create Deck
            </Button>
          </div>
        ) : (
          localDecks.map((deck) => {
            const summary = getDeckSummary(deck.id) || {
              deckId: deck.id,
              total: 0,
              dueToday: 0,
              reviewStatus: 'not-started' as 'not-started',
              lastStudied: undefined
            };
            
            return (
              <DeckCard key={deck.id} deck={deck} summary={summary} />
            );
          })
        )}
      </div>
      
      {/* Create New Deck Card */}
      {localDecks.length > 0 && (
        <div className="mt-4">
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
        </div>
      )}

      {localDecks.length === 0 && (
        <div className="text-center p-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-md mt-4">
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-full inline-block mb-4">
            <BookOpen className="w-12 h-12 text-blue-500 dark:text-blue-400" />
          </div>
          <h3 className="text-xl font-medium mb-2">No flashcard decks yet</h3>
          <p className="text-gray-500 dark:text-gray-400 text-center mb-4">Create your first deck to start learning</p>
          <Button 
            onClick={() => setIsCreatingDeck(true)}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-600 shadow-md"
            disabled={isLoading}
          >
            <Plus className="w-4 h-4 mr-2" /> Create Your First Deck
          </Button>
        </div>
      )}

      {/* Create Deck Dialog */}
      <Dialog open={isCreatingDeck} onOpenChange={setIsCreatingDeck}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Deck</DialogTitle>
            <DialogDescription>
              Create a new flashcard deck to organize your learning materials.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Deck Name
              </label>
              <Input
                id="name"
                placeholder="Enter deck name"
                value={deckFormData.name}
                onChange={(e) => setDeckFormData({ ...deckFormData, name: e.target.value })}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Description (optional)
              </label>
              <Textarea
                id="description"
                placeholder="Enter a description for your deck"
                value={deckFormData.description}
                onChange={(e) => setDeckFormData({ ...deckFormData, description: e.target.value })}
                className="w-full min-h-[100px]"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setDeckFormData({ name: '', description: '' });
                setIsCreatingDeck(false);
              }}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateDeckSubmit}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-600 shadow-md"
              disabled={isLoading}
            >
              {isLoading ? 'Creating...' : 'Create Deck'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Flashcard Dialog */}
      <Dialog open={isAddingFlashcard} onOpenChange={setIsAddingFlashcard}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Flashcard</DialogTitle>
            <DialogDescription>
              Create a new flashcard to add to your deck.
            </DialogDescription>
          </DialogHeader>
          
          {localDecks.length > 0 ? (
            <div className="space-y-4">
              {!selectedDeckId && (
                <div>
                  <label className="block text-sm font-medium mb-2">Select Deck</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {localDecks.map(deck => (
                      <Button 
                        key={deck.id}
                        variant="outline"
                        className={`justify-start px-3 py-6 h-auto text-left ${selectedDeckId === deck.id ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700'}`}
                        onClick={() => setSelectedDeckId(deck.id)}
                        disabled={isLoading}
                      >
                        <div className="flex flex-col items-start">
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
                        className="h-6 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-900/20" 
                        onClick={() => setSelectedDeckId(null)}
                        disabled={isLoading}
                      >
                        Change Deck
                      </Button>
                    </div>
                    <Textarea
                      id="front"
                      placeholder="Enter the question or concept"
                      className="min-h-[100px] bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
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
                      className="min-h-[100px] bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
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
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-full inline-block mb-3">
                <Library className="w-6 h-6 text-blue-500 dark:text-blue-400" />
              </div>
              <p className="text-gray-600 dark:text-gray-400 mb-4">You need to create a deck first to add flashcards</p>
              <Button 
                onClick={() => {
                  setIsAddingFlashcard(false);
                  setIsCreatingDeck(true);
                }}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-600 shadow-md"
                disabled={isLoading}
              >
                Create a Deck First
              </Button>
            </div>
          )}
          
          <div className="flex justify-end space-x-2 mt-4">
            <Button 
              variant="outline" 
              onClick={() => {
                setIsAddingFlashcard(false);
                setSelectedDeckId(null);
                setFlashcardFormData({ front: '', back: '' });
              }}
              className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700"
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button 
              disabled={!selectedDeckId || isLoading}
              onClick={handleAddFlashcardSubmit}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-600 text-white shadow-md"
            >
              {isLoading ? 'Adding...' : 'Add Flashcard'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};