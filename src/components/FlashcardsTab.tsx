import React, { useState } from 'react';
import { Button } from './ui/button';
import { FlashcardDecks } from './FlashcardDecks';
import { FlashcardManager } from './FlashcardManager';
import { FlashcardStudy } from './FlashcardStudy';

type View = 'decks' | 'manage' | 'study';

export const FlashcardsTab: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('decks');
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);

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
            onBackToDecks={handleBackToDecks}
          />
        )}
        {currentView === 'study' && selectedDeckId && (
          <FlashcardStudy
            deckId={selectedDeckId}
            onFinish={handleBackToManager}
            onBackToDecks={handleBackToDecks}
          />
        )}
      </div>
    </div>
  );
};
