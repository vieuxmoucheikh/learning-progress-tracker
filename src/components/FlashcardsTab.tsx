import React, { useState } from 'react';
import { Button } from './ui/button';
import { FlashcardDecks } from './FlashcardDecks';
import { FlashcardManager } from './FlashcardManager';
import { FlashcardStudy } from './FlashcardStudy';

type View = 'decks' | 'manage' | 'study';

export const FlashcardsTab: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('decks');
  const [selectedDeckId, setSelectedDeckId] = useState<string | undefined>();

  const handleDeckSelect = (deckId: string) => {
    setSelectedDeckId(deckId);
    setCurrentView('manage');
  };

  const handleStartStudying = () => {
    setCurrentView('study');
  };

  const handleBackToDecks = () => {
    setCurrentView('decks');
    setSelectedDeckId(undefined);
  };

  return (
    <div className="h-full">
      {currentView !== 'decks' && (
        <div className="p-4 border-b">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              onClick={handleBackToDecks}
            >
              ← Back to Decks
            </Button>
            {currentView === 'manage' && (
              <Button onClick={handleStartStudying}>
                Start Studying
              </Button>
            )}
            {currentView === 'study' && (
              <Button
                onClick={() => setCurrentView('manage')}
              >
                Manage Cards
              </Button>
            )}
          </div>
        </div>
      )}

      <div className="h-full overflow-y-auto">
        {currentView === 'decks' && (
          <FlashcardDecks onSelectDeck={handleDeckSelect} />
        )}
        {currentView === 'manage' && selectedDeckId && (
          <FlashcardManager deckId={selectedDeckId} />
        )}
        {currentView === 'study' && (
          <FlashcardStudy deckId={selectedDeckId} />
        )}
      </div>
    </div>
  );
};
