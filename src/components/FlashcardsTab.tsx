import React, { useState } from 'react';
import { Button } from './ui/button';
import { FlashcardDecks } from './FlashcardDecks';
import { FlashcardManager } from './FlashcardManager';
import { FlashcardStudy } from './FlashcardStudy';
import { FlashcardDeck } from '@/types';
import { useToast } from './ui/use-toast';
import { useTheme } from '../components/ThemeProvider';

type View = 'decks' | 'study' | 'manage';

interface FlashcardsTabProps {
  flashcards: FlashcardDeck[];
  onAddDeck: (data: { name: string; description: string }) => void;
  onStudyDeck: (deckId: string) => void;
  onEditDeck: (deckId: string) => void;
  onDeleteDeck: (deckId: string) => void;
}

export const FlashcardsTab: React.FC<FlashcardsTabProps> = ({
  flashcards,
  onAddDeck,
  onStudyDeck,
  onEditDeck,
  onDeleteDeck
}) => {
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);
  const [view, setView] = useState<View>('decks');
  const { toast } = useToast();
  const { isDark } = useTheme();

  const handleSelectDeck = (deckId: string) => {
    setSelectedDeckId(deckId);
    setView('manage');
  };

  const handleStudyDeck = (deckId: string) => {
    setSelectedDeckId(deckId);
    onStudyDeck(deckId);
    setView('study');
  };

  const handleEditDeck = (deckId: string) => {
    setSelectedDeckId(deckId);
    onEditDeck(deckId);
    setView('manage');
  };

  const handleBackToDecks = () => {
    setSelectedDeckId(null);
    setView('decks');
  };

  const handleFinishStudy = () => {
    handleBackToDecks();
  };

  const handleManageCards = () => {
    setView('manage');
  };

  const handleAddFlashcard = (deckId: string) => {
    if (!deckId) {
      toast({
        title: "Error",
        description: "No deck selected. Please select a deck first.",
        variant: "destructive"
      });
      return;
    }
    // We don't need to implement this fully - it's handled by FlashcardDecks component
    // Just making sure the deck ID is properly set
  };

  return (
    <div className="w-full h-full bg-white dark:bg-gray-800">
      {view === 'decks' || !selectedDeckId ? (
        <FlashcardDecks 
          decks={flashcards}
          onSelectDeck={handleSelectDeck}
          onStudyDeck={handleStudyDeck}
          onEditDeck={handleEditDeck}
          onDeleteDeck={onDeleteDeck}
          onAddDeck={onAddDeck}
        />
      ) : view === 'study' ? (
        <div className="h-full">
          <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleBackToDecks}
                className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
              >
                Back to Decks
              </Button>
              <Button
                variant="outline"
                onClick={handleManageCards}
                className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
              >
                Manage Cards
              </Button>
            </div>
          </div>
          <FlashcardStudy
            deckId={selectedDeckId}
            onBackToDecks={handleBackToDecks}
            onFinish={handleFinishStudy}
          />
        </div>
      ) : (
        <FlashcardManager
          deckId={selectedDeckId}
          onBackToDecks={handleBackToDecks}
        />
      )}
    </div>
  );
};
