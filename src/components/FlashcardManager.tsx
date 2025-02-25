import { useState, useEffect, useCallback } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { useToast } from './ui/use-toast';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from './ui/alert-dialog';
import { Plus, Trash2, Play } from 'lucide-react';
import { createFlashcard, deleteFlashcard } from '../lib/flashcards';
import type { Flashcard } from '../types';
import { supabase } from '../lib/supabase';

interface FlashcardManagerProps {
  deckId: string;
  onBackToDecks: () => void;
}

interface FlashcardFormData {
  front_content: string;
  back_content: string;
  back_images: string[];
}

export const FlashcardManager: React.FC<FlashcardManagerProps> = ({ deckId, onBackToDecks }) => {
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState<FlashcardFormData>({
    front_content: '',
    back_content: '',
    back_images: []
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadCards();
  }, []);

  const loadCards = async () => {
    try {
      const { data: cards, error } = await supabase
        .from('flashcards')
        .select('*')
        .eq('deck_id', deckId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCards(cards || []);
    } catch (error) {
      console.error('Error loading flashcards:', error);
      toast({
        title: "Error",
        description: "Failed to load flashcards",
        variant: "destructive"
      });
    }
  };

  const handleImagePaste = useCallback(async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf('image') === 0) {
        e.preventDefault();
        
        try {
          const file = item.getAsFile();
          if (!file) continue;

          // Check file size (5MB limit)
          if (file.size > 5 * 1024 * 1024) {
            toast({
              title: "Error",
              description: "Image size must be less than 5MB",
              variant: "destructive"
            });
            continue;
          }

          // Generate a unique filename
          const timestamp = new Date().getTime();
          const fileExt = file.type.split('/')[1];
          const filename = `flashcard_${deckId}_${timestamp}.${fileExt}`;

          // Upload to Supabase Storage
          const { data, error: uploadError } = await supabase.storage
            .from('flashcard_images')
            .upload(filename, file, {
              cacheControl: '3600',
              upsert: false
            });

          if (uploadError) throw uploadError;

          // Get the public URL
          const { data: { publicUrl } } = supabase.storage
            .from('flashcard_images')
            .getPublicUrl(filename);

          // Update form data with new image URL
          setFormData(prev => ({
            ...prev,
            back_images: [...prev.back_images, publicUrl]
          }));

          toast({
            title: "Success",
            description: "Image uploaded successfully",
          });
        } catch (error: any) {
          console.error('Error uploading image:', error);
          toast({
            title: "Error",
            description: error.message || "Failed to upload image",
            variant: "destructive"
          });
        }
      }
    }
  }, [deckId, toast]);

  const handleCreateCard = async () => {
    try {
      if (!formData.front_content.trim() || !formData.back_content.trim()) {
        toast({
          title: "Error",
          description: "Please fill in both front and back content",
          variant: "destructive"
        });
        return;
      }

      setIsSubmitting(true);
      const newCard = await createFlashcard(
        deckId,
        formData.front_content.trim(),
        formData.back_content.trim(),
        formData.back_images
      );

      setCards([newCard, ...cards]);
      setIsCreating(false);
      setFormData({ front_content: '', back_content: '', back_images: [] });
      
      toast({
        title: "Success",
        description: "Flashcard created successfully",
      });
    } catch (error) {
      console.error('Error creating flashcard:', error);
      toast({
        title: "Error",
        description: "Failed to create flashcard",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    try {
      await deleteFlashcard(cardId);
      setCards(cards.filter(card => card.id !== cardId));
      toast({
        title: "Success",
        description: "Flashcard deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting flashcard:', error);
      toast({
        title: "Error",
        description: "Failed to delete flashcard",
        variant: "destructive"
      });
    }
  };

  const handleDeleteImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      back_images: prev.back_images.filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <Button variant="outline" onClick={onBackToDecks}>
          Back to Decks
        </Button>
        {!isCreating && (
          <Button onClick={() => setIsCreating(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Card
          </Button>
        )}
      </div>

      {isCreating ? (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-medium mb-4">Create New Flashcard</h3>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Front</label>
              <Textarea
                value={formData.front_content}
                onChange={(e) => setFormData(prev => ({ ...prev, front_content: e.target.value }))}
                placeholder="Enter the front content"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Back</label>
              <Textarea
                value={formData.back_content}
                onChange={(e) => setFormData(prev => ({ ...prev, back_content: e.target.value }))}
                onPaste={handleImagePaste}
                placeholder="Enter the back content (Paste images here)"
                className="min-h-[100px]"
              />
              {formData.back_images.length > 0 && (
                <div className="mt-2 space-y-2">
                  <label className="block text-sm font-medium">Attached Images:</label>
                  <div className="grid grid-cols-2 gap-2">
                    {formData.back_images.map((url, index) => (
                      <div key={url} className="relative group">
                        <img 
                          src={url} 
                          alt={`Flashcard image ${index + 1}`}
                          className="w-full h-32 object-cover rounded-md"
                        />
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleDeleteImage(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsCreating(false)}>
                Cancel
              </Button>
              <Button
                className="bg-blue-600 text-white hover:bg-blue-700"
                onClick={handleCreateCard}
                disabled={!formData.front_content.trim() || !formData.back_content.trim() || isSubmitting}
              >
                Create Card
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {cards.map(card => (
            <div key={card.id} className="bg-white rounded-lg shadow p-6">
              <div className="mb-4">
                <div className="font-medium mb-2">Front</div>
                <div className="text-gray-700 whitespace-pre-wrap">
                  {card.front_content}
                </div>
              </div>
              <div className="mb-4">
                <div className="font-medium mb-2">Back</div>
                <div className="text-gray-700 whitespace-pre-wrap">
                  {card.back_content}
                </div>
                {card.back_images && card.back_images.length > 0 && (
                  <div className="mt-2 space-y-2">
                    <label className="block text-sm font-medium">Images:</label>
                    <div className="grid grid-cols-2 gap-2">
                      {card.back_images.map((url, index) => (
                        <div key={url} className="relative">
                          <img 
                            src={url} 
                            alt={`Flashcard image ${index + 1}`}
                            className="w-full h-32 object-cover rounded-md"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Flashcard</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete this flashcard? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDeleteCard(card.id)}>
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
