import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { useToast } from './ui/use-toast';
import { ImagePlus, X } from 'lucide-react';
import { createFlashcard, uploadImage } from '../lib/flashcards';
import type { Flashcard } from '../types';

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

const initialFormData: FormData = {
  frontContent: '',
  backContent: '',
  frontImage: null,
  backImage: null,
  frontImagePreview: '',
  backImagePreview: ''
};

export const FlashcardManager = ({ deckId, onBackToDecks }: FlashcardManagerProps) => {
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const { toast } = useToast();

  const handleImageChange = (side: 'front' | 'back', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    setFormData(prev => ({
      ...prev,
      [`${side}Image`]: file,
      [`${side}ImagePreview`]: previewUrl
    }));
  };

  const handlePaste = (e: React.ClipboardEvent, side: 'front' | 'back') => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (!file) continue;

        const previewUrl = URL.createObjectURL(file);
        setFormData(prev => ({
          ...prev,
          [`${side}Image`]: file,
          [`${side}ImagePreview`]: previewUrl
        }));
        break;
      }
    }
  };

  const handleRemoveImage = (side: 'front' | 'back') => {
    if (formData[`${side}ImagePreview`]) {
      URL.revokeObjectURL(formData[`${side}ImagePreview`]);
    }
    
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
      
      // Cleanup preview URLs
      if (formData.frontImagePreview) URL.revokeObjectURL(formData.frontImagePreview);
      if (formData.backImagePreview) URL.revokeObjectURL(formData.backImagePreview);
      
      setFormData(initialFormData);
      
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

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <Button onClick={onBackToDecks}>Back to Decks</Button>
        <Button onClick={() => setIsCreating(true)}>Create New Card</Button>
      </div>

      <Dialog open={isCreating} onOpenChange={setIsCreating}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Create New Flashcard</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Front Content</Label>
                <Textarea
                  value={formData.frontContent}
                  onChange={(e) => setFormData(prev => ({ ...prev, frontContent: e.target.value }))}
                  onPaste={(e) => handlePaste(e, 'front')}
                  placeholder="Enter front content..."
                  className="min-h-[100px]"
                  required
                />
                <div className="flex items-center gap-4 mt-2">
                  <Label 
                    htmlFor="frontImage" 
                    className="cursor-pointer flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800"
                  >
                    <ImagePlus className="h-4 w-4" />
                    Add Image
                  </Label>
                  <input
                    id="frontImage"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleImageChange('front', e)}
                  />
                  {formData.frontImagePreview && (
                    <div className="relative">
                      <img
                        src={formData.frontImagePreview}
                        alt="Front preview"
                        className="h-20 w-20 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage('front')}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Back Content</Label>
                <Textarea
                  value={formData.backContent}
                  onChange={(e) => setFormData(prev => ({ ...prev, backContent: e.target.value }))}
                  onPaste={(e) => handlePaste(e, 'back')}
                  placeholder="Enter back content..."
                  className="min-h-[100px]"
                  required
                />
                <div className="flex items-center gap-4 mt-2">
                  <Label 
                    htmlFor="backImage" 
                    className="cursor-pointer flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800"
                  >
                    <ImagePlus className="h-4 w-4" />
                    Add Image
                  </Label>
                  <input
                    id="backImage"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleImageChange('back', e)}
                  />
                  {formData.backImagePreview && (
                    <div className="relative">
                      <img
                        src={formData.backImagePreview}
                        alt="Back preview"
                        className="h-20 w-20 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage('back')}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-4">
              <Button type="button" variant="outline" onClick={() => setIsCreating(false)}>
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={!formData.frontContent.trim() || !formData.backContent.trim()}
              >
                Create Card
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map(card => (
          <div key={card.id} className="p-4 border rounded-lg shadow">
            <div className="font-medium">Front:</div>
            <div className="mt-1">{card.front_content}</div>
            {card.front_image_url && (
              <img
                src={card.front_image_url}
                alt="Front"
                className="mt-2 max-h-32 w-auto object-contain rounded"
              />
            )}
            <div className="font-medium mt-4">Back:</div>
            <div className="mt-1">{card.back_content}</div>
            {card.back_image_url && (
              <img
                src={card.back_image_url}
                alt="Back"
                className="mt-2 max-h-32 w-auto object-contain rounded"
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
