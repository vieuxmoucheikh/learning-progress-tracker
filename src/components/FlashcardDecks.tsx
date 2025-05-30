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
  DialogTitle,
  DialogTrigger
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
  BookOpen,
  Trash2,
  Tag,
  Info,
  Layers,
  ListChecks
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
  onAddDeck: (data: { name: string; description: string; category: string }) => void;
  onStudyDeck: (deckId: string) => void;
  onEditDeck: (deckId: string, data: { name: string; description: string; category?: string }) => void;
  onDeleteDeck: (deckId: string) => void;
  onManageCards?: (deckId: string) => void;
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

interface DeckFormData {
  name: string;
  description: string;
  category: string;
}

const FlashcardDecks: React.FC<FlashcardDecksProps> = ({ 
  decks, 
  onSelectDeck, 
  onAddDeck, 
  onStudyDeck, 
  onEditDeck, 
  onDeleteDeck,
  onManageCards,
  deckSummaries = [],
  onRefreshMetrics
}) => {
  const [isCreatingDeck, setIsCreatingDeck] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [deckFormData, setDeckFormData] = useState<DeckFormData>({ name: '', description: '', category: '' });
  const [existingCategories, setExistingCategories] = useState<string[]>([]);
  const [customCategory, setCustomCategory] = useState('');
  const [showCustomCategory, setShowCustomCategory] = useState(false);
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

  // Fetch existing categories from learning items
  const fetchCategories = async () => {
    try {
      const { data: items, error } = await supabase
        .from('learning_items')
        .select('category');
      
      if (error) throw error;
      
      const categories = new Set(items.map(item => item.category));
      setExistingCategories(Array.from(categories).filter(Boolean).sort());
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };
  
  // Fetch categories when creating a deck
  useEffect(() => {
    if (isCreatingDeck) {
      fetchCategories();
    }
  }, [isCreatingDeck]);
  
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
          description: deckFormData.description.trim(),
          category: deckFormData.category.trim()
        };
        
        // In the simplified UI, the name and category are the same
        const deckName = showCustomCategory ? customCategory.trim() : deckFormData.name.trim();
        
        // Create the updated deck object
        const updatedDeckWithName = {
          ...deckToEdit,
          name: deckName,
          description: deckFormData.description.trim(),
          category: deckName // Category is the same as the name
        };
        
        // Update the deck object in the localDecks state
        setLocalDecks(prev => prev.map(d => d.id === selectedDeckId ? updatedDeckWithName : d));
        
        // Call the parent component's edit handler with the deck ID and updated data
        onEditDeck(selectedDeckId, {
          name: deckName,
          description: deckFormData.description.trim(),
          category: deckName // Category is the same as the name
        });
        
        // Reset form and state
        setDeckFormData({ name: '', description: '', category: '' });
        setIsCreatingDeck(false);
        setSelectedDeckId(null);
        
        toast({
          title: "Success",
          description: "Deck updated successfully",
        });
      }
    } else {
      // Otherwise, create a new deck
      // In the simplified UI, the name and category are the same
      const deckName = showCustomCategory ? customCategory.trim() : deckFormData.name.trim();
      
      onAddDeck({
        name: deckName,
        description: deckFormData.description.trim(),
        category: deckName // Category is the same as the name
      });
      
      setDeckFormData({ name: '', description: '', category: '' });
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
      // In our simplified UI, we use the deck name as the category
      const deckName = deck.name;
      
      setDeckFormData({
        name: deckName,
        description: deck.description || '',
        category: deckName // Category is the same as the name
      });
      
      // If the deck name is not in our list of categories, show custom input
      if (!existingCategories.includes(deckName)) {
        setCustomCategory(deckName);
        setShowCustomCategory(true);
      } else {
        setCustomCategory('');
        setShowCustomCategory(false);
      }
      
      setSelectedDeckId(deckId);
      // Open the dialog by setting isCreatingDeck to true
      setIsCreatingDeck(true);
    }
  };

  const renderDeckCard = (deck: FlashcardDeck) => {
    const summary = getDeckSummary(deck.id);
    // Calculate mastery percentage for display
    const masteryPercentage = getMasteredPercentage(deck.id);
    
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
        <CardHeader className="p-4 pb-2 flex flex-row justify-between items-start">
          <div className="flex flex-col gap-2 max-w-[75%]">
            <h3 className="font-bold text-xl leading-tight text-gray-900 dark:text-gray-50">{deck.name}</h3>
            {deck.description && (
              <p className="text-sm leading-snug text-gray-700 dark:text-gray-200 line-clamp-2">
                {deck.description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {deck.is_favorite && (
              <Star className="h-5 w-5 fill-amber-400 stroke-amber-500" />
            )}
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/20" 
              onClick={() => handleEditDeck(deck.id)}
            >
              <Edit className="h-4 w-4 text-gray-500 hover:text-blue-500 dark:text-gray-400 dark:hover:text-blue-400" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20">
                  <Trash2 className="h-4 w-4 text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="border border-gray-200 dark:border-gray-700 shadow-lg">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-gray-900 dark:text-gray-50">Delete Deck</AlertDialogTitle>
                  <AlertDialogDescription className="text-gray-600 dark:text-gray-400">
                    Are you sure you want to delete this deck? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300">Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={() => handleDeleteDeck(deck)}
                    className="bg-red-500 hover:bg-red-600 text-white dark:bg-red-600 dark:hover:bg-red-700"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardHeader>
        
        <CardContent className="flex-grow px-4 pt-1 pb-4">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {statusBadge && (
              <div className="mr-1">{statusBadge}</div>
            )}
            {nextReviewDate && (
              <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-md">
                <CalendarDays className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                <span className="text-xs font-medium text-gray-700 dark:text-gray-200">
                  Next Review: {nextReviewDate}
                </span>
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-5">
            <div className="flex flex-col items-center justify-center p-3 rounded-lg bg-blue-50 dark:bg-blue-900 border border-blue-100 dark:border-blue-600 shadow-sm">
              <span className="text-2xl font-bold text-blue-700 dark:text-blue-100">{summary.total}</span>
              <div className="flex items-center gap-1.5 mt-1">
                <CreditCard className="h-4 w-4 text-blue-600 dark:text-blue-200" />
                <span className="text-xs font-medium text-blue-700 dark:text-blue-200">Total Cards</span>
              </div>
            </div>
            
            <div className="flex flex-col items-center justify-center p-3 rounded-lg bg-amber-50 dark:bg-amber-900 border border-amber-100 dark:border-amber-600 shadow-sm">
              <span className="text-2xl font-bold text-amber-700 dark:text-amber-100">{summary.dueToday}</span>
              <div className="flex items-center gap-1.5 mt-1">
                <Clock className="h-4 w-4 text-amber-600 dark:text-amber-200" />
                <span className="text-xs font-medium text-amber-700 dark:text-amber-200">Cards Due Today</span>
              </div>
              {summary.dueToday > 0 && (
                <div className="w-full mt-2 pt-1.5 border-t border-amber-200 dark:border-amber-600">
                  <div className="flex justify-between items-center text-xxs font-medium text-amber-700 dark:text-amber-200">
                    <span>{Math.round((summary.dueToday / summary.total) * 100)}% of deck</span>
                    {summary.due > summary.dueToday && (
                      <span className="font-semibold">+{summary.due - summary.dueToday} upcoming</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Mastery Progress Section */}
          <div className="mb-4 p-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-800 dark:text-gray-100">Mastery Progress</span>
              <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-300">
                {masteryPercentage}%
              </span>
            </div>
            <div className="mt-1 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
              <div 
                className="bg-green-500 dark:bg-green-600 h-2.5 rounded-full" 
                style={{ width: `${masteryPercentage}%` }}
              ></div>
            </div>
            <div className="flex justify-between mt-2">
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{summary.masteredCount} mastered</span>
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{summary.total - summary.masteredCount} remaining</span>
            </div>
          </div>
          
          <div className="flex justify-between items-center gap-3">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1 text-sm h-9 font-medium border-gray-300 hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
              onClick={() => onManageCards?.(deck.id)}
            >
              <ListChecks className="h-4 w-4 mr-1.5" />
              Manage Cards
            </Button>
            
            <Button 
              variant="default" 
              size="sm" 
              className="flex-1 text-sm h-9 font-medium bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800"
              onClick={() => onSelectDeck?.(deck.id)}
            >
              <BookOpen className="h-4 w-4 mr-1.5" />
              Study Now
            </Button>
          </div>
        </CardContent>
        
        <CardFooter className="pt-0 pb-4 px-4">
          <Button 
            variant="default"
            size="sm"
            className="w-full flex items-center justify-center gap-1.5 text-sm bg-blue-500 hover:bg-blue-600 text-white shadow-sm hover:shadow-md transition-all"
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
              setDeckFormData({ name: '', description: '', category: '' });
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
            setDeckFormData({ name: '', description: '', category: '' });
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
              <div className="flex flex-col space-y-2">
                <select
                  value={deckFormData.name}
                  onChange={(e) => {
                    if (e.target.value === "__custom__") {
                      // If custom option is selected, don't change the name yet
                      setShowCustomCategory(true);
                    } else {
                      setDeckFormData({ ...deckFormData, name: e.target.value, category: e.target.value });
                      setShowCustomCategory(false);
                    }
                  }}
                  className="w-full rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
                >
                  <option value="">Select a category or enter a new name</option>
                  {existingCategories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                  <option value="__custom__">+ Enter custom name</option>
                </select>
                {showCustomCategory && (
                  <Input
                    id="deck-name-custom"
                    value={customCategory}
                    onChange={(e) => {
                      setCustomCategory(e.target.value);
                      setDeckFormData({ ...deckFormData, name: e.target.value, category: e.target.value });
                    }}
                    placeholder="Enter custom deck name"
                    className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                    autoFocus
                  />
                )}
              </div>
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
                setDeckFormData({ name: '', description: '', category: '' });
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