import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from './ui/dialog';
import { createDeck, getDecks, deleteDeck } from '../lib/flashcards';
import { useToast } from './ui/use-toast';
import type { FlashcardDeck } from '../types';

interface DeckFormData {
  name: string;
  description: string;
  tags: string[];
}

export const FlashcardDecks: React.FC<{
  onSelectDeck: (deckId: string) => void;
}> = ({ onSelectDeck }) => {
  const [decks, setDecks] = useState<FlashcardDeck[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [formData, setFormData] = useState<DeckFormData>({
    name: '',
    description: '',
    tags: []
  });
  const { toast } = useToast();

  useEffect(() => {
    loadDecks();
  }, []);

  const loadDecks = async () => {
    try {
      const fetchedDecks = await getDecks();
      setDecks(fetchedDecks);
    } catch (error) {
      console.error('Error loading decks:', error);
      toast({
        title: "Error",
        description: "Failed to load flashcard decks. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleCreateDeck = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!formData.name.trim()) {
        toast({
          title: "Error",
          description: "Please enter a deck name",
          variant: "destructive"
        });
        return;
      }

      await createDeck(formData.name, formData.description, formData.tags);
      setIsCreateDialogOpen(false);
      setFormData({ name: '', description: '', tags: [] });
      await loadDecks();
      
      toast({
        title: "Success",
        description: "Deck created successfully!",
      });
    } catch (error) {
      console.error('Error creating deck:', error);
      toast({
        title: "Error",
        description: "Failed to create deck. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleTagInput = (value: string) => {
    const tags = value.split(',').map(tag => tag.trim()).filter(Boolean);
    setFormData(prev => ({ ...prev, tags }));
  };

  const handleDeleteDeck = async (deckId: string) => {
    if (!window.confirm('Are you sure you want to delete this deck? This will also delete all cards in the deck.')) {
      return;
    }

    try {
      await deleteDeck(deckId);
      // Remove the deck from local state
      setDecks(decks.filter(deck => deck.id !== deckId));
    } catch (error) {
      console.error('Error deleting deck:', error);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Flashcard Decks</h2>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>Create New Deck</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Deck</DialogTitle>
              <DialogDescription>
                Create a new flashcard deck to organize your study materials.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateDeck} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter deck name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter deck description"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Tags (comma-separated)</label>
                <Input
                  value={formData.tags.join(', ')}
                  onChange={(e) => handleTagInput(e.target.value)}
                  placeholder="tag1, tag2, tag3"
                />
              </div>
              <Button type="submit" className="w-full">Create Deck</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {decks.length === 0 ? (
          <div className="col-span-full text-center py-8">
            <p className="text-gray-600">No flashcard decks yet. Create your first deck to get started!</p>
          </div>
        ) : (
          decks.map(deck => (
            <Card
              key={deck.id}
              className="p-6 cursor-pointer hover:shadow-lg transition-shadow"
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-semibold">{deck.name}</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-red-500 hover:text-red-700"
                  onClick={() => handleDeleteDeck(deck.id)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </Button>
              </div>
              {deck.description && (
                <p className="text-gray-600 mb-4">{deck.description}</p>
              )}
              <div className="flex justify-between items-center">
                <div className="flex flex-wrap gap-2">
                  {deck.tags.map(tag => (
                    <span
                      key={tag}
                      className="px-2 py-1 bg-gray-100 rounded-full text-xs"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="text-sm text-gray-600">
                  {deck.cardCount} cards
                </div>
              </div>
              <div className="flex justify-end mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onSelectDeck(deck.id)}
                >
                  Study
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};