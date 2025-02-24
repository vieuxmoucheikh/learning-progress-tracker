import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { useToast } from './ui/use-toast';
import type { Flashcard } from '../types';
import { getCards, calculateNextReview, submitReview } from '../lib/flashcards';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction } from './ui/alert-dialog';

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
  const [showRatingDialog, setShowRatingDialog] = useState(false);
  const [lastRating, setLastRating] = useState<{ quality: number; nextReview: Date | null }>(); 
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

      // Show rating feedback
      const ratingMessages = {
        1: "Hard - Review in 2 days",
        2: "Medium - Review in 4 days",
        3: "Easy - Review in 1 month",
        4: "Mastered - Card will not be reviewed again"
      };

      toast({
        title: "Card Rated",
        description: ratingMessages[quality as keyof typeof ratingMessages],
        duration: 3000,
      });

      setLastRating({ quality, nextReview: nextReviewDate });
      setShowRatingDialog(true);

      // Auto-close dialog after 2 seconds
      setTimeout(() => {
        setShowRatingDialog(false);
      }, 2000);

      // Update the card in the local state
      setCards(cards.map(card => 
        card.id === currentCard.id 
          ? updatedCard
          : card
      ));

      // Move to the next card
      setCurrentCardIndex(prev => prev + 1);
      setShowAnswer(false);
      setReviewStreak(prev => prev + 1);

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
                {showAnswer ? currentCard?.back_content : currentCard?.front_content}
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
                  >
                    <span>Hard</span>
                    <span className="text-xs">2 days</span>
                  </Button>
                  <Button
                    className="bg-yellow-600 text-white hover:bg-yellow-700 flex flex-col"
                    onClick={() => handleRating(2)}
                  >
                    <span>Medium</span>
                    <span className="text-xs">4 days</span>
                  </Button>
                  <Button
                    className="bg-green-600 text-white hover:bg-green-700 flex flex-col"
                    onClick={() => handleRating(3)}
                  >
                    <span>Easy</span>
                    <span className="text-xs">1 month</span>
                  </Button>
                  <Button
                    className="bg-blue-600 text-white hover:bg-blue-700 flex flex-col"
                    onClick={() => handleRating(4)}
                  >
                    <span>Mastered</span>
                    <span className="text-xs">Remove</span>
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

      <AlertDialog open={showRatingDialog} onOpenChange={setShowRatingDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Card Rating Submitted</AlertDialogTitle>
            <AlertDialogDescription>
              {lastRating?.quality === 4 ? (
                "This card has been marked as mastered and won't appear in future reviews."
              ) : lastRating?.nextReview ? (
                <>
                  Next review scheduled for: {lastRating.nextReview.toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowRatingDialog(false)}>
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
