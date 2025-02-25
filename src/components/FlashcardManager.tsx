import { useState, useEffect, useCallback } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { useToast } from './ui/use-toast';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from './ui/alert-dialog';
import { Plus, Trash2, Play, Image as ImageIcon } from 'lucide-react';
import { createFlashcard } from '../lib/flashcards';
import type { Flashcard } from '../types';
import { supabase } from '../lib/supabase';
import { useDropzone } from 'react-dropzone';
import { v4 as uuidv4 } from 'uuid';

interface FlashcardManagerProps {
  deckId: string;
  onBackToDecks: () => void;
}

export const FlashcardManager: React.FC<FlashcardManagerProps> = ({ deckId, onBackToDecks }) => {
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [filteredCards, setFilteredCards] = useState<Flashcard[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({ 
    front: '', 
    back: '', 
    backImage: null as string | null,
    imageFile: null as File | null 
  });
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

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const base64String = reader.result as string;
        setFormData(prev => ({
          ...prev,
          backImage: base64String,
          imageFile: file
        }));
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif']
    },
    maxFiles: 1,
    noClick: true,
    noKeyboard: true
  });

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    const imageItem = Array.from(items).find(item => item.type.startsWith('image'));
    if (imageItem) {
      const file = imageItem.getAsFile();
      if (file) onDrop([file]);
    }
  };

  const handleCreateCard = async () => {
    try {
      if (!formData.front.trim()) {
        toast({
          title: "Error",
          description: "Please fill in the front content",
          variant: "destructive"
        });
        return;
      }

      let backContent = formData.back.trim();
      
      // If there's an image file, upload it to Supabase Storage
      if (formData.imageFile) {
        const fileExt = formData.imageFile.name.split('.').pop();
        const fileName = `${uuidv4()}.${fileExt}`;
        const filePath = `flashcard-images/${fileName}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('flashcards')
          .upload(filePath, formData.imageFile);

        if (uploadError) throw uploadError;

        // Get the public URL for the uploaded image
        const { data: { publicUrl } } = supabase.storage
          .from('flashcards')
          .getPublicUrl(filePath);

        // Combine text and image URL in the back content
        backContent = JSON.stringify({
          text: formData.back.trim(),
          imageUrl: publicUrl
        });
      }

      const newCard = await createFlashcard(
        deckId,
        formData.front.trim(),
        backContent
      );

      setCards([newCard, ...cards]);
      setIsCreating(false);
      setFormData({ front: '', back: '', backImage: null, imageFile: null });
      
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
        {filteredCards.map((card) => {
          let backContent = card.back_content;
          let backImage = null;
          
          try {
            const parsedContent = JSON.parse(card.back_content);
            if (parsedContent.imageUrl) {
              backContent = parsedContent.text;
              backImage = parsedContent.imageUrl;
            }
          } catch (e) {
            // If parsing fails, use the content as is
          }

          return (
            <div
              key={card.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-md transition-shadow border border-gray-100 dark:border-gray-700"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="font-medium text-gray-900 dark:text-white mb-2">Front:</div>
                  <div className="text-gray-700 dark:text-gray-300 mb-4 whitespace-pre-wrap">
                    {card.front_content}
                  </div>
                  <div className="font-medium text-gray-900 dark:text-white mb-2">Back:</div>
                  <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {backContent}
                    {backImage && (
                      <div className="mt-2">
                        <img 
                          src={backImage} 
                          alt="Back content" 
                          className="max-h-48 rounded-lg object-contain"
                        />
                      </div>
                    )}
                  </div>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-600 hover:text-red-700 dark:text-red-500 dark:hover:text-red-600"
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
                <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                  Last reviewed: {new Date(card.last_reviewed).toLocaleDateString()}
                  {card.mastered && (
                    <span className="ml-2 text-green-600 dark:text-green-500">(Mastered)</span>
                  )}
                  {!card.mastered && card.next_review && (
                    <span className="ml-2 text-blue-600 dark:text-blue-500">
                      (Next review: {new Date(card.next_review).toLocaleDateString()})
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredCards.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-600 dark:text-gray-400 mb-4">No flashcards yet. Create your first card to get started!</p>
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
        <DialogContent className="bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-white">Create New Flashcard</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Front Content</label>
              <Input
                value={formData.front}
                onChange={(e) => setFormData({ ...formData, front: e.target.value })}
                placeholder="Enter front content"
                className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Back Content</label>
              <Textarea
                value={formData.back}
                onChange={(e) => setFormData({ ...formData, back: e.target.value })}
                placeholder="Enter back content"
                className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700 mb-2"
              />
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-4 transition-colors ${
                  isDragActive 
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                    : 'border-gray-300 dark:border-gray-600'
                }`}
                onPaste={handlePaste}
              >
                {formData.backImage ? (
                  <div className="relative group">
                    <img 
                      src={formData.backImage} 
                      alt="Back content" 
                      className="max-h-48 mx-auto rounded-lg"
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setFormData(prev => ({ ...prev, backImage: null, imageFile: null }));
                      }}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <div className="text-center">
                    <ImageIcon className="mx-auto h-8 w-8 text-gray-400 dark:text-gray-500 mb-2" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Paste an image or drag and drop
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setIsCreating(false);
                setFormData({ front: '', back: '', backImage: null, imageFile: null });
              }}
              className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreateCard}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
            >
              Create Flashcard
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
