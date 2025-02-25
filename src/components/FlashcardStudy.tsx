import { useState, useEffect, useCallback } from 'react';
import { useToast } from './ui/use-toast';
import { Button } from './ui/button';
import Progress from './ui/progress';
import { ArrowLeft, Repeat, ThumbsUp, ThumbsDown, Check, Loader2 } from 'lucide-react';
import { calculateNextReview, submitReview } from '../lib/flashcards';
import { supabase } from '../lib/supabase';
import type { Flashcard } from '../types';
import { Badge } from './ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

interface FlashcardStudyProps {
  deckId: string;
  onBackToDecks: () => void;
  onFinish?: () => void;
}

export const FlashcardStudy = ({ deckId, onBackToDecks, onFinish }: FlashcardStudyProps) => {
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sessionStats, setSessionStats] = useState({
    reviewed: 0,
    mastered: 0,
    total: 0,
    averageTimePerCard: 0,
    totalTime: 0
  });
  const [studyMode, setStudyMode] = useState<'spaced' | 'random'>('spaced');
  const { toast } = useToast();

  const handleRate = useCallback(async (quality: number) => {
    if (currentCardIndex >= cards.length) return;

    const currentCard = cards[currentCardIndex];
    const { interval: prevInterval, ease_factor: prevEaseFactor } = currentCard;

    const {
      interval: newInterval,
      easeFactor: newEaseFactor,
      repetitions,
      mastered
    } = calculateNextReview(quality, prevInterval, prevEaseFactor, currentCard.repetitions || 0);

    try {
      const updatedCard = await submitReview(
        currentCard.id,
        quality,
        prevInterval,
        newInterval,
        prevEaseFactor,
        newEaseFactor,
        mastered
      );

      // Update the card in the local state
      setCards(cards.map(card => 
        card.id === updatedCard.id ? updatedCard : card
      ));

      setSessionStats(prev => ({
        ...prev,
        reviewed: prev.reviewed + 1,
        mastered: prev.mastered + (mastered ? 1 : 0),
        averageTimePerCard: (prev.averageTimePerCard * prev.reviewed + 1000) / (prev.reviewed + 1),
        totalTime: prev.totalTime + 1000
      }));

      // Show feedback toast
      const feedbackMessages = {
        1: '😅 Keep practicing!',
        2: '👍 Getting there!',
        3: '🎯 Well done!',
        4: '🌟 Mastered!'
      };

      toast({
        description: feedbackMessages[quality as keyof typeof feedbackMessages],
      });

      // Move to next card
      setIsFlipped(false);
      setCurrentCardIndex(prev => prev + 1);

    } catch (error) {
      console.error('Error updating card:', error);
      toast({
        title: "Error",
        description: "Failed to update card review status",
        variant: "destructive"
      });
    }
  }, [cards, currentCardIndex, toast]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        setIsFlipped(!isFlipped);
      } else if (isFlipped) {
        switch (e.key) {
          case '1':
            handleRate(1);
            break;
          case '2':
            handleRate(2);
            break;
          case '3':
            handleRate(3);
            break;
          case '4':
            handleRate(4);
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isFlipped, handleRate]);

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

      if (studyMode === 'random') {
        dueCards.sort(() => Math.random() - 0.5);
      }

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
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
          <div className="flex items-center gap-4">
            <Button 
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={onBackToDecks}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Decks
            </Button>
            {/* Study mode toggle */}
            <Select
              value={studyMode}
              onValueChange={(value) => setStudyMode(value as 'spaced' | 'random')}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Study Mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="spaced">Spaced Repetition</SelectItem>
                <SelectItem value="random">Random Order</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col items-end">
            <div className="text-sm font-medium">
              Card {currentCardIndex + 1} of {cards.length}
            </div>
            {currentCard.last_reviewed && (
              <div className="text-xs text-gray-500">
                Last reviewed: {new Date(currentCard.last_reviewed).toLocaleDateString()}
              </div>
            )}
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
                <div className="flex justify-between items-center mb-2">
                  <div className="text-sm text-gray-500">Front</div>
                  {currentCard.tags && currentCard.tags.length > 0 && (
                    <div className="flex gap-1">
                      {currentCard.tags.map((tag, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex-1 overflow-y-auto">
                  <div className="prose max-w-none">
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
                  <div className="prose max-w-none">
                    {currentCard.back_content}
                  </div>
                </div>
                <div className="flex justify-between items-center mt-4">
                  <div className="text-xs text-gray-500">
                    Repetitions: {currentCard.repetitions || 0}
                  </div>
                  {currentCard.next_review && (
                    <div className="text-xs text-gray-500">
                      Next review: {new Date(currentCard.next_review).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Keyboard shortcuts hint */}
            <div className="absolute bottom-2 right-2 text-xs text-gray-400">
              Press Space to flip • 1-4 to rate
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
                Hard (1)
              </Button>
              <Button
                className="bg-yellow-600 hover:bg-yellow-700 text-white"
                onClick={() => handleRate(2)}
                disabled={!isFlipped}
              >
                <Repeat className="h-4 w-4 mr-2" />
                Medium (2)
              </Button>
              <Button
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={() => handleRate(3)}
                disabled={!isFlipped}
              >
                <ThumbsUp className="h-4 w-4 mr-2" />
                Easy (3)
              </Button>
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => handleRate(4)}
                disabled={!isFlipped}
              >
                <Check className="h-4 w-4 mr-2" />
                Master (4)
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <div className="bg-gray-50 rounded-lg p-4 space-y-4">
            <div>
              <h3 className="text-sm font-medium mb-2">Session Progress</h3>
              <Progress value={(currentCardIndex / cards.length) * 100} />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-3 rounded-md">
                <div className="text-sm text-gray-600">Cards Reviewed</div>
                <div className="text-2xl font-semibold">{sessionStats.reviewed} / {sessionStats.total}</div>
              </div>
              <div className="bg-white p-3 rounded-md">
                <div className="text-sm text-gray-600">Mastered</div>
                <div className="text-2xl font-semibold text-blue-600">{sessionStats.mastered}</div>
              </div>
            </div>

            <div className="flex justify-between text-sm text-gray-600">
              <div>Average Time per Card: {Math.round(sessionStats.averageTimePerCard / 1000)}s</div>
              <div>Study Time: {Math.round(sessionStats.totalTime / 60000)}m</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
