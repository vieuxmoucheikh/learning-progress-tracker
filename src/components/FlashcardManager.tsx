import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Badge } from './ui/badge';
import ReactQuill from 'react-quill';
import { useToast } from './ui/use-toast';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from './ui/alert-dialog';
import { Plus, Trash2, ArrowLeft, Search, Tag, Info, Calendar, Clock, CheckCircle, Edit } from 'lucide-react';
import { createFlashcard } from '../lib/flashcards';
import type { Flashcard } from '../types';
import { supabase } from '../lib/supabase';
import 'react-quill/dist/quill.snow.css';
import './flashcard.css';
import '../styles/editor-dark-mode-fix.css';

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
  const [isEditing, setIsEditing] = useState(false);
  const [currentCardId, setCurrentCardId] = useState<string | null>(null);
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
  
  const handleUpdateCard = async () => {
    if (!currentCardId || !formData.front.trim() || !formData.back.trim()) {
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

      const { error } = await supabase
        .from('flashcards')
        .update({
          front_content: formData.front,
          back_content: formData.back,
          tags: tagArray
        })
        .eq('id', currentCardId);

      if (error) throw error;

      // Update the card in the local state
      const updatedCards = cards.map(card => {
        if (card.id === currentCardId) {
          return {
            ...card,
            front_content: formData.front,
            back_content: formData.back,
            tags: tagArray
          };
        }
        return card;
      });

      setCards(updatedCards);
      setFormData({ front: '', back: '', tags: '' });
      setCurrentCardId(null);
      setIsEditing(false);
      
      // Immediately update deck metrics after updating a card
      if (onUpdateDeckMetrics) {
        setTimeout(() => {
          onUpdateDeckMetrics();
        }, 100);
      }
      
      toast({
        title: "Success",
        description: "Flashcard updated successfully",
        variant: "default"
      });
    } catch (error) {
      console.error('Error updating flashcard:', error);
      toast({
        title: "Error",
        description: "Failed to update flashcard",
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
      return `In ${diffDays} days`;
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
              <div className="font-medium text-purple-800 dark:text-purple-300">Non-Mastered Cards</div>
              <div className="text-purple-600 dark:text-purple-400">{cards.length - cards.filter(card => card.mastered).length}</div>
              <div className="text-xs text-purple-500 dark:text-purple-400 mt-1">Cards that still need to be reviewed</div>
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
                  <div className="flex-1"></div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 h-8 w-8"
                      title="Edit Card"
                      onClick={() => {
                        setCurrentCardId(card.id);
                        setFormData({
                          front: card.front_content,
                          back: card.back_content,
                          tags: card.tags ? card.tags.join(', ') : ''
                        });
                        setIsEditing(true);
                      }}
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

      <Dialog open={isCreating || isEditing} onOpenChange={(open) => {
        if (!open) {
          setFormData({ front: '', back: '', tags: '' });
          setIsCreating(false);
          setIsEditing(false);
          setCurrentCardId(null);
        }
      }}>
        <DialogContent className="max-w-[95vw] md:max-w-4xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 p-0">
          <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle className="text-xl font-bold">{isEditing ? 'Edit Flashcard' : 'Create New Flashcard'}</DialogTitle>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="flex items-center gap-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200" 
                  onClick={() => setShowCardTips(!showCardTips)}
                >
                  <Info className="h-4 w-4" />
                  {showCardTips ? 'Hide Tips' : 'Show Tips'}
                </Button>
              </div>
              <DialogDescription className="mt-1">
                {isEditing ? 'Update your flashcard content and tags.' : 'Add a new flashcard to your deck. Front side is the question, back side is the answer.'}
              </DialogDescription>
            </DialogHeader>
          </div>
          
          {showCardTips && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-6 border-b border-blue-100 dark:border-blue-800">
              <h4 className="font-medium mb-3 text-blue-800 dark:text-blue-300 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>
                Tips for effective flashcards
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white dark:bg-gray-800 p-4 rounded-md border border-blue-100 dark:border-blue-800 shadow-sm">
                  <h5 className="font-medium text-blue-700 dark:text-blue-300 mb-2">Content Structure</h5>
                  <ul className="list-disc pl-5 space-y-1 text-blue-700 dark:text-blue-400 text-sm">
                    <li>Keep questions clear and specific</li>
                    <li>Use formatting to highlight important information</li>
                    <li>Break complex topics into multiple cards</li>
                    <li>Use the Feynman technique: explain concepts simply</li>
                  </ul>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-md border border-blue-100 dark:border-blue-800 shadow-sm">
                  <h5 className="font-medium text-blue-700 dark:text-blue-300 mb-2">Media & Organization</h5>
                  <ul className="list-disc pl-5 space-y-1 text-blue-700 dark:text-blue-400 text-sm">
                    <li>Add images or code snippets when relevant</li>
                    <li>Use tags to organize your cards by topic</li>
                    <li>Create connections between related concepts</li>
                    <li>Review cards regularly for better retention</li>
                  </ul>
                </div>
              </div>
              <div className="mt-4 text-sm text-blue-600 dark:text-blue-400 italic">
                <strong>Pro tip:</strong> For code examples, use the code-block button in the editor toolbar to format them properly.
              </div>
            </div>
          )}
          
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <div className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs">Q</div>
                    Front Side (Question)
                  </h4>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {formData.front ? formData.front.replace(/<[^>]*>/g, '').length : 0} characters
                  </div>
                </div>
                <div className="border border-gray-200 dark:border-gray-700 rounded-md shadow-sm">
                  <div className="dark:bg-gray-800 dark:text-white">
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
                      className="min-h-[200px] dark:text-white"
                      style={{
                        '--ql-toolbar-bg': 'var(--gray-800)',
                        '--ql-toolbar-color': 'white',
                      } as React.CSSProperties}
                    />
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 italic">
                    Good questions are clear, specific, and focus on a single concept.
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <div className="bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs">A</div>
                    Back Side (Answer)
                  </h4>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {formData.back ? formData.back.replace(/<[^>]*>/g, '').length : 0} characters
                  </div>
                </div>
                <div className="border border-gray-200 dark:border-gray-700 rounded-md shadow-sm">
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
                    className="min-h-[200px]"
                  />
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 italic">
                  Good answers are comprehensive but concise, with key points highlighted.
                </div>
              </div>
            </div>
            
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="space-y-3">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Tag className="h-4 w-4 text-purple-500" /> 
                  Tags (optional)
                </h4>
                <Input
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="Enter tags separated by commas (e.g., math, algebra, equations)"
                  className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm"
                />
                <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>
                  Tags help organize your cards and make them easier to find later.
                </div>
                
                {formData.tags && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {formData.tags.split(',').map((tag, index) => (
                      tag.trim() && (
                        <Badge key={index} variant="outline" className="bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800">
                          {tag.trim()}
                        </Badge>
                      )
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="sticky bottom-0 z-10 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500"></div>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {!formData.front.trim() || !formData.back.trim() ? 'Both question and answer are required' : 'Ready to save'}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                onClick={() => {
                  setFormData({ front: '', back: '', tags: '' });
                  setIsCreating(false);
                  setIsEditing(false);
                  setCurrentCardId(null);
                }}
                className="border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                Cancel
              </Button>
              <Button 
                onClick={isEditing ? handleUpdateCard : handleCreateCard}
                disabled={!formData.front.trim() || !formData.back.trim()}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-sm hover:shadow-md transition-all px-6"
              >
                {isEditing ? 'Update Card' : 'Create Card'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
