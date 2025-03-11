import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import FlashcardDecks from './FlashcardDecks';
import { FlashcardManager } from './FlashcardManager';
import { FlashcardStudy } from './FlashcardStudy';
import { FlashcardDeck } from '@/types';
import { useToast } from './ui/use-toast';
import { getDecksSummary } from '@/lib/flashcards';
import { supabase } from '../lib/supabase';

type View = 'decks' | 'study' | 'manage';

interface FlashcardsTabProps {
  flashcards: FlashcardDeck[];
  onAddDeck: (data: { name: string; description: string }) => void;
  onStudyDeck: (deckId: string) => void;
  onEditDeck: (deckId: string, data: { name: string; description: string }) => void;
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
  const [localDecks, setLocalDecks] = useState<FlashcardDeck[]>(flashcards);
  const [deckSummaries, setDeckSummaries] = useState<any[]>([]);
  const { toast } = useToast();

  // Update local decks when flashcards prop changes
  useEffect(() => {
    setLocalDecks(flashcards);
    refreshDeckMetrics();
  }, [flashcards]);

  // This function is used when a deck is selected from the decks list
  const handleSelectDeck = (deckId: string) => {
    setSelectedDeckId(deckId);
    setView('manage');
  };

  const handleBackToDecks = () => {
    setView('decks');
    setSelectedDeckId(null);
    refreshDeckMetrics();
  };

  const handleManageCards = () => {
    setView('manage');
  };

  const handleFinishStudy = () => {
    setView('decks');
    refreshDeckMetrics();
  };

  // Handle study deck - this is called when the study button is clicked
  const handleStudyDeck = (deckId: string) => {
    setSelectedDeckId(deckId);
    setView('study');
    // Pass the deckId to the parent's onStudyDeck handler
    onStudyDeck(deckId);
  };

  // Function to refresh deck metrics after reviews
  const refreshDeckMetrics = async () => {
    console.log('Refreshing deck metrics...');
    try {
      // First, fetch the updated deck summaries
      const summaries = await getDecksSummary();
      console.log('Fetched summaries:', summaries);
      
      // Update the deckSummaries state
      setDeckSummaries(summaries);
      
      // Then, fetch the latest decks data from the database
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        throw new Error('User not authenticated');
      }
      
      const { data: freshDecks, error } = await supabase
        .from('flashcard_decks')
        .select('id, name, description, created_at, user_id')
        .eq('user_id', userData.user.id);
        
      if (error) throw error;
      
      if (freshDecks) {
        console.log('Fetched fresh decks:', freshDecks);
        
        // Map the summaries to the fresh decks
        const updatedDecks = freshDecks.map(deck => {
          const summary = summaries.find(s => s.deckId === deck.id);
          if (summary) {
            return {
              ...deck,
              summary: {
                total: summary.total,
                dueToday: summary.dueToday,
                reviewStatus: summary.reviewStatus as 'not-started' | 'up-to-date' | 'due-soon' | 'overdue',
                lastStudied: summary.lastStudied || null,
                nextDue: summary.nextDue || null
              }
            };
          }
          return {
            ...deck,
            summary: {
              total: 0,
              dueToday: 0,
              reviewStatus: 'not-started' as const,
              lastStudied: null,
              nextDue: null
            }
          };
        });
        
        console.log('Setting updated decks:', updatedDecks);
        setLocalDecks(updatedDecks);
      }
    } catch (error) {
      console.error('Error refreshing deck metrics:', error);
      toast({
        title: "Error",
        description: "Failed to refresh deck metrics",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="w-full h-full">
      {view === 'decks' && (
        <FlashcardDecks 
          decks={localDecks}
          onSelectDeck={handleSelectDeck}
          onStudyDeck={handleStudyDeck}
          onEditDeck={onEditDeck}
          onDeleteDeck={onDeleteDeck}
          onAddDeck={onAddDeck}
          deckSummaries={deckSummaries}
          onRefreshMetrics={refreshDeckMetrics}
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
            onUpdateDeckMetrics={refreshDeckMetrics}
          />
        </div>
      )}
      {view === 'manage' && selectedDeckId && (
        <FlashcardManager
          deckId={selectedDeckId}
          onBackToDecks={handleBackToDecks}
          onUpdateDeckMetrics={refreshDeckMetrics}
        />
      )}
    </div>
  );
};
