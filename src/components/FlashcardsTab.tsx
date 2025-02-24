import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { FlashcardDecks } from './FlashcardDecks';
import { FlashcardManager } from './FlashcardManager';
import { FlashcardStudy } from './FlashcardStudy';
import { supabase } from '../lib/supabase';
import { useToast } from './ui/use-toast';
import { Alert, AlertTitle, AlertDescription } from './ui/alert';
import { Bell } from 'lucide-react';

type View = 'decks' | 'manage' | 'study';

export const FlashcardsTab: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('decks');
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);
  const [dueCards, setDueCards] = useState<number>(0);
  const { toast } = useToast();

  useEffect(() => {
    checkDueCards();
  }, [currentView]);

  const checkDueCards = async () => {
    try {
      const now = new Date().toISOString();
      const { data: cards, error } = await supabase
        .from('flashcards')
        .select('id')
        .lt('next_review', now)
        .eq('mastered', false);

      if (error) throw error;
      
      if (cards && cards.length > 0) {
        setDueCards(cards.length);
        if (currentView === 'decks') {
          toast({
            title: "Time to review!",
            description: `You have ${cards.length} cards due for review.`,
            duration: 5000,
          });
        }
      } else {
        setDueCards(0);
      }
    } catch (error) {
      console.error('Error checking due cards:', error);
    }
  };

  const handleDeckSelect = (deckId: string) => {
    setSelectedDeckId(deckId);
    setCurrentView('manage');
  };

  const handleStartStudying = () => {
    setCurrentView('study');
  };

  const handleBackToManager = () => {
    setCurrentView('manage');
  };

  const handleBackToDecks = () => {
    setSelectedDeckId(null);
    setCurrentView('decks');
  };

  return (
    <div className="h-full">
      {dueCards > 0 && currentView === 'decks' && (
        <Alert className="mb-4 bg-blue-50 border-blue-200">
          <Bell className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-800">Time to Review!</AlertTitle>
          <AlertDescription className="text-blue-600">
            You have {dueCards} card{dueCards === 1 ? '' : 's'} due for review.
          </AlertDescription>
        </Alert>
      )}

      {currentView !== 'decks' && (
        <div className="flex justify-between items-center p-4 border-b">
          <div className="space-x-2">
            {currentView === 'manage' && (
              <>
                <Button
                  variant="outline"
                  className="bg-blue-600 text-white hover:bg-blue-700"
                  onClick={handleBackToDecks}
                >
                  ← Back to Decks
                </Button>
              </>
            )}
            {currentView === 'study' && (
              <>
                <Button
                  variant="outline"
                  className="bg-blue-600 text-white hover:bg-blue-700"
                  onClick={handleBackToManager}
                >
                  ← Back to Deck
                </Button>
                <Button
                  variant="outline"
                  className="bg-blue-600 text-white hover:bg-blue-700"
                  onClick={handleBackToDecks}
                >
                  Back to All Decks
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      <div className="p-6">
        {currentView === 'decks' && (
          <FlashcardDecks onSelectDeck={handleDeckSelect} />
        )}
        {currentView === 'manage' && selectedDeckId && (
          <FlashcardManager
            deckId={selectedDeckId}
            onStartStudying={handleStartStudying}
          />
        )}
        {currentView === 'study' && selectedDeckId && (
          <FlashcardStudy
            deckId={selectedDeckId}
            onFinish={handleBackToManager}
          />
        )}
      </div>
    </div>
  );
};
