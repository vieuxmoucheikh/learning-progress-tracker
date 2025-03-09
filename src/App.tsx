import { useReducer, useEffect, useState, useMemo } from 'react';
import { AddLearningItem } from './components/AddLearningItem';
import { Stats } from './components/Stats';
import { Insights } from './components/Insights';
import { LearningInsights } from './components/LearningInsights';
import { StreakDisplay } from './components/StreakDisplay';
import { LearningItem, LearningItemFormData, FlashcardDeck } from '@/types';
import { Plus, LayoutDashboard, BookOpen, BarChart3, Timer, Notebook, Library, CalendarIcon } from 'lucide-react';
import { Calendar } from './components/Calendar';
import { getLearningItems, addLearningItem, updateLearningItem, deleteLearningItem, trackLearningActivity } from './lib/database';
import { useAuth } from './lib/auth';
import { TabNavigation } from './components/TabNavigation';
import { DashboardTab } from './components/DashboardTab';
import { ItemsTab } from './components/ItemsTab';
import { AnalyticsTab } from './components/AnalyticsTab';
import { Toaster } from "@/components/ui/toaster";
import { PomodoroTimer } from './components/pomodoro/PomodoroTimer';
import { LearningCardsPage } from './pages/LearningCards';
import { ThemeProvider } from './components/ThemeProvider';
import { ThemeToggle } from './components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { FlashcardsTab } from './components/FlashcardsTab';
import { createDeck } from './lib/flashcards';
import { supabase } from './lib/supabase';
import { toast } from '@/components/ui/use-toast';

interface State {
  items: LearningItem[];
  loading: boolean;
  activeItem: string | null;
  notes: { [key: string]: string };
  sessionNotes: { [key: string]: string[] };
}

type Action =
  | { type: 'LOAD_STATE'; payload: LearningItem[] }
  | { type: 'ADD_ITEM'; payload: LearningItem }
  | { type: 'UPDATE_ITEM'; payload: { id: string; updates: Partial<LearningItem> } }
  | { type: 'DELETE_ITEM'; payload: string }
  | { type: 'START_TRACKING'; payload: string }
  | { type: 'STOP_TRACKING'; payload: string }
  | { type: 'UPDATE_NOTES'; payload: { id: string; notes: string } }
  | { type: 'ADD_SESSION_NOTE'; payload: { id: string; note: string } }
  | { type: 'SET_ACTIVE_ITEM'; payload: string | null };

const TAB_OPTIONS = {
  DASHBOARD: 'dashboard',
  ITEMS: 'items',
  ANALYTICS: 'analytics',
  POMODORO: 'pomodoro',
  LEARNING_CARDS: 'learning-cards',
  FLASHCARDS: 'flashcards'
} as const;

