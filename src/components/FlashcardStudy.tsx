import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import Progress from './ui/progress';
import { getCards, calculateNextReview, submitReview } from '../lib/flashcards';
import type { Flashcard } from '../types';

interface FlashcardStudyProps {
  deckId?: string;
  onFinish: () => void;
}

export const FlashcardStudy: React.FC<FlashcardStudyProps> = ({ deckId, onFinish }) => {
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [progress, setProgress] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadCards();
  }, [deckId]);

  const loadCards = async () => {
    if (!deckId) return;
    try {
      const allCards = await getCards(deckId);
      setCards(allCards);
      setProgress(0);
      setCurrentCardIndex(0);
      setReviewCount(0);
      setIsFlipped(false);
    } catch (error) {
      console.error('Error loading cards:', error);
    }
  };

  const handleGrade = async (quality: number) => {
    if (isSubmitting) return;
    
    try {
      setIsSubmitting(true);
      const currentCard = cards[currentCardIndex];
      
      // Calculate next review using SM-2 algorithm
      const { interval: newInterval, easeFactor: newEaseFactor } = calculateNextReview(
        quality,
        currentCard.review_interval || 0,
        currentCard.ease_factor || 2.5,
        currentCard.repetitions || 0
      );

      // Submit the review
      await submitReview(
        currentCard.id,
        quality,
        currentCard.review_interval || 0,
        newInterval,
        currentCard.ease_factor || 2.5,
        newEaseFactor
      );

      // Update the card in the local state
      const updatedCards = [...cards];
      const nextReviewDate = new Date();
      nextReviewDate.setDate(nextReviewDate.getDate() + newInterval);
      
      updatedCards[currentCardIndex] = {
        ...currentCard,
        review_interval: newInterval,
        ease_factor: newEaseFactor,
        repetitions: (currentCard.repetitions || 0) + 1,
        last_reviewed: new Date().toISOString(),
        next_review: nextReviewDate.toISOString()
      };
      setCards(updatedCards);
      setReviewCount(prev => prev + 1);

      // Move to next card or finish session
      if (currentCardIndex < cards.length - 1) {
        setCurrentCardIndex(prev => prev + 1);
        setIsFlipped(false);
        setProgress(((currentCardIndex + 1) / cards.length) * 100);
      } else {
        // Session complete
        handleFinishSession();
      }
    } catch (error) {
      console.error('Error submitting review:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinishSession = () => {
    onFinish();
  };

  const handlePrevCard = () => {
    if (currentCardIndex > 0) {
      setCurrentCardIndex(prev => prev - 1);
      setIsFlipped(false);
    }
  };

  const handleNextCard = () => {
    if (currentCardIndex < cards.length - 1) {
      setCurrentCardIndex(prev => prev + 1);
      setIsFlipped(false);
    }
  };

  if (!deckId) {
    return null;
  }

  if (cards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6">
        <h2 className="text-2xl font-bold mb-4">No cards in this deck!</h2>
        <p className="text-gray-600 mb-6">Add some cards to start studying.</p>
        <Button onClick={handleFinishSession}>
          Back to Deck
        </Button>
      </div>
    );
  }

  const currentCard = cards[currentCardIndex];
  const nextReviewDate = new Date(currentCard.next_review).toLocaleDateString();
  const reviewStreak = currentCard.repetitions || 0;

  return (
    <div className="flex flex-col h-full p-6">
      <div className="mb-6">
        <Progress value={progress} className="mb-2" />
        <div className="flex justify-between text-sm text-gray-600 mb-4">
          <span>Card {currentCardIndex + 1} of {cards.length}</span>
          <span>Reviews this session: {reviewCount}</span>
        </div>
        <div className="flex justify-between text-sm text-gray-600">
          <span>Next review: {nextReviewDate}</span>
          <span>Review streak: {reviewStreak}</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center">
        <Card
          className={`w-full max-w-2xl p-8 cursor-pointer transition-transform duration-500 ${
            isFlipped ? 'scale-[0.98]' : ''
          }`}
          onClick={() => setIsFlipped(!isFlipped)}
        >
          <div className="text-center">
            <h3 className="text-lg font-medium mb-2">
              {isFlipped ? 'Back' : 'Front'}
            </h3>
            <p className="text-gray-800 text-xl">
              {isFlipped ? currentCard.back_content : currentCard.front_content}
            </p>
          </div>
        </Card>

        <div className="mt-8 flex flex-col items-center gap-4">
          {isFlipped ? (
            <>
              <div className="text-sm text-gray-600 mb-2">
                Rate how well you knew this:
              </div>
              <div className="flex gap-4">
                <Button
                  variant="outline"
                  className="w-24 border-red-200 hover:bg-red-50"
                  onClick={() => handleGrade(1)}
                  disabled={isSubmitting}
                >
                  Again
                </Button>
                <Button
                  variant="outline"
                  className="w-24 border-yellow-200 hover:bg-yellow-50"
                  onClick={() => handleGrade(3)}
                  disabled={isSubmitting}
                >
                  Hard
                </Button>
                <Button
                  className="w-24 border-green-200 hover:bg-green-50"
                  onClick={() => handleGrade(5)}
                  disabled={isSubmitting}
                >
                  Good
                </Button>
              </div>
            </>
          ) : (
            <div className="flex gap-4">
              <Button
                variant="outline"
                onClick={handlePrevCard}
                disabled={currentCardIndex === 0}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                onClick={handleNextCard}
                disabled={currentCardIndex === cards.length - 1}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
