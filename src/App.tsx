import { useReducer, useEffect, useState, useMemo } from 'react';
import { AddLearningItem } from './components/AddLearningItem';
import { Stats } from './components/Stats';
import { Insights } from './components/Insights';
import { LearningInsights } from './components/LearningInsights';
import { StreakDisplay } from './components/StreakDisplay';
import { LearningItem, LearningItemFormData, FlashcardDeck } from '@/types';
import { Plus, LayoutDashboard, BookOpen, BarChart3, Timer, Notebook, Library } from 'lucide-react';
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

// Importer les fichiers CSS pour les améliorations visuelles
import './styles/critical-light-mode-fixes.css';
import './styles/global-ui-enhancements.css';
import './styles/card-fixes.css';
import './styles/universal-card-borders.css';
import './styles/flashcard-dark-mode-fixes.css';
import './styles/critical-card-borders.css'; // Ajout du fichier de correctifs critiques pour les bordures
import './styles/icon-fixes.css'; // Ajout du fichier de correctifs pour les icônes
import './styles/icon-override.css';
import './styles/critical-icon-fixes.css'; // Ajout du nouveau fichier de correctifs critiques
import './components/LearningItemCard.css';
import './components/Calendar.css';
import './components/StatusBadge.css';
import './components/PomodoroTimer.css';
import './styles/theme-transition.css'; // Importation des styles de transition

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
      
      // Extraire progress dans une constante pour que TypeScript sache qu'il est défini
      const targetProgress = targetItem.progress;

      // Check for existing active or paused sessions
      const hasActiveSession = targetProgress.sessions?.some(s => !s.endTime && s.status === 'in_progress');
      const hasPausedSession = targetProgress.sessions?.some(s => !s.endTime && s.status === 'on_hold');

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
                  ...targetProgress,
                  sessions: [...(targetProgress.sessions || []), newSession]
                }
              }
            : item
        ),
        activeItem: action.payload,
      };

    case 'STOP_TRACKING':
      const stoppingItem = state.items.find(item => item.id === action.payload);
      if (!stoppingItem?.progress) return state;
      
      // Extraire progress dans une constante pour que TypeScript sache qu'il est défini
      const stoppingProgress = stoppingItem.progress;
      
      // S'assurer que sessions existe
      const currentSessions = stoppingProgress.sessions || [];

      // End all active sessions
      const updatedSessions = currentSessions.map(session => {
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
                  ...stoppingProgress,
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

  // Add global styles to ensure dark mode works consistently
  useEffect(() => {
    // Create a style element
    const style = document.createElement('style');
    
    // Add CSS rules to ensure dark mode works properly
    style.textContent = `
      /* Force dark mode styles */
      .dark body, .dark #root, .dark [data-theme="dark"] {
        background-color: #0f172a !important;
        color: #f8fafc !important;
      }
      
      /* Force light mode styles */
      body:not(.dark), #root:not(.dark), [data-theme="light"] {
        background-color: #ffffff !important;
        color: #0f172a !important;
      }
      
      /* Fix for mobile dark backgrounds in light mode */
      @media (max-width: 768px) {
        body:not(.dark) .bg-gray-50, 
        body:not(.dark) .bg-gray-100,
        body:not(.dark) .bg-gray-200 {
          background-color: #ffffff !important;
        }
        
        /* Ensure text is visible on mobile in light mode */
        body:not(.dark) .text-gray-500,
        body:not(.dark) .text-gray-600,
        body:not(.dark) .text-gray-700 {
          color: #1e293b !important;
        }
        
        /* Ensure cards have proper background in light mode */
        body:not(.dark) .card,
        body:not(.dark) .bg-card {
          background-color: #ffffff !important;
          border-color: #e2e8f0 !important;
        }
      }
      
      /* Ensure Learning Insights calendar takes full width */
      .yearly-activity-heatmap-container {
        width: 100% !important;
        max-width: 100% !important;
        overflow-x: hidden !important;
      }
      
      .yearly-activity-grid {
        width: 100% !important;
        grid-template-columns: repeat(53, minmax(0, 1fr)) !important;
      }
      
      /* Improve navigation menu spacing */
      @media (min-width: 768px) {
        .tab-navigation {
          padding: 0.5rem !important;
          gap: 0.5rem !important;
        }
        
        .tab-navigation button {
          padding: 0.5rem 0.75rem !important;
          font-size: 0.875rem !important;
        }
      }
    `;
    
    // Append the style element to the document head
    document.head.appendChild(style);
    
    // Clean up function
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  useEffect(() => {
    // Create a style element
    const style = document.createElement('style');
    style.textContent = `
      /* ...existing code... */
      
      /* Amélioration de l'espace disponible pour la navigation */
      @media (min-width: 768px) {
        .tab-navigation {
          padding: 0 !important;
          gap: 0 !important;
        }
        
        .tab-navigation-container {
          min-height: 100vh;
          height: 100%;
          overflow-y: auto;
          scrollbar-width: none;
        }
        
        .tab-navigation-container::-webkit-scrollbar {
          display: none;
        }
      }
      
      /* Amélioration de la navigation mobile */
      @media (max-width: 767px) {
        .tab-navigation-container {
          position: sticky;
          top: 0;
          z-index: 40;
          padding-bottom: 0.5rem;
          width: 100%;
        }
        
        /* Corriger la hauteur du conteneur principal pour éviter le dépassement */
        .min-h-screen {
          min-height: calc(100vh - 60px);
        }
        
        /* S'assurer que le contenu est bien positionné sous le menu fixe */
        .flex-1 {
          padding-top: 0.5rem;
        }
      }
      
      /* ...existing code... */
    `;
    
    // Append the style element to the document head
    document.head.appendChild(style);
    
    // Clean up function
    return () => {
      document.head.removeChild(style);
    };
  }, []);

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

  const filteredItems = useMemo(() => {
    return state.items
      .filter(item => {
        const searchLower = searchQuery.toLowerCase();
        const matchesSearch =
          item.title.toLowerCase().includes(searchLower) ||
          (item.category ?? '').toLowerCase().includes(searchLower) ||
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

      // Si marking as completed
      if (updates.completed && !item.completed) {
        // Modifier cette partie pour utiliser uniquement les propriétés existantes 
        // et enlever completed_at qui n'existe pas dans l'interface
        updates.status = 'completed' as const;
        
        // Track learning activity when completing an item
        const normalizedCategory = (item.category ?? 'Uncategorized').toUpperCase();
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
      // Créer un objet progress par défaut si non défini
      const currentProgress = item.progress || { 
        current: { hours: 0, minutes: 0 }, 
        sessions: [] 
      };
      
      const updates: Partial<LearningItem> = {
        progress: {
          current: currentProgress.current || { hours: 0, minutes: 0 },
          total: currentProgress.total,
          sessions: [
            ...(currentProgress.sessions || []),
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
      
      // Créer un objet progress par défaut si non défini
      const currentProgress = item.progress || { 
        current: { hours: 0, minutes: 0 }, 
        sessions: [],
        total: { hours: 0, minutes: 0 }
      };
      
      // S'assurer que sessions est défini et obtenir le dernier élément s'il existe
      const sessions = currentProgress.sessions || [];
      if (sessions.length === 0) return; // Rien à faire s'il n'y a pas de sessions
      
      const lastSession = sessions[sessions.length - 1];

      if (!lastSession || !lastSession.startTime) return;

      const startTime = new Date(lastSession.startTime);
      const elapsedMinutes = Math.round((currentTime.getTime() - startTime.getTime()) / 60000);

      // Convert all times to minutes for accurate calculations
      const currentMinutes = (currentProgress.current?.hours || 0) * 60 + (currentProgress.current?.minutes || 0);
      const totalMinutes = currentProgress.total ? (currentProgress.total.hours * 60) + currentProgress.total.minutes : 0;
      const newCurrentValue = currentMinutes + elapsedMinutes;
      const completed = totalMinutes > 0 && newCurrentValue >= totalMinutes;

      const updates: Partial<LearningItem> = {
        progress: {
          current: {
            hours: Math.floor(newCurrentValue / 60),
            minutes: newCurrentValue % 60
          },
          total: currentProgress.total || { hours: 0, minutes: 0 },
          sessions: [
            ...sessions.slice(0, -1),
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

  const handleStudyFlashcardDeck = async (deckId: string) => {
    try {
      // Find the deck to study
      const deckToStudy = flashcardDecks.find(d => d.id === deckId);
      if (!deckToStudy) {
        toast({
          title: "Error",
          description: "Deck not found",
          variant: "destructive"
        });
        return;
      }
      
      // Fetch cards for this deck
      const { data: cards, error } = await supabase
        .from('flashcards')
        .select('*')
        .eq('deck_id', deckId);
      
      if (error) throw error;
      
      if (!cards || cards.length === 0) {
        toast({
          title: "No Cards",
          description: "This deck has no cards to study. Add some cards first!",
        });
        return;
      }
      
      // Set the selected tab to flashcards to ensure we're in the right view
      setSelectedTab(TAB_OPTIONS.FLASHCARDS);
      
      // The FlashcardsTab component will handle the navigation to study mode
      // We just need to pass the deckId through the onStudyDeck prop
      toast({
        title: "Study Mode",
        description: `Now studying deck: ${deckToStudy.name} (${cards.length} cards)`,
      });
    } catch (error) {
      console.error('Error starting study session:', error);
      toast({
        title: "Error",
        description: "Failed to start study session",
        variant: "destructive"
      });
    }
  };

  const handleEditFlashcardDeck = async (deckId: string, deckData: { name: string; description: string }) => {
    try {
      // Find the deck to edit in the current state
      const deckToEdit = flashcardDecks.find(d => d.id === deckId);
      if (!deckToEdit) {
        toast({
          title: "Error",
          description: "Deck not found",
          variant: "destructive"
        });
        return;
      }
      
      // Use raw SQL to update the deck
      const { error } = await supabase
        .from('flashcard_decks')
        .update({
          name: deckData.name,
          description: deckData.description || ''
        })
        .eq('id', deckId);
      
      if (error) throw error;
      
      // Refresh the decks list after update
      const { data: refreshedDecks, error: refreshError } = await supabase
        .from('flashcard_decks')
        .select('*');
      if (refreshError) throw refreshError;
      setFlashcardDecks(refreshedDecks || []);
      
      toast({
        title: "Success",
        description: "Deck updated successfully",
      });
    } catch (error) {
      console.error('Error updating deck:', error);
      toast({
        title: "Error",
        description: "Failed to update the deck",
        variant: "destructive"
      });
    }
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

  // Loading state render function
  if (state.loading) {
    return (
      <ThemeProvider>
        <div className="min-h-screen flex flex-col md:flex-row">
          <div className="md:w-64">
            <TabNavigation 
              activeTab={selectedTab} 
              onTabChange={setSelectedTab}
            />
          </div>
          <div className="flex-1 p-4 overflow-y-auto bg-white dark:bg-gray-900">
            <div className="container mx-auto py-4 h-full flex flex-col">
              <header className="mb-4">
                <div className="flex justify-end items-center gap-3">
                  <ThemeToggle />
                  <Button 
                    variant="default"
                    size="sm"
                    className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all"
                    onClick={() => handleDashboardAddItem()} 
                  >
                    <Plus className="h-4 w-4" /> Add Item
                  </Button>
                </div>
              </header>

              <div className="flex-1 overflow-auto">
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-400">Chargement...</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Add Learning Item Dialog */}
            {showAddDialog && (
              <AddLearningItem
                onAdd={handleSubmitItem}
                onClose={() => setShowAddDialog(false)}
                isOpen={showAddDialog}
                selectedDate={selectedDate}
              />
            )}
          </div>
          <Toaster />
        </div>
      </ThemeProvider>
    );
  }

  // Error state render function
  if (error) {
    return (
      <ThemeProvider>
        <div className="min-h-screen flex flex-col md:flex-row">
          <div className="md:w-64">
            <TabNavigation 
              activeTab={selectedTab} 
              onTabChange={setSelectedTab}
            />
          </div>
          <div className="flex-1 p-4 overflow-y-auto bg-white dark:bg-gray-900">
            <div className="container mx-auto px-4 py-4 h-screen flex flex-col bg-white dark:bg-gray-900">
              <header className="mb-4">
                <div className="flex justify-end items-center gap-3">
                  <ThemeToggle />
                  <Button 
                    variant="default"
                    size="sm"
                    className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all"
                    onClick={() => handleDashboardAddItem()} 
                  >
                    <Plus className="h-4 w-4" /> Add Item
                  </Button>
                </div>
              </header>

              <div className="flex-1 overflow-auto">
                <div className="h-full flex items-center justify-center">
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
              </div>
            </div>
            <Toaster />
          </div>
        </div>
      </ThemeProvider>
    );
  }

  // Main app render
  return (
    <ThemeProvider defaultTheme="dark">
      <div className="min-h-screen flex flex-col md:flex-row">
        <div className="md:w-64">
          <TabNavigation 
            activeTab={selectedTab} 
            onTabChange={setSelectedTab} 
          />
        </div>
        <div className="flex-1 p-4 md:p-6 overflow-y-auto bg-white dark:bg-gray-900">
          <div className="container mx-auto py-4 h-full flex flex-col">
            <header className="mb-6">
              <div className="flex justify-end items-center gap-3">
                <ThemeToggle />
                <Button 
                  variant="default"
                  size="sm"
                  className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all"
                  onClick={() => handleDashboardAddItem()} 
                >
                  <Plus className="h-4 w-4" /> Add Item
                </Button>
              </div>
            </header>

            <main className="flex-1 overflow-auto bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4 md:p-6">
              {selectedTab === TAB_OPTIONS.DASHBOARD && (
                <DashboardTab 
                  items={state.items}
                  onUpdate={handleDashboardUpdate}
                  onDelete={handleDeleteItem}
                  onStartTracking={handleStartTracking}
                  onStopTracking={handleStopTracking}
                  onNotesUpdate={handleUpdateNotes}
                  onSessionNoteAdd={handleAddSessionNote}
                  onSetActiveItem={handleSetActiveItem}
                  onAddItem={handleDashboardAddItem}
                  onDateSelect={handleDateSelect}
                />
              )}

              {selectedTab === TAB_OPTIONS.ITEMS && (
                <ItemsTab 
                  items={state.items}
                  onUpdate={handleUpdateItem}
                  onDelete={handleDeleteItem}
                  onStartTracking={handleStartTracking}
                  onStopTracking={handleStopTracking}
                  onNotesUpdate={handleUpdateNotes}
                  onSessionNoteAdd={handleAddSessionNote}
                  onSetActiveItem={handleSetActiveItem}
                  onAddItem={handleItemsAddItem}
                />
              )}

              {selectedTab === TAB_OPTIONS.ANALYTICS && (
                <AnalyticsTab items={state.items} />
              )}

              {selectedTab === TAB_OPTIONS.POMODORO && (
                <PomodoroTimer />
              )}
              
              {selectedTab === TAB_OPTIONS.LEARNING_CARDS && (
                <LearningCardsPage />
              )}

              {selectedTab === TAB_OPTIONS.FLASHCARDS && (
                <FlashcardsTab 
                  flashcards={flashcardDecks}
                  onAddDeck={handleAddFlashcardDeck}
                  onStudyDeck={handleStudyFlashcardDeck}
                  onEditDeck={handleEditFlashcardDeck}
                  onDeleteDeck={handleDeleteFlashcardDeck}
                />
              )}
            </main>
          </div>

          {/* Add Learning Item Dialog */}
          {showAddDialog && (
            <AddLearningItem
              onAdd={handleSubmitItem}
              onClose={() => setShowAddDialog(false)}
              isOpen={showAddDialog}
              selectedDate={selectedDate}
            />
          )}
          
          <Toaster />
        </div>
      </div>
    </ThemeProvider>
  );
}