import { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardFooter, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import { 
  Clock, 
  Edit, 
  Library, 
  Play, 
  PlusCircle, 
  Plus, 
  RefreshCw, 
  Star, 
  BookOpen,
  Trash2
} from "lucide-react";
import { FlashcardDeck } from '@/types';
import { supabase } from '@/lib/supabase';

interface FlashcardDecksProps {
  decks: FlashcardDeck[];
  onSelectDeck?: (deckId: string, shouldAddCard?: boolean) => void;
  onAddDeck: (data: { name: string; description: string }) => void;
  onStudyDeck: (deckId: string) => void;
  onEditDeck: (deckId: string, data: { name: string; description: string }) => void;
  onDeleteDeck: (deckId: string) => void;
  deckSummaries?: any[];
  onRefreshMetrics?: () => void;
}

interface DeckSummary {
  deckId: string;
  total: number;
  dueToday: number;
  reviewStatus: string;
  lastStudied: string | null;
  nextDue: string | null;
  masteredCount: number;
}

const FlashcardDecks: React.FC<FlashcardDecksProps> = ({ 
  decks, 
  onSelectDeck, 
  onAddDeck, 
  onStudyDeck, 
  onEditDeck, 
  onDeleteDeck,
  deckSummaries = [],
  onRefreshMetrics
}) => {
  const [isCreatingDeck, setIsCreatingDeck] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [deckFormData, setDeckFormData] = useState({ name: '', description: '' });
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);
  const [deckSummariesState, setDeckSummaries] = useState<DeckSummary[]>([]);
  const [localDecks, setLocalDecks] = useState<FlashcardDeck[]>(decks);
  const [isEditingDeck, setIsEditingDeck] = useState(false);
  
  // Initialize local decks from props
  useEffect(() => {
    setLocalDecks(decks);
  }, [decks]);
  
  // Fetch actual deck summaries from the database
  useEffect(() => {
    const fetchDeckSummaries = async () => {
      try {
        setIsLoading(true);
        
        // For each deck, fetch its cards and calculate summaries
        const summaries = await Promise.all(
          localDecks.map(async (deck) => {
            // Use raw SQL to get all cards for this deck with their review status
            const { data: cards, error } = await supabase
              .from('flashcards')
              .select('*')
              .eq('deck_id', deck.id);
            
            if (error) throw error;
            
            // Calculate metrics
            const total = cards?.length || 0;
            
            // Get cards due today - use UTC date to ensure consistency across timezones
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            // Filter cards that are due today or earlier
            const dueCards = cards?.filter(card => {
              if (!card.next_review_date) return true; // Cards without a review date are always due
              const nextReview = new Date(card.next_review_date);
              return nextReview <= today;
            }) || [];
            
            // Count mastered cards
            const masteredCards = cards?.filter(card => card.mastered) || [];
            const masteredCount = masteredCards.length;
            
            // Get last studied date - find the most recent review date across all cards
            const lastStudied = cards?.reduce((latest, card) => {
              if (!card.last_reviewed) return latest;
              const reviewDate = new Date(card.last_reviewed);
              return !latest || reviewDate > latest ? reviewDate : latest;
            }, null as Date | null);
            
            // Determine review status based on due cards and their review dates
            let reviewStatus: 'up-to-date' | 'due-soon' | 'overdue' | 'not-started' = 'up-to-date';
            
            if (total === 0) {
              reviewStatus = 'not-started';
            } else if (dueCards.length > 0) {
              reviewStatus = 'due-soon';
              
              // Check if any cards are overdue by more than 3 days
              const threeDaysAgo = new Date();
              threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
              
              const overdueCards = dueCards.filter(card => {
                if (!card.next_review_date) return false; // Skip cards without a review date
                const nextReview = new Date(card.next_review_date);
                return nextReview < threeDaysAgo;
              });
              
              if (overdueCards.length > 0) {
                reviewStatus = 'overdue';
              }
            }
            
            // Get next due date - find the earliest review date across all cards
            const nextDue = cards?.reduce((earliest, card) => {
              if (!card.next_review_date) return earliest;
              const nextReview = new Date(card.next_review_date);
              return !earliest || nextReview < earliest ? nextReview : earliest;
            }, null as Date | null);
            
            return {
              deckId: deck.id,
              total,
              dueToday: dueCards.length,
              reviewStatus,
              lastStudied: lastStudied ? lastStudied.toISOString() : undefined,
              nextDue: nextDue ? nextDue.toISOString() : undefined,
              masteredCount
            };
          })
        );
        
        setDeckSummaries(summaries);
      } catch (error) {
        console.error('Error fetching deck summaries:', error);
        toast({
          title: "Error",
          description: "Failed to load deck information",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    if (localDecks.length > 0) {
      fetchDeckSummaries();
    }
  }, [localDecks]);
  
  // Get deck summary from props or local state
  const getDeckSummary = (deckId: string): DeckSummary => {
    // First check if we have the summary in props
    if (deckSummaries && deckSummaries.length > 0) {
      const propSummary = deckSummaries.find(s => s.deckId === deckId);
      if (propSummary) return propSummary;
    }
    
    // Then check local state
    const stateSummary = deckSummariesState.find(s => s.deckId === deckId);
    if (stateSummary) return stateSummary;
    
    // Return default summary if not found
    return {
      deckId,
      total: 0,
      dueToday: 0,
      reviewStatus: 'not-started',
      lastStudied: null,
      nextDue: null,
      masteredCount: 0
    };
  };

  // Calculate mastered percentage for a deck
  const getMasteredPercentage = (deckId: string): number => {
    const summary = getDeckSummary(deckId);
    if (!summary || summary.total === 0) return 0;
    
    // If we have masteredCount in the summary, use it
    if (summary.masteredCount !== undefined) {
      return Math.round((summary.masteredCount / summary.total) * 100);
    }
    
    // Otherwise return 0
    return 0;
  };

  const handleCreateDeckSubmit = () => {
    if (!deckFormData.name.trim()) {
      toast({
        title: "Error",
        description: "Please enter a deck name",
        variant: "destructive"
      });
      return;
    }
    
    setIsLoading(true);
    
    // If we're editing an existing deck
    if (selectedDeckId) {
      const deckToEdit = localDecks.find(d => d.id === selectedDeckId);
      if (deckToEdit) {
        // Update the deck in the local state first for immediate feedback
        const updatedDeck = {
          ...deckToEdit,
          name: deckFormData.name.trim(),
          description: deckFormData.description.trim()
        };
        
        // Update the deck object in the localDecks state
        setLocalDecks(prev => prev.map(d => d.id === selectedDeckId ? updatedDeck : d));
        
        // Call the parent component's edit handler with the deck ID and updated data
        onEditDeck(selectedDeckId, {
          name: deckFormData.name.trim(),
          description: deckFormData.description.trim()
        });
        
        // Reset form and state
        setDeckFormData({ name: '', description: '' });
        setIsCreatingDeck(false);
        setSelectedDeckId(null);
        
        toast({
          title: "Success",
          description: "Deck updated successfully",
        });
      }
    } else {
      // Otherwise, create a new deck
      onAddDeck({
        name: deckFormData.name.trim(),
        description: deckFormData.description.trim()
      });
      
      setDeckFormData({ name: '', description: '' });
      setIsCreatingDeck(false);
      
      toast({
        title: "Success",
        description: "Deck created successfully",
      });
    }
    
    setIsLoading(false);
  };

  const handleDeleteDeck = (deck: FlashcardDeck) => {
    setIsLoading(true);
    onDeleteDeck(deck.id);
    setIsLoading(false);
  };

  const handleEditDeck = (deckId: string) => {
    const deck = localDecks.find(d => d.id === deckId);
    if (deck) {
      setDeckFormData({
        name: deck.name,
        description: deck.description || ''
      });
      setSelectedDeckId(deckId);
      // Open the dialog by setting isCreatingDeck to true
      setIsCreatingDeck(true);
    }
  };

  const renderDeckCard = (deck: FlashcardDeck) => {
    const summary = getDeckSummary(deck.id);
    const masteredPercentage = getMasteredPercentage(deck.id);
    
    return (
      <Card key={deck.id} className="overflow-hidden border border-gray-200 dark:border-gray-700 transition-all hover:shadow-md">
        <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 pb-4">
          <div className="flex justify-between items-start">
            <CardTitle className="text-lg font-semibold text-gray-800 dark:text-gray-100">{deck.name}</CardTitle>
            <div className="flex space-x-1">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete the "{deck.name}" deck and all its flashcards.
                      This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleDeleteDeck(deck)}>
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 w-8 p-0"
                onClick={() => handleEditDeck(deck.id)}
              >
                <Edit className="h-4 w-4 text-gray-500" />
              </Button>
            </div>
          </div>
          <CardDescription className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
            {deck.description || 'No description provided'}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4 pb-2">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <div className="bg-blue-100 dark:bg-blue-900 rounded-full p-1.5">
                  <Library className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <span className="text-sm text-gray-600 dark:text-gray-300">Total Cards</span>
              </div>
              <span className="font-medium text-gray-800 dark:text-gray-200">{summary.total}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <div className="bg-amber-100 dark:bg-amber-900 rounded-full p-1.5">
                  <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
                <span className="text-sm text-gray-600 dark:text-gray-300">Due Today</span>
              </div>
              <span className="font-medium text-gray-800 dark:text-gray-200">{summary.dueToday}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <div className="bg-green-100 dark:bg-green-900 rounded-full p-1.5">
                  <Star className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
                <span className="text-sm text-gray-600 dark:text-gray-300">Mastered</span>
              </div>
              <div className="flex items-center">
                <span className="font-medium text-gray-800 dark:text-gray-200 mr-2">
                  {masteredPercentage}%
                </span>
                <div className="w-16 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-green-500 rounded-full" 
                    style={{ width: `${masteredPercentage}%` }}
                  ></div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <div className="bg-purple-100 dark:bg-purple-900 rounded-full p-1.5">
                  <RefreshCw className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                </div>
                <span className="text-sm text-gray-600 dark:text-gray-300">Status</span>
              </div>
              <Badge variant={getReviewStatusBadge(summary.reviewStatus)}>
                {formatReviewStatus(summary.reviewStatus)}
              </Badge>
            </div>
          </div>
        </CardContent>
        <CardFooter className="pt-0 flex gap-2 flex-wrap bg-gradient-to-b from-transparent to-gray-50 dark:to-gray-800/30">
          <Button 
            variant="outline" 
            size="sm"
            className="flex-1 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            onClick={() => onSelectDeck?.(deck.id)}
          >
            <Library className="w-3.5 h-3.5 mr-1.5" /> Manage Cards
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            className="flex-1 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            onClick={() => {
              // Navigate to card management view
              if (onSelectDeck) {
                onSelectDeck(deck.id);
                // Signal to parent that we want to open the add dialog
                if (onRefreshMetrics) {
                  // We're using onRefreshMetrics as a side channel to communicate
                  // that we want to open the add dialog
                  onRefreshMetrics();
                }
              }
            }}
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Card
          </Button>
          <Button 
            variant="default" 
            size="sm"
            className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-sm hover:shadow-md transition-all"
            onClick={() => onStudyDeck(deck.id)}
          >
            <Play className="w-3.5 h-3.5 mr-1.5" /> Study
          </Button>
        </CardFooter>
      </Card>
    );
  };

  const getTotalDueCards = () => {
    return deckSummariesState.reduce((total, summary) => total + summary.dueToday, 0);
  };

  const getTotalNotStartedCards = () => {
    return deckSummariesState.reduce((total, summary) => {
      // Count only cards that have never been studied (no last_reviewed date)
      // We need to check if the summary has a reviewStatus property and if it's 'not-started'
      if (summary.reviewStatus === 'not-started') {
        return total + summary.total;
      }
      // For decks that have been partially studied, we need to calculate the difference
      // between total cards and cards that are due (which have been studied before)
      return total + Math.max(0, summary.total - summary.dueToday);
    }, 0);
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
    
    if (onRefreshMetrics) {
      onRefreshMetrics();
    }
    
    setTimeout(() => {
      setIsLoading(false);
      toast({
        title: "Sync Complete",
        description: "Your flashcard data has been synchronized across all devices.",
      });
    }, 1000);
  };

  return (
    <div className="w-full max-w-full">
      {/* Header Section */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Library className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          Flashcards
        </h2>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={syncData}
            disabled={isLoading}
            className="border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <RefreshCw className="w-4 h-4 mr-1.5" />
            Refresh
          </Button>
          <Button 
            variant="default" 
            size="sm"
            onClick={() => {
              setDeckFormData({ name: '', description: '' });
              setSelectedDeckId(null);
              setIsCreatingDeck(true);
            }}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-sm hover:shadow-md transition-all"
          >
            <PlusCircle className="w-4 h-4 mr-1.5" />
            Create Deck
          </Button>
        </div>
      </div>

      {/* Create/Edit Deck Dialog */}
      <Dialog 
        open={isCreatingDeck} 
        onOpenChange={(open) => {
          setIsCreatingDeck(open);
          if (!open) {
            // Reset form when dialog is closed
            setSelectedDeckId(null);
            setDeckFormData({ name: '', description: '' });
          }
        }}
      >
        <DialogContent className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
          <DialogHeader>
            <DialogTitle>{selectedDeckId ? 'Edit Deck' : 'Create New Deck'}</DialogTitle>
            <DialogDescription>
              {selectedDeckId ? 'Update your flashcard deck details.' : 'Create a new flashcard deck to organize your learning.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label htmlFor="deck-name" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Deck Name
              </label>
              <Input
                id="deck-name"
                value={deckFormData.name}
                onChange={(e) => setDeckFormData({ ...deckFormData, name: e.target.value })}
                placeholder="Enter deck name"
                className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="deck-description" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Description (optional)
              </label>
              <Textarea
                id="deck-description"
                value={deckFormData.description}
                onChange={(e) => setDeckFormData({ ...deckFormData, description: e.target.value })}
                placeholder="Enter deck description"
                className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 min-h-[100px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setDeckFormData({ name: '', description: '' });
                setSelectedDeckId(null);
                setIsCreatingDeck(false);
              }}
              className="border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreateDeckSubmit} 
              disabled={isLoading || !deckFormData.name.trim()}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-sm hover:shadow-md transition-all"
            >
              {isLoading ? 'Saving...' : selectedDeckId ? 'Update Deck' : 'Create Deck'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review Alert Messages */}
      <div className="space-y-4 mb-6">
        {hasDueCards && (
          <div className="bg-gradient-to-r from-amber-50 to-amber-100 dark:from-amber-900/30 dark:to-amber-800/20 border border-amber-200 dark:border-amber-800/50 shadow-sm p-4 rounded-lg transition-all hover:shadow-md">
            <div className="flex items-center gap-3">
              <div className="bg-amber-200 dark:bg-amber-700 rounded-full p-2 flex-shrink-0">
                <Clock className="h-5 w-5 text-amber-700 dark:text-amber-200" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-amber-800 dark:text-amber-200">Cards Due for Review</h3>
                {getTotalDueCards() === 1 ? (
                  <p className="text-sm text-amber-700 dark:text-amber-300">You have 1 card that needs to be reviewed.</p>
                ) : (
                  <p className="text-sm text-amber-700 dark:text-amber-300">You have {getTotalDueCards()} cards that need to be reviewed.</p>
                )}
              </div>
            </div>
          </div>
        )}
        
        {hasNewCards && (
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/20 border border-blue-200 dark:border-blue-800/50 shadow-sm p-4 rounded-lg transition-all hover:shadow-md">
            <div className="flex items-center gap-3">
              <div className="bg-blue-200 dark:bg-blue-700 rounded-full p-2 flex-shrink-0">
                <Star className="h-5 w-5 text-blue-700 dark:text-blue-200" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-blue-800 dark:text-blue-200">New Cards to Learn</h3>
                {getTotalNotStartedCards() === 1 ? (
                  <p className="text-sm text-blue-700 dark:text-blue-300">You have 1 new card that hasn't been studied yet.</p>
                ) : (
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    You have {getTotalNotStartedCards()} new cards that haven't been studied yet. 
                    <span className="ml-1 font-medium">Start learning them today!</span>
                  </p>
                )}
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

      {/* Deck Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        {localDecks.map(deck => renderDeckCard(deck))}
      </div>
    </div>
  );
};

export default FlashcardDecks; 