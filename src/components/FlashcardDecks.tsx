import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { createDeck, getDecks } from '../lib/flashcards';
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

  useEffect(() => {
    loadDecks();
  }, []);

  const loadDecks = async () => {
    try {
      const fetchedDecks = await getDecks();
      setDecks(fetchedDecks);
    } catch (error) {
      console.error('Error loading decks:', error);
    }
  };

  const handleCreateDeck = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createDeck(formData.name, formData.description, formData.tags);
      setIsCreateDialogOpen(false);
      setFormData({ name: '', description: '', tags: [] });
      await loadDecks();
    } catch (error) {
      console.error('Error creating deck:', error);
    }
  };

  const handleTagInput = (value: string) => {
    const tags = value.split(',').map(tag => tag.trim()).filter(Boolean);
    setFormData(prev => ({ ...prev, tags }));
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
            </DialogHeader>
            <form onSubmit={handleCreateDeck} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
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
        {decks.map(deck => (
          <Card
            key={deck.id}
            className="p-6 cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => onSelectDeck(deck.id)}
          >
            <h3 className="text-xl font-semibold mb-2">{deck.name}</h3>
            {deck.description && (
              <p className="text-gray-600 mb-4">{deck.description}</p>
            )}
            <div className="flex justify-between items-center">
              <div className="flex space-x-2">
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
          </Card>
        ))}
      </div>
    </div>
  );
};
