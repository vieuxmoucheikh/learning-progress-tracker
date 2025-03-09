import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Button } from './ui/button';
import * as Progress from '@radix-ui/react-progress';
import { useToast } from './ui/use-toast';
import { ArrowLeft, Repeat, ThumbsUp, ThumbsDown, Check } from 'lucide-react';
import { calculateNextReview, submitReview } from '../lib/flashcards';
import type { Flashcard } from '../types';

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
    total: 0
  });
  const { toast } = useToast();

  useEffect(() => {
    loadCards();
  }, [deckId]);

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
      setSessionStats(prev => ({
        ...prev,
        reviewed: prev.reviewed + 1,
        mastered: prev.mastered + (mastered ? 1 : 0)
      }));

      // Show feedback toast with more specific information
      let feedbackMessage = "";
      let toastVariant: "default" | "destructive" = "default";
      
      switch(quality) {
        case 1:
          feedbackMessage = `Hard - Next review in ${interval} days (${formattedDate})`;
          toastVariant = "destructive";
          break;
        case 2:
          feedbackMessage = `Good - Next review in ${interval} days (${formattedDate})`;
          toastVariant = "default";
          break;
        case 3:
          feedbackMessage = `Easy - Next review in ${interval} days (${formattedDate})`;
          toastVariant = "default";
          break;
        case 4:
          feedbackMessage = "Perfect! Card mastered and removed from regular rotation!";
          toastVariant = "default";
          break;
      }

      toast({
        title: mastered ? "Card Mastered! " : "Review Submitted",
        description: feedbackMessage,
        variant: toastVariant
      });

      // Move to next card
      if (currentCardIndex < cards.length - 1) {
        setCurrentCardIndex(prev => prev + 1);
        setIsFlipped(false);
        
        // Update deck metrics after each review
        if (onUpdateDeckMetrics) {
          onUpdateDeckMetrics();
        }
      } else {
        // Session complete
        toast({
          title: "Session Complete! ",
          description: `You reviewed ${sessionStats.reviewed + 1} cards and mastered ${sessionStats.mastered + (mastered ? 1 : 0)} cards!`,
          variant: "default"
        });
        
        // Reload cards to get new due cards
        await loadCards(); 
        setCurrentCardIndex(0);
        setIsFlipped(false);
        
        // Update deck metrics after completing the session
        if (onUpdateDeckMetrics) {
          setTimeout(() => {
            onUpdateDeckMetrics();
          }, 100); // Small delay to ensure the database has updated
        }
        
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-semibold mb-2">No cards due for review!</h2>
          <p className="text-gray-600">All caught up! Come back later for more reviews.</p>
        </div>
        <Button 
          className="bg-blue-600 hover:bg-blue-700 text-white"
          onClick={onBackToDecks}
        >
          Back to Decks
        </Button>
      </div>
    );
  }

  const currentCard = cards[currentCardIndex];

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto p-4 space-y-4">
      <div className="container mx-auto p-4 max-w-2xl">
        <div className="flex justify-between items-center mb-6">
          <Button 
            className="bg-blue-600 hover:bg-blue-700 text-white"
            onClick={onBackToDecks}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Decks
          </Button>
          <div className="text-sm text-gray-600">
            Card {currentCardIndex + 1} of {cards.length}
          </div>
        </div>

        <div className="flex-grow flex flex-col">
          <div 
            className={`relative h-96 rounded-xl shadow-lg transition-all duration-500 transform cursor-pointer
              ${isFlipped ? 'bg-blue-50' : 'bg-white'}`}
            style={{ perspective: '1000px' }}
            onClick={() => setIsFlipped(!isFlipped)}
          >
            <div
              className={`absolute inset-0 p-6 backface-hidden transition-all duration-500 transform rounded-xl
                ${isFlipped ? 'rotate-y-180 opacity-0' : 'rotate-y-0 opacity-100'}`}
            >
              <div className="h-full flex flex-col">
                <div className="text-sm text-gray-500 mb-2">Front</div>
                <div className="flex-1 overflow-y-auto">
                  <div className="text-lg">
                    {currentCard.front_content}
                  </div>
                </div>
                <div className="text-sm text-gray-500 text-center mt-4">
                  Click to flip
                </div>
              </div>
            </div>

            <div
              className={`absolute inset-0 p-6 backface-hidden transition-all duration-500 transform rounded-xl
                ${isFlipped ? 'rotate-y-0 opacity-100' : 'rotate-y-180 opacity-0'}`}
            >
              <div className="h-full flex flex-col">
                <div className="text-sm text-gray-500 mb-2">Back</div>
                <div className="flex-1 overflow-y-auto">
                  <div className="text-lg">
                    {currentCard.back_content}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className={`mt-8 space-y-4 transition-opacity duration-300 ${isFlipped ? 'opacity-100' : 'opacity-0'}`}>
            <div className="grid grid-cols-4 gap-2">
              <Button
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={() => handleRate(1)}
                disabled={!isFlipped}
              >
                <ThumbsDown className="h-4 w-4 mr-2" />
                Hard
              </Button>
              <Button
                className="bg-yellow-600 hover:bg-yellow-700 text-white"
                onClick={() => handleRate(2)}
                disabled={!isFlipped}
              >
                <Repeat className="h-4 w-4 mr-2" />
                Medium
              </Button>
              <Button
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={() => handleRate(3)}
                disabled={!isFlipped}
              >
                <ThumbsUp className="h-4 w-4 mr-2" />
                Easy
              </Button>
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => handleRate(4)}
                disabled={!isFlipped}
              >
                <Check className="h-4 w-4 mr-2" />
                Master
              </Button>
            </div>
          </div>
        </div>

        <Progress.Root 
          className="relative overflow-hidden bg-gray-200 rounded-full w-full h-2"
          value={(currentCardIndex / cards.length) * 100}
        >
          <Progress.Indicator
            className="bg-blue-600 w-full h-full transition-transform duration-500 ease-in-out"
            style={{ transform: `translateX(-${100 - (currentCardIndex / cards.length) * 100}%)` }}
          />
        </Progress.Root>

        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <div className="text-sm text-gray-600">
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
  );
};
