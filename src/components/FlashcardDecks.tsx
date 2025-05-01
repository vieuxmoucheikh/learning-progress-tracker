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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import { 
  Check, 
  CheckCircle, 
  Clock, 
  CreditCard, 
  Edit, 
  Library, 
  MoreHorizontal, 
  Play, 
  Plus, 
  PlusCircle, 
  Star, 
  Trash, 
  CalendarDays, 
  Globe, 
  BookOpen,
  Trash2,
  Tag,
  Info,
  BarChart,
  Layers
} from "lucide-react";
import { FlashcardDeck } from '@/types';
import { supabase } from '@/lib/supabase';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import './flashcard.css';
import './flashcard-enhanced.css';
import { formatDate } from '../lib/date';

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
  due: number;
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
  // State for editing deck is handled through selectedDeckId
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [cardFormData, setCardFormData] = useState({ front: '', back: '', tags: '' });
  const [selectedDeckForCard, setSelectedDeckForCard] = useState<string | null>(null);
  const [showCardTips, setShowCardTips] = useState(false);
  
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
              due: dueCards.length, // Add the due property with the same value as dueToday
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
      due: 0,
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

  const handleEditDeck = async (deckId: string) => {
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
    
    // Determine status badge
    let statusBadge = null;
    let nextReviewDate = null;
    
    if (summary.nextDue) {
      nextReviewDate = formatDate(summary.nextDue);
    }
    
    if (summary.reviewStatus === 'overdue') {
      statusBadge = (
        <Badge className="bg-red-500 text-white border-0 px-3 py-1 text-xs font-medium">
          OVERDUE
        </Badge>
      );
    } else if (summary.reviewStatus === 'due-soon') {
      statusBadge = (
        <Badge className="bg-yellow-400 text-gray-900 border-0 px-3 py-1 text-xs font-medium">
          DUE SOON
        </Badge>
      );
    } else if (summary.reviewStatus === 'up-to-date') {
      statusBadge = (
        <Badge className="bg-green-500 text-white border-0 px-3 py-1 text-xs font-medium">
          UP TO DATE
        </Badge>
      );
    }
    
    return (
      <Card key={deck.id} className="flashcard-deck-card h-full flex flex-col overflow-hidden hover:shadow-lg transition-all">
        <CardHeader className="pb-2 flex flex-row justify-between items-start">
          <div className="flex flex-col gap-1">
            {statusBadge}
          </div>
          <div className="flex items-center gap-2">
            {deck.is_favorite && (
              <Star className="h-5 w-5 fill-amber-400 stroke-amber-500" />
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
                  <span className="sr-only">Open menu</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleEditDeck(deck.id)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDeleteDeck(deck)}>
                  <Trash className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        
        <CardContent className="flex-grow px-4 pt-0 pb-3">
          {nextReviewDate && (
            <div className="flex items-center gap-1.5 mb-2">
              <CalendarDays className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {nextReviewDate}
              </span>
            </div>
          )}
          
          <h3 className="font-semibold text-xl mb-1 text-gray-900 dark:text-gray-100">{deck.name}</h3>
          
          {deck.description && (
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 line-clamp-2">
              {deck.description}
            </p>
          )}
          
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
              <span className="text-lg font-semibold text-blue-700 dark:text-blue-300">{summary.total}</span>
              <div className="flex items-center gap-1">
                <CreditCard className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                <span className="text-xs text-blue-600 dark:text-blue-400">Total Cards</span>
              </div>
            </div>
            
            <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800">
              <span className="text-lg font-semibold text-amber-700 dark:text-amber-300">{summary.due}</span>
              <div className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                <span className="text-xs text-amber-600 dark:text-amber-400">Cards Due</span>
              </div>
            </div>
          </div>
          
          {summary.total > 0 && (
            <div className="mt-auto">
              <div className="flex justify-between text-xs mb-1.5">
                <span className="font-medium text-gray-700 dark:text-gray-300">Mastery Progress</span>
                <span className="font-medium text-emerald-600 dark:text-emerald-400">{masteredPercentage}%</span>
              </div>
              <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden dark:bg-gray-800 shadow-inner">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-400 to-green-500 rounded-full shadow-sm" 
                  style={{ width: `${masteredPercentage}%` }}
                ></div>
              </div>
            </div>
          )}
        </CardContent>
        
        <CardFooter className="pt-0 pb-4 px-4">
          <div className="flex flex-col w-full space-y-2">
            <div className="grid grid-cols-2 gap-2 mb-2">
              <Button 
                variant="outline" 
                className="flex items-center justify-center gap-1.5 text-sm bg-yellow-400 hover:bg-yellow-500 text-gray-900 border-0 shadow-sm hover:shadow transition-all"
                onClick={() => onSelectDeck && onSelectDeck(deck.id)}
              >
                <Library className="h-4 w-4" />
                Manage Cards
              </Button>
              
              <Button 
                variant="outline" 
                className={`flex items-center justify-center gap-1.5 text-sm bg-blue-500 hover:bg-blue-600 text-white border-0 shadow-sm hover:shadow transition-all ${summary.total === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => summary.total > 0 ? onStudyDeck(deck.id) : null}
                disabled={summary.total === 0}
              >
                <Play className="h-4 w-4" />
                Study
              </Button>
            </div>
            
            <Button 
              variant="default" 
              size="sm"
              className="w-full flex items-center justify-center gap-1.5 text-sm bg-blue-500 hover:bg-blue-600 text-white shadow-sm hover:shadow transition-all"
              onClick={() => {
                // Open the add card dialog directly
                setSelectedDeckForCard(deck.id);
                setCardFormData({ front: '', back: '', tags: '' });
                setIsAddingCard(true);
              }}
            >
              <Plus className="h-5 w-5" />
              Add New Card
            </Button>
          </div>
        </CardFooter>
      </Card>
    );
  };
  // Removed unused getTotalDueCards function
  
  const getTotalNonMasteredCards = () => {
    return deckSummariesState.reduce((total, summary) => total + (summary.total - summary.masteredCount), 0);
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

  const hasDueCards = getTotalNonMasteredCards() > 0;
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

  // Removed syncData function as it's no longer needed

  return (
    <div className="w-full max-w-full space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 flashcard-deck-header">
        <h2 className="text-2xl font-bold flex items-center gap-2 text-gray-900 dark:text-gray-50">
          <Library className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          Flashcards
        </h2>
        <div className="flex gap-2 flashcard-deck-actions">
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

      {/* Add Card Dialog */}
      <Dialog open={isAddingCard} onOpenChange={(open) => {
        if (!open) {
          setCardFormData({ front: '', back: '', tags: '' });
          setSelectedDeckForCard(null);
          setIsAddingCard(false);
        }
      }}>
        <DialogContent className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 max-w-[90vw] md:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Flashcard</DialogTitle>
            <DialogDescription className="flex items-center justify-between">
              <span>Add a new flashcard to your deck. Front side is the question, back side is the answer.</span>
              <Button 
                variant="outline" 
                size="sm" 
                className="flex items-center gap-1" 
                onClick={() => setShowCardTips(!showCardTips)}
              >
                <Info className="h-4 w-4" />
                Tips
              </Button>
            </DialogDescription>
          </DialogHeader>
          
          {showCardTips && (
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md mb-4 text-sm">
              <h4 className="font-medium mb-1 text-blue-800 dark:text-blue-300">Tips for effective flashcards:</h4>
              <ul className="list-disc pl-5 space-y-1 text-blue-700 dark:text-blue-400">
                <li>Keep questions clear and specific</li>
                <li>Use formatting to highlight important information</li>
                <li>Add images or code snippets when relevant</li>
                <li>Break complex topics into multiple cards</li>
                <li>Add tags to organize your cards by topic</li>
              </ul>
            </div>
          )}
          
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Front Side (Question)</h4>
              <div className="border border-gray-200 dark:border-gray-700 rounded-md">
                <ReactQuill
                  theme="snow"
                  value={cardFormData.front}
                  onChange={(value) => setCardFormData({ ...cardFormData, front: value })}
                  placeholder="Enter the question or prompt"
                  modules={{
                    toolbar: [
                      [{ 'header': [1, 2, 3, false] }],
                      ['bold', 'italic', 'underline', 'strike'],
                      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                      ['blockquote', 'code-block'],
                      ['link', 'image'],
                      ['clean']
                    ],
                  }}
                />
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Back Side (Answer)</h4>
              <div className="border border-gray-200 dark:border-gray-700 rounded-md">
                <ReactQuill
                  theme="snow"
                  value={cardFormData.back}
                  onChange={(value) => setCardFormData({ ...cardFormData, back: value })}
                  placeholder="Enter the answer or explanation"
                  modules={{
                    toolbar: [
                      [{ 'header': [1, 2, 3, false] }],
                      ['bold', 'italic', 'underline', 'strike'],
                      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                      ['blockquote', 'code-block'],
                      ['link', 'image'],
                      ['clean']
                    ],
                  }}
                />
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-medium flex items-center gap-1">
                <Tag className="h-4 w-4" /> Tags (optional)
              </h4>
              <Input
                value={cardFormData.tags}
                onChange={(e) => setCardFormData({ ...cardFormData, tags: e.target.value })}
                placeholder="Enter tags separated by commas (e.g., math, algebra, equations)"
                className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setCardFormData({ front: '', back: '', tags: '' });
                setSelectedDeckForCard(null);
                setIsAddingCard(false);
              }}
              className="border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              Cancel
            </Button>
            <Button 
              onClick={async () => {
                if (!cardFormData.front.trim() || !cardFormData.back.trim() || !selectedDeckForCard) {
                  toast({
                    title: "Error",
                    description: "Please fill in both front and back sides of the flashcard",
                    variant: "destructive"
                  });
                  return;
                }
                
                setIsLoading(true);
                
                try {
                  // Process tags if provided
                  const tags = cardFormData.tags
                    ? cardFormData.tags.split(',').map(tag => tag.trim()).filter(tag => tag)
                    : [];
                  
                  // Create the flashcard with tags
                  const { data, error } = await supabase
                    .from('flashcards')
                    .insert([
                      {
                        deck_id: selectedDeckForCard,
                        front_content: cardFormData.front.trim(),
                        back_content: cardFormData.back.trim(),
                        tags: tags.length > 0 ? tags : null,
                        created_at: new Date().toISOString()
                      }
                    ])
                    .select();
                  
                  if (error) throw error;
                  
                  // Reset form and close dialog
                  setCardFormData({ front: '', back: '', tags: '' });
                  setSelectedDeckForCard(null);
                  setIsAddingCard(false);
                  
                  // Refresh deck metrics to update card counts
                  if (onRefreshMetrics) {
                    onRefreshMetrics();
                  }
                  
                  toast({
                    title: "Success",
                    description: "Flashcard created successfully",
                  });
                } catch (error) {
                  console.error('Error creating flashcard:', error);
                  toast({
                    title: "Error",
                    description: "Failed to create flashcard",
                    variant: "destructive"
                  });
                } finally {
                  setIsLoading(false);
                }
              }} 
              disabled={isLoading || !cardFormData.front.trim() || !cardFormData.back.trim()}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-sm hover:shadow-md transition-all"
            >
              {isLoading ? 'Creating...' : 'Create Flashcard'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review Alert Messages */}
      <div className="space-y-4 mb-6">
        {hasDueCards && (
          <div className="flashcard-banner bg-gradient-to-r from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 border border-amber-200 dark:border-amber-800/30 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flashcard-banner-icon-container bg-amber-200 dark:bg-amber-700/30">
                <Clock className="h-5 w-5 text-amber-700 dark:text-amber-400" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-amber-800 dark:text-amber-300">Cards Due for Review</h3>
                {getTotalNonMasteredCards() === 1 ? (
                  <p className="text-sm text-amber-700 dark:text-amber-400">You have 1 card that needs to be reviewed.</p>
                ) : (
                  <p className="text-sm text-amber-700 dark:text-amber-400">You have {getTotalNonMasteredCards()} cards that need to be reviewed.</p>
                )}
              </div>
            </div>
          </div>
        )}
        
        {hasNewCards && (
          <div className="flashcard-banner bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border border-blue-200 dark:border-blue-800/30 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flashcard-banner-icon-container bg-blue-200 dark:bg-blue-700/30">
                <Star className="h-5 w-5 text-blue-700 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-blue-800 dark:text-blue-300">New Cards to Learn</h3>
                {getTotalNotStartedCards() === 1 ? (
                  <p className="text-sm text-blue-700 dark:text-blue-400">You have 1 new card that hasn't been studied yet.</p>
                ) : (
                  <p className="text-sm text-blue-700 dark:text-blue-400">You have {getTotalNotStartedCards()} new cards that haven't been studied yet.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700 mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
          <h3 className="text-xl font-semibold flex items-center gap-2 text-gray-900 dark:text-gray-50">
            <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            Your Flashcard Decks
          </h3>
          
          <div className="flex flex-wrap gap-3">
            <div className="flashcard-stat-item">
              <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{localDecks.length} {localDecks.length === 1 ? 'Deck' : 'Decks'}</span>
            </div>
            
            <div className="flashcard-stat-item">
              <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {deckSummariesState.reduce((sum, deck) => sum + deck.masteredCount, 0)} Mastered
              </span>
            </div>
            
            <div className="flashcard-stat-item">
              <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {deckSummariesState.reduce((sum, deck) => sum + deck.total, 0)} Total
              </span>
            </div>
          </div>
        </div>
        
        <p className="text-gray-600 dark:text-gray-400 text-sm">
          Create and manage your flashcard decks. Click on a deck to view its cards or start a study session.
        </p>
      </div>

      {/* Deck Grid */}
      <div className="flashcard-deck-grid">
        {localDecks.map(deck => renderDeckCard(deck))}
      </div>
    </div>
  );
};

export default FlashcardDecks;