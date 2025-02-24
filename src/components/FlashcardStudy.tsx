import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { useToast } from './ui/use-toast';
import type { Flashcard } from '../types';
import { getCards, calculateNextReview, submitReview } from '../lib/flashcards';

interface FlashcardStudyProps {
  deckId?: string;
  onFinish: () => void;
  onBackToDecks: () => void;
}

export const FlashcardStudy: React.FC<FlashcardStudyProps> = ({ deckId, onFinish, onBackToDecks }) => {
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [reviewStreak, setReviewStreak] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!deckId) {
      toast({
        title: "Error",
        description: "No deck selected",
        variant: "destructive"
      });
      return;
    }
    loadCards(deckId);
  }, [deckId]);

  const loadCards = async (deckId: string) => {
    try {
      const allCards = await getCards(deckId);
      setCards(allCards);
      setReviewStreak(0);
      setCurrentCardIndex(0);
      setShowAnswer(false);
    } catch (error) {
      console.error('Error loading cards:', error);
      toast({
        title: "Error",
        description: "Failed to load flashcards",
        variant: "destructive"
      });
    }
  };

  const handleRating = async (quality: number) => {
    if (isSubmitting || !currentCard) return;
    
    try {
      setIsSubmitting(true);

      const { interval: newInterval, easeFactor: newEaseFactor, mastered } = calculateNextReview(
        quality,
        currentCard.interval || 0,
        currentCard.ease_factor || 2.5,
        currentCard.repetitions || 0
      );

      const nextReviewDate = mastered ? null : new Date();
      if (nextReviewDate) {
        nextReviewDate.setDate(nextReviewDate.getDate() + newInterval);
      }

      const updatedCard = await submitReview(
        currentCard.id,
        quality,
        currentCard.interval || 0,
        newInterval,
        currentCard.ease_factor || 2.5,
        newEaseFactor,
        mastered
      );

      // Show rating feedback with next review date
      const nextReviewStr = nextReviewDate ? nextReviewDate.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric'
      }) : 'Card Mastered!';

      toast({
        title: "Card Rated",
        description: mastered 
          ? "Card mastered! It won't appear in future reviews." 
          : `Next review: ${nextReviewStr}`,
        duration: 3000,
      });

      // Update the card in the local state
      setCards(cards.map(card => 
        card.id === currentCard.id 
          ? updatedCard
          : card
      ));

      // Move to the next card
      if (currentCardIndex < cards.length - 1) {
        setCurrentCardIndex(prev => prev + 1);
        setShowAnswer(false);
        setReviewStreak(prev => prev + 1);
      } else {
        handleFinishSession();
      }

    } catch (error) {
      console.error('Error submitting review:', error);
      toast({
        title: "Error",
        description: "Failed to submit review. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinishSession = () => {
    toast({
      title: "Study Session Complete!",
      description: `You reviewed ${reviewStreak} cards this session.`,
      duration: 5000,
    });
    onFinish();
  };

  const currentCard = cards[currentCardIndex];

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <Button
          variant="outline"
          className="bg-blue-600 text-white hover:bg-blue-700"
          onClick={onBackToDecks}
        >
          ← Back to Decks
        </Button>
      </div>

      {cards.length > 0 ? (
        <>
          <div className="flex justify-between items-center mb-4">
            <div className="text-sm text-gray-600">Card {currentCardIndex + 1} of {cards.length}</div>
            <div className="text-sm text-gray-600">Reviews this session: {reviewStreak}</div>
          </div>

          {currentCard && (
            <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
              <div className="text-center mb-6">
                <h3 className="text-lg font-medium mb-4">
                  {showAnswer ? 'Back' : 'Front'}
                </h3>
                <div className="text-xl">
                  {showAnswer ? currentCard.back_content : currentCard.front_content}
                </div>
              </div>

              {!showAnswer ? (
                <div className="flex justify-center">
                  <Button
                    className="bg-blue-600 text-white hover:bg-blue-700"
                    onClick={() => setShowAnswer(true)}
                  >
                    Show Answer
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-center gap-2">
                    <Button
                      className="bg-red-600 text-white hover:bg-red-700 flex flex-col"
                      onClick={() => handleRating(1)}
                      disabled={isSubmitting}
                    >
                      <span>Hard</span>
                      <span className="text-xs">2 days</span>
                    </Button>
                    <Button
                      className="bg-yellow-600 text-white hover:bg-yellow-700 flex flex-col"
                      onClick={() => handleRating(2)}
                      disabled={isSubmitting}
                    >
                      <span>Medium</span>
                      <span className="text-xs">4 days</span>
                    </Button>
                    <Button
                      className="bg-green-600 text-white hover:bg-green-700 flex flex-col"
                      onClick={() => handleRating(3)}
                      disabled={isSubmitting}
                    >
                      <span>Easy</span>
                      <span className="text-xs">1 month</span>
                    </Button>
                    <Button
                      className="bg-blue-600 text-white hover:bg-blue-700 flex flex-col"
                      onClick={() => handleRating(4)}
                      disabled={isSubmitting}
                    >
                      <span>Mastered</span>
                      <span className="text-xs">Remove</span>
                    </Button>
                  </div>
                </div>
              )}

              {currentCard.next_review && !currentCard.mastered && (
                <div className="mt-4 text-center text-sm text-gray-600">
                  Next review: {new Date(currentCard.next_review).toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric'
                  })}
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-8">
          <h3 className="text-xl font-medium mb-2">No cards due for review!</h3>
          <p className="text-gray-600">Come back later when you have cards to review.</p>
          <Button
            className="mt-4 bg-blue-600 text-white hover:bg-blue-700"
            onClick={onBackToDecks}
          >
            Back to Decks
          </Button>
        </div>
      )}
    </div>
  );
};
