import { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { useToast } from './ui/use-toast';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from './ui/alert-dialog';
import { Plus, Trash2, Play, Image as ImageIcon } from 'lucide-react';
import { createFlashcard } from '../lib/flashcards';
import { uploadImage } from '../lib/storage';
import type { Flashcard } from '../types';
import { supabase } from '../lib/supabase';

interface FlashcardManagerProps {
  deckId: string;
  onBackToDecks: () => void;
}

export const FlashcardManager: React.FC<FlashcardManagerProps> = ({ deckId, onBackToDecks }) => {
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [filteredCards, setFilteredCards] = useState<Flashcard[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({ front: '', back: '' });
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadCards();
  }, [deckId]);

  useEffect(() => {
    const filtered = cards.filter(card => 
      card.front_content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      card.back_content.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredCards(filtered);
  }, [searchQuery, cards]);

  const loadCards = async () => {
    try {
      const { data, error } = await supabase
        .from('flashcards')
        .select('*')
        .eq('deck_id', deckId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCards(data || []);
      setFilteredCards(data || []);
    } catch (error) {
      console.error('Error loading cards:', error);
      toast({
        title: "Error",
        description: "Failed to load flashcards",
        variant: "destructive"
      });
    }
  };

  const handleCreateCard = async () => {
    try {
      if (!formData.front.trim() || !formData.back.trim()) {
        toast({
          title: "Error",
          description: "Please fill in both front and back content",
          variant: "destructive"
        });
        return;
      }

      // Prepare back content with any uploaded images
      let backContent = formData.back.trim();
      if (uploadedImages.length > 0) {
        // Add image tags to the back content
        uploadedImages.forEach(imageUrl => {
          backContent += `\n\n<img src="${imageUrl}" alt="Flashcard image" />`;
        });
      }

      const newCard = await createFlashcard(
        deckId,
        formData.front.trim(),
        backContent
      );

      setCards([newCard, ...cards]);
      setIsCreating(false);
      setFormData({ front: '', back: '' });
      setUploadedImages([]);
      
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
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      const imagePromises = Array.from(files).map(file => uploadImage(file));
      const imageUrls = await Promise.all(imagePromises);
      
      setUploadedImages(prev => [...prev, ...imageUrls]);
      
      toast({
        title: "Success",
        description: `${files.length} image(s) uploaded successfully`,
      });
    } catch (error) {
      console.error('Error uploading images:', error);
      toast({
        title: "Error",
        description: "Failed to upload images",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    try {
      const { error } = await supabase
        .from('flashcards')
        .delete()
        .eq('id', cardId)
        .order('created_at', { ascending: true });

      if (error) {
        throw error;
      }

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
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={onBackToDecks}
            className="flex items-center gap-2"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="lucide lucide-chevron-left"
            >
              <path d="m15 18-6-6 6-6"/>
            </svg>
            Back to Decks 
          </Button>
        </div>
        <Button onClick={() => setIsCreating(true)} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
          <Plus className="w-4 h-4 mr-2" /> Add Flashcard
        </Button>
      </div>

      <div className="relative">
        <Input
          type="text"
          placeholder="Search flashcards..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10"
        />
        <svg
          className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredCards.map((card) => (
          <div
            key={card.id}
            className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <div className="font-medium mb-2 text-gray-900 dark:text-gray-100">Front:</div>
                <div className="text-gray-700 dark:text-gray-300 mb-4 whitespace-pre-wrap">
                  {card.front_content}
                </div>
                <div className="font-medium mb-2 text-gray-900 dark:text-gray-100">Back:</div>
                <div 
                  className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{ 
                    __html: card.back_content
                      .replace(/<img/g, '<img class="max-w-full h-auto rounded-md my-2"')
                      .replace(/\n/g, '<br />') 
                  }}
                />
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

      {filteredCards.length === 0 && (
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Flashcard</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium">Front</label>
              <Textarea
                value={formData.front}
                onChange={(e) => setFormData(prev => ({ ...prev, front: e.target.value }))}
                placeholder="Enter the front content"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Back</label>
              <Textarea
                value={formData.back}
                onChange={(e) => setFormData(prev => ({ ...prev, back: e.target.value }))}
                placeholder="Enter the back content"
                className="mt-1"
              />
            </div>
            
            {/* Image upload section */}
            <div>
              <label className="text-sm font-medium">Images</label>
              <div className="mt-1 flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="flex items-center gap-2"
                >
                  <ImageIcon className="h-4 w-4" />
                  {isUploading ? 'Uploading...' : 'Add Images'}
                </Button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  accept="image/*"
                  multiple
                  className="hidden"
                />
                <span className="text-sm text-gray-500">
                  {uploadedImages.length > 0 && `${uploadedImages.length} image(s) added`}
                </span>
              </div>
              
              {/* Preview uploaded images */}
              {uploadedImages.length > 0 && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {uploadedImages.map((url, index) => (
                    <div key={index} className="relative group">
                      <img 
                        src={url} 
                        alt={`Uploaded ${index + 1}`} 
                        className="h-24 w-full object-cover rounded-md"
                      />
                      <button
                        type="button"
                        onClick={() => setUploadedImages(prev => prev.filter(item => item !== url))}
                        className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsCreating(false);
                  setUploadedImages([]);
                  setFormData({ front: '', back: '' });
                }}
              >
                Cancel
              </Button>
              <Button
                className="bg-blue-600 text-white hover:bg-blue-700"
                onClick={handleCreateCard}
                disabled={!formData.front.trim() || !formData.back.trim() || isUploading}
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
