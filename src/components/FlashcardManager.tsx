import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import ReactQuill from 'react-quill';
import { useToast } from './ui/use-toast';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from './ui/alert-dialog';
import { Plus, Trash2, ArrowLeft, Search, Tag, Info, Calendar, Clock, CheckCircle, Edit } from 'lucide-react';
import { createFlashcard } from '../lib/flashcards';
import type { Flashcard } from '../types';
import { supabase } from '../lib/supabase';
import { Badge } from './ui/badge';
import './flashcard.css';

interface FlashcardManagerProps {
  deckId: string;
  onBackToDecks: () => void;
  onUpdateDeckMetrics?: () => void;
  shouldOpenAddDialog?: boolean;
}

export const FlashcardManager: React.FC<FlashcardManagerProps> = ({ 
  deckId, 
  onBackToDecks,
  onUpdateDeckMetrics,
  shouldOpenAddDialog = false
}) => {
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [filteredCards, setFilteredCards] = useState<Flashcard[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({ front: '', back: '', tags: '' });
  const [showCardTips, setShowCardTips] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadCards();
  }, [deckId]);
  
  // Automatically open the add card dialog if shouldOpenAddDialog is true
  useEffect(() => {
    if (shouldOpenAddDialog) {
      setIsCreating(true);
    }
  }, [shouldOpenAddDialog]);

  useEffect(() => {
    const filtered = cards.filter(card => 
      card.front_content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      card.back_content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (card.tags && card.tags.some(tag => 
        tag.toLowerCase().includes(searchQuery.toLowerCase())
      ))
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
    if (!formData.front.trim() || !formData.back.trim()) {
      toast({
        title: "Error",
        description: "Both front and back content are required",
        variant: "destructive"
      });
      return;
    }

    try {
      // Process tags if provided
      const tagArray = formData.tags 
        ? formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
        : [];

      const newCard = await createFlashcard({
        deckId,
        frontContent: formData.front,
        backContent: formData.back,
        tags: tagArray
      });

      setCards([newCard, ...cards]);
      setFormData({ front: '', back: '', tags: '' });
      setIsCreating(false);
      
      // Immediately update deck metrics after adding a card
      if (onUpdateDeckMetrics) {
        setTimeout(() => {
          onUpdateDeckMetrics();
        }, 100); // Small delay to ensure the database has updated
      }
      
      toast({
        title: "Success",
        description: "Flashcard created successfully",
        variant: "default"
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
        .eq('id', cardId);

      if (error) throw error;

      setCards(cards.filter(card => card.id !== cardId));
      
      // Immediately update deck metrics after deleting a card
      if (onUpdateDeckMetrics) {
        setTimeout(() => {
          onUpdateDeckMetrics();
        }, 100);
      }
      
      toast({
        title: "Success",
        description: "Flashcard deleted successfully",
        variant: "default"
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

  // Format date for better readability
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else if (diffDays < 30) {
      return `${Math.floor(diffDays / 7)} weeks ago`;
    } else {
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-5xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <Button
          variant="outline"
          onClick={onBackToDecks}
          className="flex items-center gap-2 border-gray-200 dark:border-gray-700"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Decks
        </Button>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              type="text"
              placeholder="Search cards..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
            />
          </div>
          
          <Button
            onClick={() => setIsCreating(true)}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-sm hover:shadow-md transition-all"
          >
            <Plus className="h-4 w-4 mr-2" /> Add Card
          </Button>
        </div>
      </div>
      
      <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
          Flashcards
          <span className="text-sm font-normal text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
            {filteredCards.length} {filteredCards.length === 1 ? 'card' : 'cards'}
          </span>
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          {searchQuery ? `Showing cards matching "${searchQuery}"` : 'Manage your flashcards by adding, editing, or removing cards from this deck.'}
        </p>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md border border-blue-100 dark:border-blue-800 flex items-center gap-3">
            <div className="bg-blue-100 dark:bg-blue-800 p-2 rounded-full">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600 dark:text-blue-400"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>
            </div>
            <div>
              <div className="font-medium text-blue-800 dark:text-blue-300">Total Cards</div>
              <div className="text-blue-600 dark:text-blue-400">{cards.length}</div>
            </div>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-md border border-green-100 dark:border-green-800 flex items-center gap-3">
            <div className="bg-green-100 dark:bg-green-800 p-2 rounded-full">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-600 dark:text-green-400"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
            </div>
            <div>
              <div className="font-medium text-green-800 dark:text-green-300">Mastered</div>
              <div className="text-green-600 dark:text-green-400">{cards.filter(card => card.mastered).length}</div>
            </div>
          </div>
          <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-md border border-purple-100 dark:border-purple-800 flex items-center gap-3">
            <div className="bg-purple-100 dark:bg-purple-800 p-2 rounded-full">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-600 dark:text-purple-400"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
            </div>
            <div>
              <div className="font-medium text-purple-800 dark:text-purple-300">Due for Review</div>
              <div className="text-purple-600 dark:text-purple-400">{cards.filter(card => !card.mastered && card.next_review && new Date(card.next_review) <= new Date()).length}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {filteredCards.map(card => (
          <div 
            key={card.id} 
            className="bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-all p-6 border border-gray-200 dark:border-gray-700 group"
          >
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-1 space-y-4">
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
                    Front Side <span className="text-xs text-gray-500 dark:text-gray-400">(Question)</span>
                  </h3>
                  <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-md border border-gray-100 dark:border-gray-800 max-h-[250px] overflow-y-auto custom-scrollbar">
                    <div className="text-gray-700 dark:text-gray-300 flashcard-content">
                      <div dangerouslySetInnerHTML={{ __html: card.front_content }} />
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
                    Back Side <span className="text-xs text-gray-500 dark:text-gray-400">(Answer)</span>
                  </h3>
                  <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-md border border-gray-100 dark:border-gray-800 max-h-[300px] overflow-y-auto custom-scrollbar">
                    <div className="text-gray-700 dark:text-gray-300 flashcard-content">
                      <div dangerouslySetInnerHTML={{ __html: card.back_content }} />
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="md:w-64 space-y-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1 flex items-center gap-2">
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700/50 px-2 py-0.5 rounded">
                      Card ID: {card.id.substring(0, 8)}...
                    </span>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 h-8 w-8"
                      title="Edit Card"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 h-8 w-8"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Flashcard</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete this flashcard? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300">Cancel</AlertDialogCancel>
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
                </div>
                
                <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-md border border-gray-100 dark:border-gray-800 space-y-3 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-16 h-16 overflow-hidden">
                    {card.mastered && (
                      <div className="bg-green-500 text-white text-xs font-bold py-1 rotate-45 transform origin-bottom-right absolute top-0 right-0 w-32 text-center shadow-sm">
                        MASTERED
                      </div>
                    )}
                  </div>
                  <div className="flex items-start gap-2">
                    <Calendar className="h-4 w-4 text-gray-500 mt-0.5" />
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Created</div>
                      <div className="text-sm">{formatDate(card.created_at)}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-2">
                    <Clock className="h-4 w-4 text-gray-500 mt-0.5" />
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Last reviewed</div>
                      <div className="text-sm">{formatDate(card.last_reviewed)}</div>
                    </div>
                  </div>
                  
                  {card.mastered ? (
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Status</div>
                        <div className="text-sm text-green-600 dark:text-green-400">Mastered</div>
                      </div>
                    </div>
                  ) : card.next_review ? (
                    <div className="flex items-start gap-2">
                      <Clock className="h-4 w-4 text-blue-500 mt-0.5" />
                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Next review</div>
                        <div className="text-sm text-blue-600 dark:text-blue-400">
                          {formatDate(card.next_review)}
                        </div>
                      </div>
                    </div>
                  ) : null}
                  
                  {card.tags && card.tags.length > 0 && (
                    <div className="flex items-start gap-2">
                      <Tag className="h-4 w-4 text-gray-500 mt-0.5" />
                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Tags</div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {card.tags.map((tag, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredCards.length === 0 && (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
          {searchQuery ? (
            <>
              <div className="text-gray-400 mb-2">
                <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No matching cards found</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Try adjusting your search query or clear it to see all cards.
              </p>
              <Button
                variant="outline"
                onClick={() => setSearchQuery('')}
                className="border-gray-200 dark:border-gray-700"
              >
                Clear search
              </Button>
            </>
          ) : (
            <>
              <div className="text-gray-400 mb-2">
                <Plus className="h-12 w-12 mx-auto mb-4 opacity-50" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No flashcards yet</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Create your first card to get started with this deck!
              </p>
              <Button
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-sm hover:shadow-md transition-all"
                onClick={() => setIsCreating(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add First Card
              </Button>
            </>
          )}
        </div>
      )}

      <Dialog open={isCreating} onOpenChange={(open) => {
        if (!open) {
          setFormData({ front: '', back: '', tags: '' });
          setIsCreating(false);
        }
      }}>
        <DialogContent className="max-w-[90vw] md:max-w-3xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
          <DialogHeader>
            <DialogTitle>Create New Flashcard</DialogTitle>
            <DialogDescription className="flex items-center justify-between">
              <span>Add a new flashcard to your deck. Front side is the question, back side is the answer.</span>
              <Button 
                variant="outline" 
                size="sm" 
                className="flex items-center gap-1 border-gray-200 dark:border-gray-700" 
                onClick={() => setShowCardTips(!showCardTips)}
              >
                <Info className="h-4 w-4" />
                Tips
              </Button>
            </DialogDescription>
          </DialogHeader>
          
          {showCardTips && (
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-md mb-4 text-sm">
              <h4 className="font-medium mb-2 text-blue-800 dark:text-blue-300">Tips for effective flashcards:</h4>
              <ul className="list-disc pl-5 space-y-1 text-blue-700 dark:text-blue-400">
                <li>Keep questions clear and specific</li>
                <li>Use formatting to highlight important information</li>
                <li>Add images or code snippets when relevant</li>
                <li>Break complex topics into multiple cards</li>
                <li>Add tags to organize your cards by topic</li>
              </ul>
            </div>
          )}
          
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Front Side (Question)</h4>
              <div className="border border-gray-200 dark:border-gray-700 rounded-md">
                <ReactQuill
                  theme="snow"
                  value={formData.front}
                  onChange={(value) => setFormData({ ...formData, front: value })}
                  placeholder="Enter the question or prompt"
                  modules={{
                    toolbar: [
                      [{ 'header': [1, 2, 3, false] }],
                      ['bold', 'italic', 'underline', 'strike'],
                      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                      ['blockquote', 'code-block'],
                      ['link', 'image'],
                      ['clean']
                    ],
                  }}
                />
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Back Side (Answer)</h4>
              <div className="border border-gray-200 dark:border-gray-700 rounded-md">
                <ReactQuill
                  theme="snow"
                  value={formData.back}
                  onChange={(value) => setFormData({ ...formData, back: value })}
                  placeholder="Enter the answer or explanation"
                  modules={{
                    toolbar: [
                      [{ 'header': [1, 2, 3, false] }],
                      ['bold', 'italic', 'underline', 'strike'],
                      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                      ['blockquote', 'code-block'],
                      ['link', 'image'],
                      ['clean']
                    ],
                  }}
                />
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-medium flex items-center gap-1">
                <Tag className="h-4 w-4" /> Tags (optional)
              </h4>
              <Input
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                placeholder="Enter tags separated by commas (e.g., math, algebra, equations)"
                className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setFormData({ front: '', back: '', tags: '' });
                setIsCreating(false);
              }}
              className="border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreateCard}
              disabled={!formData.front.trim() || !formData.back.trim()}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-sm hover:shadow-md transition-all"
            >
              Create Card
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
