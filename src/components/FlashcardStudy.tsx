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
    loadCards();
  }, [deckId]);

  const loadCards = async () => {
    if (!deckId) return;
    try {
      const allCards = await getCards(deckId);
      setCards(allCards);
      setReviewStreak(0);
      setCurrentCardIndex(0);
      setShowAnswer(false);
    } catch (error) {
      console.error('Error loading cards:', error);
      toast({
        title: 'Error',
        description: 'Failed to load cards. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const handleRating = async (quality: number) => {
    if (isSubmitting) return;
    
    try {
      setIsSubmitting(true);
      const currentCard = cards[currentCardIndex];
      
      // Calculate next review using SM-2 algorithm
      const { interval: newInterval, easeFactor: newEaseFactor, mastered } = calculateNextReview(
        quality,
        currentCard.interval || 0,
        currentCard.ease_factor || 2.5,
        currentCard.repetitions || 0
      );

      // Submit the review and get updated card
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

      // Update the card in the local state
      if (updatedCard) {
        setCards(cards.map(card => 
          card.id === currentCard.id 
            ? { 
                ...card, 
                last_reviewed: new Date().toISOString(),
                next_review: nextReviewDate?.toISOString() || null,
                review_count: (card.review_count || 0) + 1,
                mastered: mastered
              } 
            : card
        ));
      }

      // Update review count and progress
      setReviewStreak(prev => prev + 1);

      // Move to next card or finish session
      if (currentCardIndex < cards.length - 1) {
        setCurrentCardIndex(prev => prev + 1);
        setShowAnswer(false);
      } else {
        // Session complete
        handleFinishSession();
      }
    } catch (error) {
      console.error('Error submitting review:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit review. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinishSession = () => {
    onFinish();
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <Button
          variant="outline"
          className="bg-blue-600 text-white hover:bg-blue-700"
          onClick={onFinish}
        >
          ← Back to Deck
        </Button>
        <Button
          variant="outline"
          className="bg-blue-600 text-white hover:bg-blue-700"
          onClick={onBackToDecks}
        >
          Back to All Decks
        </Button>
      </div>

      {cards.length > 0 ? (
        <>
          <div className="flex justify-between items-center mb-4">
            <div>Card {currentCardIndex + 1} of {cards.length}</div>
            <div>Reviews this session: {reviewStreak}</div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
            <div className="text-center mb-6">
              <h3 className="text-lg font-medium mb-4">
                {showAnswer ? 'Back' : 'Front'}
              </h3>
              <div className="text-xl">
                {showAnswer ? cards[currentCardIndex]?.back_content : cards[currentCardIndex]?.front_content}
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
                    className="bg-red-600 text-white hover:bg-red-700"
                    onClick={() => handleRating(1)}
                  >
                    Hard
                  </Button>
                  <Button
                    className="bg-yellow-600 text-white hover:bg-yellow-700"
                    onClick={() => handleRating(2)}
                  >
                    Medium
                  </Button>
                  <Button
                    className="bg-green-600 text-white hover:bg-green-700"
                    onClick={() => handleRating(3)}
                  >
                    Easy
                  </Button>
                  <Button
                    className="bg-blue-600 text-white hover:bg-blue-700"
                    onClick={() => handleRating(4)}
                  >
                    Mastered
                  </Button>
                </div>
              </div>
            )}
          </div>
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
