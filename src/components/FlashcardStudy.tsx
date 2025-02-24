import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Button } from './ui/button';
import * as Progress from '@radix-ui/react-progress';
import { useToast } from './ui/use-toast';
import { ArrowLeft, Repeat, ThumbsUp, ThumbsDown, Check, Brain } from 'lucide-react';
import { calculateNextReview, submitReview } from '../lib/flashcards';
import type { Flashcard } from '../types';

interface FlashcardStudyProps {
  deckId: string;
  onBackToDecks: () => void;
  onFinish?: () => void;
}

export const FlashcardStudy: React.FC<FlashcardStudyProps> = ({ deckId, onBackToDecks, onFinish }) => {
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
      const updatedCard = await submitReview(
        currentCard.id,
        quality,
        currentCard.interval || 0,
        interval,
        currentCard.ease_factor || 2.5,
        easeFactor,
        mastered
      );

      // Update session stats
      setSessionStats(prev => ({
        ...prev,
        reviewed: prev.reviewed + 1,
        mastered: prev.mastered + (mastered ? 1 : 0)
      }));

      // Show feedback toast
      const feedbackMessages = {
        1: "Keep practicing! You'll get it next time.",
        2: "Good progress! Review again in a few days.",
        3: "Great job! Review again in a month.",
        4: "Perfect! Card mastered!"
      };

      toast({
        title: mastered ? "Card Mastered! " : "Review Submitted",
        description: feedbackMessages[quality as keyof typeof feedbackMessages],
        variant: mastered ? "default" : "default"
      });

      // Move to next card
      if (currentCardIndex < cards.length - 1) {
        setCurrentCardIndex(prev => prev + 1);
        setIsFlipped(false);
      } else {
        // Session complete
        toast({
          title: "Session Complete! ",
          description: `You reviewed ${sessionStats.reviewed} cards and mastered ${sessionStats.mastered} cards!`,
        });
        await loadCards(); // Reload cards to get new due cards
        setCurrentCardIndex(0);
        setIsFlipped(false);
        if (onFinish) onFinish();
      }
    } catch (error) {
      console.error('Error submitting review:', error);
      toast({
        title: "Error",
        description: "Failed to submit review",
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

  if (!cards.length) {
    return (
      <div className="text-center py-12">
        <Brain className="mx-auto h-12 w-12 text-blue-600 mb-4" />
        <h3 className="text-xl font-medium mb-2">No cards due for review!</h3>
        <p className="text-gray-600 mb-4">All caught up! Come back later for more reviews.</p>
        <Button onClick={onBackToDecks}>Back to Decks</Button>
      </div>
    );
  }

  const currentCard = cards[currentCardIndex];

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto p-4 space-y-4">
      <div className="flex justify-between items-center">
        <Button variant="outline" onClick={onBackToDecks}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Decks
        </Button>
        <div className="text-sm text-gray-600">
          Card {currentCardIndex + 1} of {cards.length}
        </div>
      </div>

      <div className="flex-grow flex flex-col">
        <div className="flex-grow flex flex-col bg-white rounded-lg shadow-lg p-6 mb-20">
          <div className="text-lg font-semibold mb-4">
            {isFlipped ? 'Back' : 'Front'}
          </div>
          <div className="flex-grow overflow-y-auto">
            <div className="prose max-w-none">
              {isFlipped ? currentCard.back_content : currentCard.front_content}
            </div>
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-t">
          <div className="max-w-4xl mx-auto p-4">
            {isFlipped ? (
              <div className="flex justify-center gap-2">
                <Button
                  variant="destructive"
                  onClick={() => handleRate(1)}
                  className="w-24"
                >
                  <ThumbsDown className="h-4 w-4 mr-2" />
                  Hard
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleRate(2)}
                  className="w-24"
                >
                  <Repeat className="h-4 w-4 mr-2" />
                  Medium
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleRate(3)}
                  className="w-24"
                >
                  <ThumbsUp className="h-4 w-4 mr-2" />
                  Easy
                </Button>
                <Button
                  variant="default"
                  onClick={() => handleRate(4)}
                  className="w-24"
                >
                  <Check className="h-4 w-4 mr-2" />
                  Master
                </Button>
              </div>
            ) : (
              <div className="flex justify-center">
                <Button onClick={() => setIsFlipped(true)} className="w-48">
                  Show Answer
                </Button>
              </div>
            )}
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
  );
};
