import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Button } from './ui/button';
import { Card } from './ui/card';
import * as Progress from '@radix-ui/react-progress';
import { useToast } from './ui/use-toast';
import { ArrowLeft, Repeat, ThumbsUp, ThumbsDown, Check, Keyboard, Tag, BarChart, RotateCcw } from 'lucide-react';
import { calculateNextReview, submitReview } from '../lib/flashcards';
import type { Flashcard } from '../types';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';

import './flashcard.css';

interface FlashcardStudyProps {
  deckId: string;
  onBackToDecks: () => void;
  onFinish?: () => void;
  onUpdateDeckMetrics?: () => void;
}

export const FlashcardStudy: React.FC<FlashcardStudyProps> = ({ 
  deckId, 
  onBackToDecks, 
  onFinish,
  onUpdateDeckMetrics 
}) => {
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sessionStats, setSessionStats] = useState({
    reviewed: 0,
    mastered: 0,
    total: 0,
    hardCount: 0,
    mediumCount: 0,
    easyCount: 0,
    masterCount: 0
  });
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadCards();
  }, [deckId]);
  
  // Keyboard shortcuts handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle shortcuts when cards are loaded
      if (cards.length === 0 || loading) return;
      
      switch(e.key) {
        case ' ': // Space to flip card
          setIsFlipped(!isFlipped);
          break;
        case '1': // 1 for Hard rating
          if (isFlipped) handleRate(1);
          break;
        case '2': // 2 for Medium rating
          if (isFlipped) handleRate(2);
          break;
        case '3': // 3 for Easy rating
          if (isFlipped) handleRate(3);
          break;
        case '4': // 4 for Master rating
          if (isFlipped) handleRate(4);
          break;
        case 'ArrowRight': // Right arrow to go to next card (if available)
          if (currentCardIndex < cards.length - 1) {
            setCurrentCardIndex(prev => prev + 1);
            setIsFlipped(false);
          }
          break;
        case 'ArrowLeft': // Left arrow to go to previous card (if available)
          if (currentCardIndex > 0) {
            setCurrentCardIndex(prev => prev - 1);
            setIsFlipped(false);
          }
          break;
        case 'k': // k to show keyboard shortcuts
          setShowKeyboardShortcuts(true);
          break;
        default:
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cards, currentCardIndex, isFlipped, loading]);

  const loadCards = async () => {
    try {
      const { data, error } = await supabase
        .from('flashcards')
        .select('*')
        .eq('deck_id', deckId)
        .order('next_review', { ascending: true, nullsFirst: true });

      if (error) throw error;

      const now = new Date();
      const dueCards = (data || []).filter(card => {
        if (card.mastered) return false;
        if (!card.next_review) return true;
        return new Date(card.next_review) <= now;
      });

      setCards(dueCards);
      setSessionStats(prev => ({ ...prev, total: dueCards.length }));
      setLoading(false);
      
      // Update deck metrics whenever cards are loaded
      if (onUpdateDeckMetrics) {
        onUpdateDeckMetrics();
      }
    } catch (error) {
      console.error('Error loading cards:', error);
      toast({
        title: "Error",
        description: "Failed to load flashcards",
        variant: "destructive"
      });
    }
  };

  // Render card content with HTML
  const renderCardContent = (content: string) => {
    return <div dangerouslySetInnerHTML={{ __html: content }} />;
  };

  const handleRate = async (quality: number) => {
    if (!cards.length) return;

    const currentCard = cards[currentCardIndex];
    const { interval, easeFactor, mastered } = calculateNextReview(
      quality,
      currentCard.interval || 0,
      currentCard.ease_factor || 2.5,
      currentCard.repetitions || 0
    );

    try {
      // Update the card in the database
      await submitReview(
        currentCard.id,
        quality,
        currentCard.interval || 0,
        interval,
        currentCard.ease_factor || 2.5,
        easeFactor,
        mastered
      );

      // Calculate the next review date
      const nextReviewDate = mastered ? null : new Date();
      if (nextReviewDate) {
        nextReviewDate.setDate(nextReviewDate.getDate() + interval);
      }

      // Format the next review date for display
      const formattedDate = nextReviewDate ? 
        nextReviewDate.toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        }) : null;

      // Update the card in the local state to reflect changes immediately
      const updatedCards = [...cards];
      updatedCards[currentCardIndex] = {
        ...updatedCards[currentCardIndex],
        last_reviewed: new Date().toISOString(),
        next_review: nextReviewDate?.toISOString() || undefined,
        interval: interval,
        ease_factor: easeFactor,
        mastered: mastered,
        repetitions: (currentCard.repetitions || 0) + (quality >= 3 ? 1 : 0)
      };
      setCards(updatedCards);

      // Update session stats
      setSessionStats(prev => {
        const newStats = {
          ...prev,
          reviewed: prev.reviewed + 1,
          mastered: prev.mastered + (mastered ? 1 : 0)
        };
        
        // Update rating counts
        switch(quality) {
          case 1:
            newStats.hardCount = prev.hardCount + 1;
            break;
          case 2:
            newStats.mediumCount = prev.mediumCount + 1;
            break;
          case 3:
            newStats.easyCount = prev.easyCount + 1;
            break;
          case 4:
            newStats.masterCount = prev.masterCount + 1;
            break;
        }
        
        return newStats;
      });

      // Show feedback toast with more specific information
      let feedbackMessage = "";
      let toastVariant: "default" | "destructive" = "default";
      
      switch(quality) {
        case 1:
          feedbackMessage = "Card marked as Hard. You'll see it again soon.";
          toastVariant = "destructive";
          break;
        case 2:
          feedbackMessage = "Card marked as Medium. You'll review it in a few days.";
          break;
        case 3:
          feedbackMessage = `Card marked as Easy. Next review in ${interval} days.`;
          break;
        case 4:
          feedbackMessage = "Card mastered! Great job!";
          break;
      }
      
      toast({
        title: "Card Rated",
        description: feedbackMessage,
        variant: toastVariant
      });

      // Update deck metrics immediately if a card is mastered
      if (mastered && onUpdateDeckMetrics) {
        onUpdateDeckMetrics();
      }

      // Move to the next card or complete the session
      if (currentCardIndex < cards.length - 1) {
        // Move to the next card
        setTimeout(() => {
          setCurrentCardIndex(prev => prev + 1);
          setIsFlipped(false);
        }, 500);
      } else {
        // Session complete
        setTimeout(() => {
          setCurrentCardIndex(prev => prev + 1);
          if (onUpdateDeckMetrics) {
            onUpdateDeckMetrics();
          }
        }, 500);
        
        if (onFinish) onFinish();
      }
    } catch (error) {
      console.error('Error submitting review:', error);
      toast({
        title: "Error",
        description: "Failed to submit review. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  return (
    <div className="flex flex-col h-full">
      {/* Keyboard Shortcuts Dialog */}
      <Dialog open={showKeyboardShortcuts} onOpenChange={setShowKeyboardShortcuts}>
        <DialogContent className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
          <DialogHeader>
            <DialogTitle>Keyboard Shortcuts</DialogTitle>
            <DialogDescription>
              Use these shortcuts to speed up your flashcard review
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="flex items-center gap-2">
              <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-700 font-mono text-sm">Space</kbd>
              <span>Flip card</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-700 font-mono text-sm">1</kbd>
              <span>Rate as Hard</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-700 font-mono text-sm">2</kbd>
              <span>Rate as Medium</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-700 font-mono text-sm">3</kbd>
              <span>Rate as Easy</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-700 font-mono text-sm">4</kbd>
              <span>Rate as Mastered</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-700 font-mono text-sm">→</kbd>
              <span>Next card</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-700 font-mono text-sm">←</kbd>
              <span>Previous card</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-700 font-mono text-sm">k</kbd>
              <span>Show this help</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Session Stats Dialog */}
      <Dialog open={showStats} onOpenChange={setShowStats}>
        <DialogContent className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
          <DialogHeader>
            <DialogTitle>Session Statistics</DialogTitle>
            <DialogDescription>
              Your performance in this study session
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                <div className="text-sm text-gray-500 dark:text-gray-400">Cards Reviewed</div>
                <div className="text-2xl font-bold">{sessionStats.reviewed} / {sessionStats.total}</div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                <div className="text-sm text-gray-500 dark:text-gray-400">Cards Mastered</div>
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">{sessionStats.mastered}</div>
              </div>
            </div>
            
            <h4 className="font-medium text-sm mt-4">Rating Distribution</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span>Hard</span>
                </div>
                <span className="font-medium">{sessionStats.hardCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span>Medium</span>
                </div>
                <span className="font-medium">{sessionStats.mediumCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span>Easy</span>
                </div>
                <span className="font-medium">{sessionStats.easyCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span>Mastered</span>
                </div>
                <span className="font-medium">{sessionStats.masterCount}</span>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p>Loading flashcards...</p>
          </div>
        </div>
      ) : cards.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md">
            <h3 className="text-xl font-semibold mb-2">No cards due for review!</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              You're all caught up with this deck. Check back later when more cards are due for review.
            </p>
            <Button onClick={onBackToDecks} className="mx-auto">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to Decks
            </Button>
          </div>
        </div>
      ) : currentCardIndex >= cards.length ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md">
            <h3 className="text-xl font-semibold mb-2">Session Complete!</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-2">
              You've reviewed all {sessionStats.reviewed} cards in this session.
            </p>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {sessionStats.mastered > 0 ? `You mastered ${sessionStats.mastered} cards!` : ''}
            </p>
            <div className="flex gap-3 justify-center">
              <Button onClick={onBackToDecks} variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" /> Back to Decks
              </Button>
              <Button onClick={() => setShowStats(true)} variant="outline">
                <BarChart className="h-4 w-4 mr-2" /> View Stats
              </Button>
              {onFinish && (
                <Button onClick={onFinish} className="bg-blue-600 hover:bg-blue-700 text-white">
                  Finish Session
                </Button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col h-full max-w-4xl mx-auto p-4 space-y-4">
          <div className="container mx-auto p-4 max-w-2xl">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={onBackToDecks}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" /> Back to Decks
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowKeyboardShortcuts(true)}
                  className="flex items-center gap-1"
                >
                  <Keyboard className="h-3.5 w-3.5" /> Shortcuts
                </Button>
              </div>
              
              <div className="flex items-center gap-3">
                {cards[currentCardIndex].tags && cards[currentCardIndex].tags.length > 0 && (
                  <div className="flex items-center gap-1">
                    <Tag className="h-3.5 w-3.5 text-gray-500" />
                    <div className="flex gap-1">
                      {cards[currentCardIndex].tags.map((tag: string, index: number) => (
                        <Badge key={index} variant="outline" className="text-xs">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Card {currentCardIndex + 1} of {cards.length}
                </div>
              </div>
            </div>

            <div className="flex-grow flex flex-col">
              <div 
                className={`relative h-[450px] rounded-xl shadow-lg transition-all duration-500 transform cursor-pointer flashcard-item
                  ${isFlipped ? 'bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20' : 'bg-white dark:bg-gray-800'} border border-gray-200 dark:border-gray-700`}
                style={{ perspective: '1000px' }}
                onClick={() => setIsFlipped(!isFlipped)}
                ref={cardRef}
              >
                <div
                  className={`absolute inset-0 p-6 backface-hidden transition-all duration-500 transform rounded-xl
                    ${isFlipped ? 'rotate-y-180 opacity-0' : 'rotate-y-0 opacity-100'}`}
                >
                  <div className="h-full flex flex-col">
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">Front</div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                      <div className="text-lg flashcard-content">
                        {renderCardContent(cards[currentCardIndex].front_content)}
                      </div>
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 text-center mt-4">
                      Click to flip
                    </div>
                  </div>
                </div>

                <div
                  className={`absolute inset-0 p-6 backface-hidden transition-all duration-500 transform rounded-xl
                    ${isFlipped ? 'rotate-y-0 opacity-100' : 'rotate-y-180 opacity-0'}`}
                >
                  <div className="h-full flex flex-col">
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">Back</div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                      <div className="text-lg flashcard-content">
                        {renderCardContent(cards[currentCardIndex].back_content)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div
                className={`mt-8 space-y-4 transition-opacity duration-300 ${isFlipped ? 'opacity-100' : 'opacity-0'}`}
              >
                <div className="grid grid-cols-4 gap-2">
                  <Button
                    className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-sm hover:shadow-md transition-all"
                    onClick={() => handleRate(1)}
                    disabled={!isFlipped}
                  >
                    <ThumbsDown className="h-4 w-4 mr-2" />
                    Hard
                  </Button>
                  <Button
                    className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white shadow-sm hover:shadow-md transition-all"
                    onClick={() => handleRate(2)}
                    disabled={!isFlipped}
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Medium
                  </Button>
                  <Button
                    className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-sm hover:shadow-md transition-all"
                    onClick={() => handleRate(3)}
                    disabled={!isFlipped}
                  >
                    <ThumbsUp className="h-4 w-4 mr-2" />
                    Easy
                  </Button>
                  <Button
                    className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-sm hover:shadow-md transition-all"
                    onClick={() => handleRate(4)}
                    disabled={!isFlipped}
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Mastered
                  </Button>
                </div>
                <div className="text-xs text-center text-gray-500 dark:text-gray-400">
                  Keyboard shortcuts: 1 = Hard, 2 = Medium, 3 = Easy, 4 = Master
                </div>
              </div>
            </div>

            <Progress.Root 
              className="relative overflow-hidden bg-gray-200 dark:bg-gray-700 rounded-full w-full h-2 mt-6"
              value={(currentCardIndex / cards.length) * 100}
            >
              <Progress.Indicator
                className="bg-blue-600 w-full h-full transition-transform duration-500 ease-in-out"
                style={{ transform: `translateX(-${100 - (currentCardIndex / cards.length) * 100}%)` }}
              />
            </Progress.Root>

            <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="text-sm text-gray-600 dark:text-gray-300">
                <div className="flex justify-between mb-2">
                  <span>Session Progress:</span>
                  <span>{sessionStats.reviewed} / {sessionStats.total} cards reviewed</span>
                </div>
                <div className="flex justify-between">
                  <span>Cards Mastered:</span>
                  <span>{sessionStats.mastered} cards</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
