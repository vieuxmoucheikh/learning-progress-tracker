import React, { useState } from 'react';
import { Button } from './ui/button';
import { FlashcardDecks } from './FlashcardDecks';
import { FlashcardManager } from './FlashcardManager';
import { FlashcardStudy } from './FlashcardStudy';
import { FlashcardDeck } from '@/types';

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

  // This function is used when a deck is selected from the decks list
  const handleSelectDeck = (deckId: string) => {
    setSelectedDeckId(deckId);
    setView('manage');
  };

  const handleBackToDecks = () => {
    setView('decks');
    setSelectedDeckId(null);
  };

  const handleManageCards = () => {
    setView('manage');
  };

  const handleFinishStudy = () => {
    setView('decks');
  };

  return (
    <div className="w-full h-full">
      {view === 'decks' && (
        <FlashcardDecks 
          decks={flashcards}
          onSelectDeck={handleSelectDeck}
          onStudyDeck={onStudyDeck}
          onEditDeck={onEditDeck}
          onDeleteDeck={onDeleteDeck}
          onAddDeck={onAddDeck}
        />
      )}
      {view === 'study' && selectedDeckId && (
        <div className="h-full">
          <div className="flex justify-between items-center p-4 border-b">
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleBackToDecks}
              >
                Back to Decks
              </Button>
              <Button
                variant="outline"
                onClick={handleManageCards}
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
      )}
      {view === 'manage' && selectedDeckId && (
        <FlashcardManager
          deckId={selectedDeckId}
          onBackToDecks={handleBackToDecks}
        />
      )}
    </div>
  );
};
