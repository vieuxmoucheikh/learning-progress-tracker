import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { useToast } from './ui/use-toast';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from './ui/alert-dialog';
import { Plus, Trash2, Play, ImagePlus, X } from 'lucide-react';
import { createFlashcard, deleteFlashcard, uploadImage } from '../lib/flashcards';
import type { Flashcard } from '../types';
import { supabase } from '../lib/supabase';

interface FlashcardManagerProps {
  deckId: string;
  onBackToDecks: () => void;
}

interface FormData {
  frontContent: string;
  backContent: string;
  frontImage: File | null;
  backImage: File | null;
  frontImagePreview: string;
  backImagePreview: string;
}

const initialFormState: FormData = {
  frontContent: '',
  backContent: '',
  frontImage: null,
  backImage: null,
  frontImagePreview: '',
  backImagePreview: ''
};

export const FlashcardManager: React.FC<FlashcardManagerProps> = ({ deckId, onBackToDecks }) => {
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState<FormData>(initialFormState);
  const { toast } = useToast();

  useEffect(() => {
    loadCards();
  }, [deckId]);

  const loadCards = async () => {
    try {
      const { data, error } = await supabase
        .from('flashcards')
        .select('*')
        .eq('deck_id', deckId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCards(data || []);
    } catch (error) {
      console.error('Error loading cards:', error);
      toast({
        title: "Error",
        description: "Failed to load flashcards",
        variant: "destructive"
      });
    }
  };

  const handleImageChange = async (side: 'front' | 'back', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      toast({
        title: "Error",
        description: "Image size must be less than 5MB",
        variant: "destructive"
      });
      return;
    }

    const preview = URL.createObjectURL(file);
    setFormData(prev => ({
      ...prev,
      [`${side}Image`]: file,
      [`${side}ImagePreview`]: preview
    }));
  };

  const removeImage = (side: 'front' | 'back') => {
    setFormData(prev => ({
      ...prev,
      [`${side}Image`]: null,
      [`${side}ImagePreview`]: ''
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      let frontImageUrl = '';
      let backImageUrl = '';

      if (formData.frontImage) {
        try {
          frontImageUrl = await uploadImage(formData.frontImage);
        } catch (error) {
          console.error('Error uploading front image:', error);
          toast({
            title: "Error",
            description: "Failed to upload front image. Please try again.",
            variant: "destructive"
          });
          return;
        }
      }

      if (formData.backImage) {
        try {
          backImageUrl = await uploadImage(formData.backImage);
        } catch (error) {
          console.error('Error uploading back image:', error);
          toast({
            title: "Error",
            description: "Failed to upload back image. Please try again.",
            variant: "destructive"
          });
          return;
        }
      }

      const newCard = await createFlashcard({
        deckId,
        frontContent: formData.frontContent,
        backContent: formData.backContent,
        frontImageUrl,
        backImageUrl
      });

      setCards([newCard, ...cards]);
      setIsCreating(false);
      setFormData(initialFormState);
      
      toast({
        title: "Success",
        description: "Flashcard created successfully!"
      });
    } catch (error) {
      console.error('Error creating flashcard:', error);
      toast({
        title: "Error",
        description: "Failed to create flashcard. Please try again.",
        variant: "destructive"
      });
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

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Manage Flashcards</h2>
        <Button
          className="bg-blue-600 text-white hover:bg-blue-700"
          onClick={() => setIsCreating(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Card
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {cards.map((card) => (
          <div
            key={card.id}
            className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <div className="font-medium mb-2">Front:</div>
                <div className="text-gray-700 mb-4 whitespace-pre-wrap">
                  {card.front_content}
                </div>
                <div className="font-medium mb-2">Back:</div>
                <div className="text-gray-700 whitespace-pre-wrap">
                  {card.back_content}
                </div>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
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
                    <AlertDialogAction
                      onClick={() => handleDeleteCard(card.id)}
                      className="bg-red-600 text-white hover:bg-red-700"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
            
            {card.last_reviewed && (
              <div className="mt-4 text-sm text-gray-600">
                Last reviewed: {new Date(card.last_reviewed).toLocaleDateString()}
                {card.mastered && (
                  <span className="ml-2 text-green-600">(Mastered)</span>
                )}
                {!card.mastered && card.next_review && (
                  <span className="ml-2 text-blue-600">
                    (Next review: {new Date(card.next_review).toLocaleDateString()})
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {cards.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-600 mb-4">No flashcards yet. Create your first card to get started!</p>
          <Button
            className="bg-blue-600 text-white hover:bg-blue-700"
            onClick={() => setIsCreating(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add First Card
          </Button>
        </div>
      )}

      <Dialog open={isCreating} onOpenChange={setIsCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Flashcard</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <h3 className="text-lg font-medium mb-2">Front</h3>
              <Textarea
                placeholder="Front content"
                value={formData.frontContent}
                onChange={(e) => setFormData(prev => ({ ...prev, frontContent: e.target.value }))}
                required
              />
              <div className="flex items-center gap-4">
                <label className="cursor-pointer">
                  <Input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleImageChange('front', e)}
                  />
                  <div className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700">
                    <ImagePlus size={20} />
                    Add Image
                  </div>
                </label>
                {formData.frontImagePreview && (
                  <div className="relative">
                    <img
                      src={formData.frontImagePreview}
                      alt="Front preview"
                      className="h-20 w-20 object-cover rounded"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage('front')}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-2">Back</h3>
              <Textarea
                placeholder="Back content"
                value={formData.backContent}
                onChange={(e) => setFormData(prev => ({ ...prev, backContent: e.target.value }))}
                required
              />
              <div className="flex items-center gap-4">
                <label className="cursor-pointer">
                  <Input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleImageChange('back', e)}
                  />
                  <div className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700">
                    <ImagePlus size={20} />
                    Add Image
                  </div>
                </label>
                {formData.backImagePreview && (
                  <div className="relative">
                    <img
                      src={formData.backImagePreview}
                      alt="Back preview"
                      className="h-20 w-20 object-cover rounded"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage('back')}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsCreating(false)}>
                Cancel
              </Button>
              <Button
                className="bg-blue-600 text-white hover:bg-blue-700"
                onClick={handleSubmit}
                disabled={!formData.frontContent.trim() || !formData.backContent.trim()}
              >
                Create Card
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
