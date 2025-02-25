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
  const [currentCard, setCurrentCard] = useState<Flashcard | null>(null);
  const [showBack, setShowBack] = useState(false);
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

  useEffect(() => {
    if (cards.length > 0) {
      setCurrentCard(cards[currentCardIndex]);
    }
  }, [cards, currentCardIndex]);

  const loadCards = async () => {
    try {
      const { data, error } = await supabase
        .from('flashcards')
        .select('*')
        .eq('deck_id', deckId)
        .order('next_review', { ascending: true });

      if (error) throw error;

      // Parse back content for each card
      const cardsWithParsedContent = data.map(card => {
        try {
          const parsedContent = JSON.parse(card.back_content);
          return {
            ...card,
            parsedBackContent: {
              text: parsedContent.text || card.back_content,
              imageUrl: parsedContent.imageUrl || null
            }
          };
        } catch (e) {
          return {
            ...card,
            parsedBackContent: {
              text: card.back_content,
              imageUrl: null
            }
          };
        }
      });

      setCards(cardsWithParsedContent);
      setSessionStats({
        reviewed: 0,
        mastered: 0,
        total: cardsWithParsedContent.length
      });
      setLoading(false);
    } catch (error) {
      console.error('Error loading cards:', error);
      toast({
        title: 'Error loading cards',
        description: 'There was an error loading your flashcards.',
        variant: 'destructive',
      });
    }
  };

  const handleRate = async (quality: number) => {
    if (!currentCard) return;

    try {
      const { interval, easeFactor, mastered } = calculateNextReview(
        quality,
        currentCard.interval ?? 0,
        currentCard.ease_factor ?? 2.5,
        currentCard.repetitions ?? 0
      );

      const { error } = await supabase
        .from('flashcards')
        .update({
          last_reviewed: new Date().toISOString(),
          next_review: new Date(Date.now() + interval * 24 * 60 * 60 * 1000).toISOString(),
          interval,
          ease_factor: easeFactor,
          repetitions: (currentCard.repetitions ?? 0) + 1,
          mastered,
          review_count: (currentCard.review_count ?? 0) + 1
        })
        .eq('id', currentCard.id);

      if (error) throw error;

      // Update session stats
      setSessionStats(prev => ({
        reviewed: prev.reviewed + 1,
        mastered: prev.mastered + (mastered ? 1 : 0),
        total: prev.total
      }));

      // Move to next card
      if (currentCardIndex < cards.length - 1) {
        setCurrentCardIndex(prev => prev + 1);
        setShowBack(false);
      } else {
        // Session complete
        toast({
          title: "Session Complete!",
          description: `You reviewed ${sessionStats.reviewed + 1} cards and mastered ${sessionStats.mastered + (mastered ? 1 : 0)} out of ${sessionStats.total} cards.`
        });
        await loadCards(); // Reload cards to get new due cards
        setCurrentCardIndex(0);
        setShowBack(false);
        if (onFinish) onFinish();
      }
    } catch (error) {
      console.error('Error updating flashcard:', error);
      toast({
        title: "Error",
        description: "Failed to update flashcard",
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
          <div className="max-w-2xl mx-auto p-6">
            {currentCard ? (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 text-center">
                <div className="mb-8">
                  <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-4">
                    {showBack ? 'Back' : 'Front'}
                  </h3>
                  <div className="text-gray-700 dark:text-gray-300 text-lg whitespace-pre-wrap">
                    {showBack ? currentCard.parsedBackContent?.text : currentCard.front_content}
                  </div>
                  {showBack && currentCard.parsedBackContent?.imageUrl && (
                    <div className="mt-4">
                      <img 
                        src={currentCard.parsedBackContent.imageUrl} 
                        alt="Card content" 
                        className="max-h-64 mx-auto rounded-lg object-contain"
                      />
                    </div>
                  )}
                </div>
                <div className="flex justify-center">
                  <Button
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={() => setShowBack(!showBack)}
                  >
                    {showBack ? 'Show Front' : 'Show Back'}
                  </Button>
                </div>
              </div>
            ) : (
              <div>Loading...</div>
            )}
          </div>

          <div className="mt-8 space-y-4">
            <div className="grid grid-cols-4 gap-2">
              <Button
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={() => handleRate(1)}
                disabled={!showBack}
              >
                <ThumbsDown className="h-4 w-4 mr-2" />
                Hard
              </Button>
              <Button
                className="bg-yellow-600 hover:bg-yellow-700 text-white"
                onClick={() => handleRate(2)}
                disabled={!showBack}
              >
                <Repeat className="h-4 w-4 mr-2" />
                Medium
              </Button>
              <Button
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={() => handleRate(3)}
                disabled={!showBack}
              >
                <ThumbsUp className="h-4 w-4 mr-2" />
                Easy
              </Button>
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => handleRate(4)}
                disabled={!showBack}
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
