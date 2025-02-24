import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { FlashcardDecks } from './FlashcardDecks';
import { FlashcardManager } from './FlashcardManager';
import { FlashcardStudy } from './FlashcardStudy';

type View = 'decks' | 'manage' | 'study';

export const FlashcardsTab: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('decks');
  const [selectedDeckId, setSelectedDeckId] = useState<string | undefined>();
  const [selectedCard, setSelectedCard] = useState<any>();

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

  const handleBackToManager = () => {
    setCurrentView('manage');
  };

  const handleDeleteCard = (cardId: string) => {
    // implement delete card logic here
  };

  return (
    <div className="h-full">
      {currentView !== 'decks' && (
        <div className="p-4 border-b">
          <div className="flex items-center space-x-4">
            {currentView === 'manage' ? (
              <>
                <Button
                  variant="outline"
                  className="bg-blue-600 text-white hover:bg-blue-700"
                  onClick={handleBackToDecks}
                >
                  ← Back to Decks
                </Button>
                <Button
                  className="bg-blue-600 text-white hover:bg-blue-700"
                  onClick={handleStartStudying}
                >
                  Start Studying
                </Button>
              </>
            ) : (
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

      <div className="h-full overflow-y-auto">
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
