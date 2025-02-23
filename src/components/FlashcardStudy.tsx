import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import Progress from './ui/progress';
import { getDueCards, calculateNextReview, submitReview } from '../lib/flashcards';
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

  useEffect(() => {
    loadDueCards();
  }, [deckId]);

  const loadDueCards = async () => {
    try {
      const dueCards = await getDueCards(deckId);
      setCards(dueCards);
      setCurrentCardIndex(0);
      setIsFlipped(false);
      updateProgress(0, dueCards.length);
    } catch (error) {
      console.error('Error loading due cards:', error);
    }
  };

  const updateProgress = (current: number, total: number) => {
    setProgress(total > 0 ? (current / total) * 100 : 0);
  };

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleQualityResponse = async (quality: number) => {
    const currentCard = cards[currentCardIndex];
    
    try {
      const { interval, easeFactor } = calculateNextReview(
        quality,
        currentCard.interval,
        currentCard.ease_factor,
        currentCard.repetitions
      );

      await submitReview(
        currentCard.id,
        quality,
        currentCard.interval,
        interval,
        currentCard.ease_factor,
        easeFactor
      );

      // Move to next card
      if (currentCardIndex < cards.length - 1) {
        setCurrentCardIndex(prev => prev + 1);
        setIsFlipped(false);
        updateProgress(currentCardIndex + 1, cards.length);
      } else {
        // Finished all cards
        await loadDueCards();
      }
    } catch (error) {
      console.error('Error submitting review:', error);
    }
  };

  const handleFinishSession = () => {
    onFinish();
  };

  if (!deckId) {
    return null;
  }

  if (cards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6">
        <h2 className="text-2xl font-bold mb-4">No cards due for review!</h2>
        <p className="text-gray-600 mb-6">Come back later when you have cards to review.</p>
        <Button onClick={handleFinishSession}>
          Back to Deck
        </Button>
      </div>
    );
  }

  const currentCard = cards[currentCardIndex];

  return (
    <div className="flex flex-col h-full p-6">
      <div className="mb-6">
        <Progress value={progress} className="mb-2" />
        <div className="text-sm text-gray-600 text-center">
          {currentCardIndex + 1} of {cards.length} cards
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
            <div className="flex gap-4">
              <Button
                variant="outline"
                className="w-24"
                onClick={() => handleQualityResponse(1)}
              >
                Again
              </Button>
              <Button
                variant="outline"
                className="w-24"
                onClick={() => handleQualityResponse(3)}
              >
                Hard
              </Button>
              <Button
                className="w-24"
                onClick={() => handleQualityResponse(5)}
              >
                Good
              </Button>
            </div>
          ) : (
            <p className="text-gray-600">Click the card to reveal the answer</p>
          )}
        </div>
      </div>
    </div>
  );
};
