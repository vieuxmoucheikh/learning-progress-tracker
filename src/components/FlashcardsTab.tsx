import React, { useState } from 'react';
import { Button } from './ui/button';
import { FlashcardDecks } from './FlashcardDecks';
import { FlashcardManager } from './FlashcardManager';
import { FlashcardStudy } from './FlashcardStudy';

type View = 'decks' | 'study' | 'manage';

export const FlashcardsTab: React.FC = () => {
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);
  const [view, setView] = useState<View>('decks');

  const handleSelectDeck = (deckId: string) => {
    setSelectedDeckId(deckId);
    setView('manage');
  };

  const handleStudyDeck = (deckId: string) => {
    setSelectedDeckId(deckId);
    setView('study');
  };

  const handleBackToDecks = () => {
    setSelectedDeckId(null);
    setView('decks');
  };

  const handleFinishStudy = () => {
    setView('decks');
  };

  const handleManageCards = () => {
    setView('manage');
  };

  if (view === 'decks' || !selectedDeckId) {
    return (
      <FlashcardDecks 
        onSelectDeck={handleSelectDeck}
        onStudyDeck={handleStudyDeck}
      />
    );
  }

  if (view === 'study') {
    return (
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
        <div className="p-4">
          <FlashcardStudy
            deckId={selectedDeckId}
            onFinish={handleFinishStudy}
            onBackToDecks={handleBackToDecks}
          />
        </div>
      </div>
    );
  }

  return (
    <FlashcardManager
      deckId={selectedDeckId}
      onBackToDecks={handleBackToDecks}
    />
  );
};
