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
    return <FlashcardDecks onSelectDeck={handleSelectDeck} />;
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
        <div className="p-6">
          <FlashcardStudy
            deckId={selectedDeckId}
            onBackToDecks={handleBackToDecks}
            onFinish={handleFinishStudy}
          />
        </div>
      </div>
    );
  }

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
            onClick={() => setView('study')}
          >
            Study Cards
          </Button>
        </div>
      </div>
      <div className="p-6">
        <FlashcardManager
          deckId={selectedDeckId}
          onBackToDecks={handleBackToDecks}
        />
      </div>
    </div>
  );
};