const tabs = [
  { id: TAB_OPTIONS.DASHBOARD, label: 'Dashboard', icon: LayoutDashboard },
  { id: TAB_OPTIONS.ITEMS, label: 'Items', icon: BookOpen },
  { id: TAB_OPTIONS.ANALYTICS, label: 'Analytics', icon: BarChart3 },
  { id: TAB_OPTIONS.POMODORO, label: 'Pomodoro', icon: Timer },
  { id: TAB_OPTIONS.LEARNING_CARDS, label: 'Learning Cards', icon: Notebook },
  { id: TAB_OPTIONS.FLASHCARDS, label: 'Flashcards', icon: Library },
];

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'LOAD_STATE':
      // Only clean up sessions that are not in_progress or on_hold
      const cleanedItems = action.payload.map(item => {
        if (!item.progress?.sessions) return item;

        const cleanedSessions = item.progress.sessions.map(session => {
          // Only clean up sessions that are not in_progress or on_hold
          if (!session.endTime && session.status !== 'in_progress' && session.status !== 'on_hold') {
            return {
              ...session,
              endTime: new Date().toISOString(),
              status: 'completed' as const
            };
          }
          return session;
        });

        return {
          ...item,
          progress: {
            ...item.progress,
            sessions: cleanedSessions
          }
        };
      });

      // Clean up localStorage only for completed sessions
      cleanedItems.forEach(item => {
        const hasActiveOrPausedSession = item.progress?.sessions?.some(
          s => !s.endTime && (s.status === 'in_progress' || s.status === 'on_hold')
        );
        
        if (!hasActiveOrPausedSession) {
          localStorage.removeItem(`activeSession_${item.id}`);
          localStorage.removeItem(`sessionLastUpdate_${item.id}`);
          localStorage.removeItem(`sessionPauseTime_${item.id}`);
        }
      });

      // Find any active sessions and set them as the active item
      const activeSession = cleanedItems.find(item => 
        item.progress?.sessions?.some(s => !s.endTime && s.status === 'in_progress')
      );

      return {
        ...state,
        items: cleanedItems,
        loading: false,
        activeItem: activeSession?.id || null
      };

    case 'ADD_ITEM':
      return {
        ...state,
        items: [...state.items, action.payload],
      };

    case 'UPDATE_ITEM':
      return {
        ...state,
        items: state.items.map((item) =>
          item.id === action.payload.id
            ? { ...item, ...action.payload.updates }
            : item
        ),
      };

    case 'DELETE_ITEM':
      return {
        ...state,
        items: state.items.filter((item) => item.id !== action.payload),
        notes: { ...state.notes },
        sessionNotes: { ...state.sessionNotes },
        activeItem: state.activeItem === action.payload ? null : state.activeItem,
      };

    case 'START_TRACKING':
      const targetItem = state.items.find(item => item.id === action.payload);
      if (!targetItem?.progress) return state;

      // Check for existing active or paused sessions
      const hasActiveSession = targetItem.progress.sessions?.some(s => !s.endTime && s.status === 'in_progress');
      const hasPausedSession = targetItem.progress.sessions?.some(s => !s.endTime && s.status === 'on_hold');

      // Don't create a new session if there's already an active one or if we're resuming a paused one
      if (hasActiveSession || hasPausedSession) {
        return {
          ...state,
          activeItem: action.payload
        };
      }

      // Create new session only if there's no active or paused session
      const now = new Date();
      const newSession = {
        startTime: now.toISOString(),
        date: now.toISOString(),
        notes: [],
        status: 'in_progress' as const
      };

      return {
        ...state,
        items: state.items.map((item) =>
          item.id === action.payload
            ? {
                ...item,
                lastTimestamp: Date.now(),
                progress: {
                  ...item.progress,
                  sessions: [...(item.progress.sessions || []), newSession]
                }
              }
            : item
        ),
        activeItem: action.payload,
      };

    case 'STOP_TRACKING':
      const stoppingItem = state.items.find(item => item.id === action.payload);
      if (!stoppingItem?.progress) return state;

      // End all active sessions
      const updatedSessions = stoppingItem.progress.sessions.map(session => {
        if (!session.endTime) {
          const startTime = new Date(session.startTime);
          const now = new Date();
          const diffInMinutes = Math.floor((now.getTime() - startTime.getTime()) / (1000 * 60));

          return {
            ...session,
            endTime: now.toISOString(),
            status: 'completed' as const,
            duration: {
              hours: Math.floor(diffInMinutes / 60),
              minutes: diffInMinutes % 60
            }
          };
        }
        return session;
      });

      // Clean up localStorage
      localStorage.removeItem(`activeSession_${action.payload}`);
      localStorage.removeItem(`sessionLastUpdate_${action.payload}`);
      localStorage.removeItem(`sessionPauseTime_${action.payload}`);

      return {
        ...state,
        items: state.items.map((item) =>
          item.id === action.payload
            ? {
                ...item,
                lastTimestamp: null,
                progress: {
                  ...item.progress,
                  sessions: updatedSessions
                }
              }
            : item
        ),
        activeItem: null,
      };

    case 'UPDATE_NOTES':
      return {
        ...state,
        notes: {
          ...state.notes,
          [action.payload.id]: action.payload.notes,
        },
      };

    case 'ADD_SESSION_NOTE':
      return {
        ...state,
        sessionNotes: {
          ...state.sessionNotes,
          [action.payload.id]: [
            ...(state.sessionNotes[action.payload.id] || []),
            action.payload.note,
          ],
        },
      };

    case 'SET_ACTIVE_ITEM':
      return {
        ...state,
        activeItem: action.payload,
      };

    default:
      return state;
  }
}

