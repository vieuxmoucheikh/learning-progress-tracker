import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import Progress from './ui/progress';
import { getDueCards, calculateNextReview, submitReview } from '../lib/flashcards';
import type { Flashcard } from '../types';

interface FlashcardStudyProps {
  deckId?: string;
}

export const FlashcardStudy: React.FC<FlashcardStudyProps> = ({ deckId }) => {
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

  if (cards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-6">
        <h2 className="text-2xl font-bold mb-4">No cards due for review!</h2>
        <p className="text-gray-600">Come back later when you have cards to review.</p>
      </div>
    );
  }

  const currentCard = cards[currentCardIndex];

  return (
    <div className="flex flex-col items-center space-y-6 p-6">
      <div className="w-full max-w-2xl">
        <Progress value={progress} className="mb-4" />
        <p className="text-sm text-gray-600 mb-4">
          Card {currentCardIndex + 1} of {cards.length}
        </p>
        
        <Card 
          className={`w-full h-64 cursor-pointer transition-transform duration-500 transform perspective-1000 ${
            isFlipped ? 'rotate-y-180' : ''
          }`}
          onClick={handleFlip}
        >
          <div className="absolute w-full h-full backface-hidden">
            <div className="p-6 flex items-center justify-center h-full">
              <div className="prose max-w-none">
                {currentCard.front_content}
              </div>
            </div>
          </div>
          
          <div className="absolute w-full h-full backface-hidden rotate-y-180">
            <div className="p-6 flex items-center justify-center h-full">
              <div className="prose max-w-none">
                {currentCard.back_content}
              </div>
            </div>
          </div>
        </Card>

        {isFlipped && (
          <div className="flex flex-col space-y-4 mt-6">
            <p className="text-center text-sm text-gray-600 mb-2">
              How well did you know this?
            </p>
            <div className="grid grid-cols-3 gap-4">
              <Button
                variant="destructive"
                onClick={() => handleQualityResponse(1)}
              >
                Again
              </Button>
              <Button
                variant="outline"
                onClick={() => handleQualityResponse(3)}
              >
                Good
              </Button>
              <Button
                variant="default"
                onClick={() => handleQualityResponse(5)}
              >
                Easy
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