const generateId = () => crypto.randomUUID();

// Helper function to get date string in YYYY-MM-DD format
const getDateStr = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function App() {
  const { user } = useAuth();
  const [state, dispatch] = useReducer(reducer, {
    items: [],
    loading: true,
    activeItem: null,
    notes: {},
    sessionNotes: {},
  });
  const [selectedTab, setSelectedTab] = useState<string>(TAB_OPTIONS.DASHBOARD);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'completed'>('all');
  const [flashcardDecks, setFlashcardDecks] = useState<FlashcardDeck[]>([]);
  const [flashcardsLoading, setFlashcardsLoading] = useState(false);

  const filteredItems = useMemo(() => {
    return state.items
      .filter(item => {
        const searchLower = searchQuery.toLowerCase();
        const matchesSearch =
          item.title.toLowerCase().includes(searchLower) ||
          item.category.toLowerCase().includes(searchLower) ||
          (item.notes?.toLowerCase() || '').includes(searchLower);

        // If a date is selected, only show items from that date
        const selectedDateStr = selectedDate ? getDateStr(selectedDate) : null;
        const itemDate = item.date ? getDateStr(new Date(item.date)) : null;
        const matchesDate = selectedDate ? itemDate === selectedDateStr : true;

        // Filter by status
        const matchesStatus =
          filterStatus === 'all' ? true :
          filterStatus === 'active' ? item.status !== 'completed' && item.status !== 'archived' :
          filterStatus === 'completed' ? item.status === 'completed' || item.status === 'archived' : true;

        return matchesSearch && matchesDate && matchesStatus;
      });
  }, [state.items, searchQuery, filterStatus, selectedDate]);

  useEffect(() => {
    let mounted = true;

    async function loadItems() {
      if (!user) {
        if (mounted) {
          dispatch({ type: 'LOAD_STATE', payload: [] });
        }
        return;
      }

      try {
        const items = await getLearningItems();
        if (mounted) {
          dispatch({ type: 'LOAD_STATE', payload: items });
          setError(null);
        }
      } catch (error) {
        console.error('Error loading items:', error);
        if (mounted) {
          dispatch({ type: 'LOAD_STATE', payload: [] });
          setError('Failed to load items. Please try again later.');
        }
      }
    }

    loadItems();

    return () => {
      mounted = false;
    };
  }, [user]);

  useEffect(() => {
    const activeItem = state.activeItem;
    if (!activeItem) return;

    const item = state.items.find(i => i.id === activeItem);
    if (!item?.progress?.sessions) return;

    const activeSession = item.progress.sessions.find(s => !s.endTime && s.status === 'in_progress');
    if (!activeSession) return;

    // Store active session info
    localStorage.setItem(`activeSession_${activeItem}`, JSON.stringify({
      startTime: activeSession.startTime,
      status: activeSession.status
    }));
    localStorage.setItem(`sessionLastUpdate_${activeItem}`, Date.now().toString());
  }, [state.activeItem, state.items]);

  useEffect(() => {
    const loadPersistedSessions = () => {
      state.items.forEach(item => {
        const persistedSession = localStorage.getItem(`activeSession_${item.id}`);
        if (persistedSession) {
          try {
            const session = JSON.parse(persistedSession);
            if (session.status === 'in_progress') {
              dispatch({ type: 'SET_ACTIVE_ITEM', payload: item.id });
            }
          } catch (e) {
            console.error('Error parsing persisted session:', e);
          }
        }
      });
    };

    if (!state.loading) {
      loadPersistedSessions();
    }
  }, [state.loading, state.items]);

  // Load flashcard decks
  useEffect(() => {
    const loadFlashcards = async () => {
      try {
        setFlashcardsLoading(true);
        const { data, error } = await supabase
          .from('flashcard_decks')
          .select('*');
        
        if (error) {
          console.error('Error loading flashcards:', error);
          return;
        }
        
        setFlashcardDecks(data || []);
      } catch (error) {
        console.error('Error loading flashcards:', error);
      } finally {
        setFlashcardsLoading(false);
      }
    };
    
    loadFlashcards();
  }, []);

  const handleAddItem = async (selectedDate?: Date | null) => {
    setShowAddDialog(true);
    if (selectedDate) {
      setSelectedDate(selectedDate);
    }
  };

  const handleSubmitItem = async (formData: LearningItemFormData) => {
    try {
      // Create a date string at midnight in local timezone
      const date = selectedDate ? selectedDate : new Date();
      const dateStr = getDateStr(date);

      // Create a clean form data object that matches LearningItemFormData
      const cleanFormData: LearningItemFormData = {
        title: formData.title,
        type: formData.type,
        current: formData.current || { hours: 0, minutes: 0 },
        unit: formData.unit || 'hours',
        url: formData.url || '',
        notes: formData.notes || '',
        completed: formData.completed || false,
        priority: formData.priority || 'medium',
        tags: formData.tags || [],
        goal: formData.goal,
        total: formData.total,
        category: formData.category || '',
        date: dateStr,
        difficulty: formData.difficulty || 'medium',
        status: formData.status || 'not_started'
      };

      const addedItem = await addLearningItem(cleanFormData);
      dispatch({ type: 'ADD_ITEM', payload: addedItem });
      setShowAddDialog(false);
    } catch (error) {
      console.error('Error adding item:', error);
      setError('Failed to add item. Please try again.');
    }
  };

  const handleUpdateItem = async (id: string, updates: Partial<LearningItem>) => {
    try {
      const item = state.items.find(item => item.id === id);
      if (!item) return;

      // If marking as completed
      if (updates.completed && !item.completed) {
        updates.completed_at = new Date('2025-01-03T11:07:05+01:00').toISOString();
        updates.status = 'completed' as const;
        
        // Track learning activity when completing an item
        const normalizedCategory = (item.category || 'Uncategorized').toUpperCase();
        console.log('Tracking activity for category:', { category: normalizedCategory });
        await trackLearningActivity(normalizedCategory);
      }

      // Update local state first for immediate feedback
      dispatch({ type: 'UPDATE_ITEM', payload: { id, updates } });

      const updatedItem = await updateLearningItem(id, updates);
      setError(null);
    } catch (error) {
      console.error('Error updating item:', error);
      setError('Failed to update item. Please try again.');
      // Revert the local state change on error
      const item = state.items.find(item => item.id === id);
      if (item) {
        dispatch({ type: 'UPDATE_ITEM', payload: { id, updates: item } });
      }
    }
  };

  const handleDeleteItem = async (id: string) => {
    try {
      await deleteLearningItem(id);
      dispatch({ type: 'DELETE_ITEM', payload: id });
      setError(null);
    } catch (error) {
      console.error('Error deleting item:', error);
      setError('Failed to delete item. Please try again.');
    }
  };

  const handleStartTracking = async (id: string) => {
    try {
      const item = state.items.find(item => item.id === id);
      if (!item) return;

      // Update local state first for immediate feedback
      dispatch({ type: 'START_TRACKING', payload: id });

      const currentTime = new Date();
      const updates: Partial<LearningItem> = {
        progress: {
          ...item.progress,
          lastAccessed: currentTime.toISOString(),
          sessions: [
            ...item.progress.sessions,
            {
              startTime: currentTime.toISOString(),
              date: currentTime.toISOString().split('T')[0]
            }
          ]
        }
      };

      await updateLearningItem(id, updates);
    } catch (error) {
      console.error('Error starting tracking:', error);
      setError('Failed to start tracking. Please try again.');
      // Revert the local state change on error
      dispatch({ type: 'STOP_TRACKING', payload: id });
    }
  };

  const handleStopTracking = async (id: string) => {
    try {
      const item = state.items.find(item => item.id === id);
      if (!item) return;

      // First update local state for immediate feedback
      dispatch({ type: 'STOP_TRACKING', payload: id });

      const currentTime = new Date();
      const lastSession = item.progress.sessions[item.progress.sessions.length - 1];

      if (!lastSession || !lastSession.startTime) return;

      const startTime = new Date(lastSession.startTime);
      const elapsedMinutes = Math.round((currentTime.getTime() - startTime.getTime()) / 60000);

      // Convert all times to minutes for accurate calculations
      const currentMinutes = (item.progress.current.hours * 60) + item.progress.current.minutes;
      const totalMinutes = item.progress.total ? (item.progress.total.hours * 60) + item.progress.total.minutes : 0;
      const newCurrentValue = currentMinutes + elapsedMinutes;
      const completed = totalMinutes > 0 && newCurrentValue >= totalMinutes;

      const updates: Partial<LearningItem> = {
        progress: {
          ...item.progress,
          current: {
            hours: Math.floor(newCurrentValue / 60),
            minutes: newCurrentValue % 60
          },
          total: item.progress.total || { hours: 0, minutes: 0 },
          lastAccessed: currentTime.toISOString(),
          sessions: [
            ...item.progress.sessions.slice(0, -1),
            {
              ...lastSession,
              endTime: currentTime.toISOString(),
              duration: {
                hours: Math.floor(elapsedMinutes / 60),
                minutes: elapsedMinutes % 60
              }
            }
          ]
        }
      };

      // Only update completion status if it's newly completed
      if (completed && !item.completed) {
        updates.completed = true;
        updates.completed_at = currentTime.toISOString();
        updates.status = 'completed' as const;
      }

      await updateLearningItem(id, updates);
    } catch (error) {
      console.error('Error stopping tracking:', error);
      setError('Failed to stop tracking. Please try again.');
      // Revert the local state change on error
      dispatch({ type: 'START_TRACKING', payload: id });
    }
  };

  const handleDateSelect = (date?: Date) => {
    if (date) {
      setSelectedDate(date);
    }
  };

  const handleUpdateNotes = (id: string, notes: string) => {
    dispatch({ type: 'UPDATE_NOTES', payload: { id, notes } });
  };

  const handleAddSessionNote = (id: string, note: string) => {
    dispatch({ type: 'ADD_SESSION_NOTE', payload: { id, note } });
  };

  const handleSetActiveItem = (id: string | null) => {
    dispatch({ type: 'SET_ACTIVE_ITEM', payload: id });
  };

  const handleDashboardUpdate = (id: string, updates: Partial<LearningItem>) => {
    handleUpdateItem(id, updates);
  };

  const handleDashboardAddItem = (date?: Date | null) => {
    if (date) {
      setSelectedDate(date);
    }
    setShowAddDialog(true);
  };

  const handleItemsAddItem = () => {
    setShowAddDialog(true);
  };

  const handleAddFlashcardDeck = async (data: { name: string; description: string }) => {
    try {
      const newDeck = await createDeck({
        name: data.name,
        description: data.description
      });
      
      // Update state with the new deck
      setFlashcardDecks(prev => [...prev, newDeck]);
      
      toast({
        title: "Success",
        description: "New deck created successfully",
      });
      
      return newDeck;
    } catch (error) {
      console.error('Error creating deck:', error);
      toast({
        title: "Error", 
        description: "Failed to create the deck",
        variant: "destructive"
      });
      throw error;
    }
  };

  const handleStudyFlashcardDeck = (deckId: string) => {
    // Navigate to study view or handle study mode
    const deck = flashcardDecks.find(d => d.id === deckId);
    if (deck) {
      setSelectedTab(TAB_OPTIONS.FLASHCARDS);
    }
  };

  const handleEditFlashcardDeck = (deckId: string) => {
    // Navigate to deck editing view
    console.log(`Editing deck: ${deckId}`);
    
    // Show a toast notification for better UX
    toast({
      title: "Edit Mode",
      description: `Now editing flashcard deck`,
    });
    
    // Additional logic for editing would go here
    // This could include setting state variables to track the current editing deck
    // and showing a different UI component for editing
  };

  const handleDeleteFlashcardDeck = async (deckId: string) => {
    try {
      // Delete the deck from database
      const { error } = await supabase
        .from('flashcard_decks')
        .delete()
        .eq('id', deckId);
      
      if (error) throw error;
      
      // Update state
      setFlashcardDecks(prev => prev.filter(deck => deck.id !== deckId));
      
      return true;
    } catch (error) {
      console.error('Error deleting deck:', error);
      toast({
        title: "Error",
        description: "Failed to delete the deck",
        variant: "destructive"
      });
      throw error;
    }
  };

  if (state.loading) {
    return (
      <ThemeProvider>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-gray-900 dark:border-gray-100"></div>
        </div>
      </ThemeProvider>
    );
  }

  if (error) {
    return (
      <ThemeProvider>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            >
              Retry
            </button>
          </div>
        </div>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
        {/* Header */}
        <header className="sticky top-0 z-20 bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-800">
          <div className="container mx-auto px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-500" />
              <h1 className="text-lg font-bold text-gray-900 dark:text-white">LearnFlow</h1>
            </div>
            
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button
                size="sm"
                variant="ghost"
                className="p-0 w-9 h-9 rounded-full"
                onClick={() => handleAddItem()}
              >
                <Plus className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Sidebar for larger screens */}
          <div className="hidden md:block w-64 p-4 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 overflow-y-auto">
            <div className="sticky top-4">
              <Calendar 
                items={state.items}
                onDateSelect={handleDateSelect}
                selectedDate={selectedDate}
              />
              
              {/* If you need date functionality, handle it within the app instead */}
            
              <div className="mt-4">
                <Button 
                  className="w-full justify-start"
                  onClick={() => handleAddItem()}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Learning Item
                </Button>
              </div>
            </div>
          </div>
          
          {/* Main content area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <TabNavigation
              activeTab={selectedTab}
              onTabChange={setSelectedTab}
              flashcards={flashcardDecks}
              onAddDeck={handleAddFlashcardDeck}
              onStudyDeck={handleStudyFlashcardDeck}
              onEditDeck={handleEditFlashcardDeck}
              onDeleteDeck={handleDeleteFlashcardDeck}
            />
            
            <div className="flex-1 overflow-y-auto pb-20 px-4 md:px-6">
              {selectedTab === TAB_OPTIONS.DASHBOARD && (
                <DashboardTab
                  items={filteredItems}
                  onUpdate={handleDashboardUpdate}
                  onDelete={handleDeleteItem}
                  onStartTracking={handleStartTracking}
                  onStopTracking={handleStopTracking}
                  onNotesUpdate={handleUpdateNotes}
                  onSetActiveItem={handleSetActiveItem}
                  onSessionNoteAdd={handleAddSessionNote}
                  onAddItem={handleDashboardAddItem}
                  onDateSelect={handleDateSelect}
                />
              )}

              {selectedTab === TAB_OPTIONS.ITEMS && (
                <ItemsTab
                  items={state.items}
                  onUpdate={handleUpdateItem}
                  onDelete={handleDeleteItem}
                  onAddItem={handleItemsAddItem}
                  onStartTracking={handleStartTracking}
                  onStopTracking={handleStopTracking}
                  onNotesUpdate={handleUpdateNotes}
                  onSetActiveItem={handleSetActiveItem}
                  onSessionNoteAdd={handleAddSessionNote}
                />
              )}

              {selectedTab === TAB_OPTIONS.ANALYTICS && (
                <AnalyticsTab items={state.items} />
              )}

              {selectedTab === TAB_OPTIONS.POMODORO && (
                <div className="flex flex-col items-center pt-8">
                  <PomodoroTimer onSessionComplete={() => {}} />
                </div>
              )}
            </div>
            
            {/* Mobile bottom bar with calendar button */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 p-3 flex justify-center">
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full max-w-xs"
                onClick={() => {
                  // Show a modal with calendar on mobile
                  // Implementation would depend on your UI library
                  alert("Calendar functionality would open here")
                }}
              >
                <CalendarIcon className="h-4 w-4 mr-2" />
                Select Date
              </Button>
            </div>
          </div>
        </main>
        <Toaster />
      </div>
    </ThemeProvider>
  );
}