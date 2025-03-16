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
import { fixSvgIcons } from './lib/icon-fixer'; // Import le script de correction d'icônes

// Importer les fichiers CSS pour les améliorations visuelles
import './styles/critical-light-mode-fixes.css';
import './styles/global-ui-enhancements.css';
import './styles/responsive-fixes.css';
import './styles/card-fixes.css';
import './styles/universal-card-borders.css';
import './styles/critical-card-borders.css'; // Ajout du fichier de correctifs critiques pour les bordures
import './styles/icon-fixes.css'; // Ajout du fichier de correctifs pour les icônes
import './styles/icon-override.css';
import './styles/critical-icon-fixes.css'; // Ajout du nouveau fichier de correctifs critiquesout du fichier de correctifs spécifiques pour les SVG
import './components/LearningItemCard.css';-fix.css'; // AJOUT DU CORRECTIF D'URGENCE POUR LES ICÔNES SVG
import './components/Calendar.css';css';
import './components/StatusBadge.css';
import './components/PomodoroTimer.css';import './components/StatusBadge.css';
nts/PomodoroTimer.css';
interface State {
  items: LearningItem[];
  loading: boolean;
  activeItem: string | null;
  notes: { [key: string]: string };
  sessionNotes: { [key: string]: string[] }; notes: { [key: string]: string };
}  sessionNotes: { [key: string]: string[] };

type Action =
  | { type: 'LOAD_STATE'; payload: LearningItem[] }
  | { type: 'ADD_ITEM'; payload: LearningItem }
  | { type: 'UPDATE_ITEM'; payload: { id: string; updates: Partial<LearningItem> } }m }
  | { type: 'DELETE_ITEM'; payload: string }g; updates: Partial<LearningItem> } }
  | { type: 'START_TRACKING'; payload: string }
  | { type: 'STOP_TRACKING'; payload: string }
  | { type: 'UPDATE_NOTES'; payload: { id: string; notes: string } }
  | { type: 'ADD_SESSION_NOTE'; payload: { id: string; note: string } }: string } }
  | { type: 'SET_ACTIVE_ITEM'; payload: string | null };  | { type: 'ADD_SESSION_NOTE'; payload: { id: string; note: string } }
VE_ITEM'; payload: string | null };
const TAB_OPTIONS = {
  DASHBOARD: 'dashboard', = {
  ITEMS: 'items',
  ANALYTICS: 'analytics',
  POMODORO: 'pomodoro',
  LEARNING_CARDS: 'learning-cards',
  FLASHCARDS: 'flashcards'CARDS: 'learning-cards',
} as const;  FLASHCARDS: 'flashcards'

const tabs = [
  { id: TAB_OPTIONS.DASHBOARD, label: 'Dashboard', icon: LayoutDashboard },
  { id: TAB_OPTIONS.ITEMS, label: 'Items', icon: BookOpen },ard },
  { id: TAB_OPTIONS.ANALYTICS, label: 'Analytics', icon: BarChart3 },
  { id: TAB_OPTIONS.POMODORO, label: 'Pomodoro', icon: Timer },
  { id: TAB_OPTIONS.LEARNING_CARDS, label: 'Learning Cards', icon: Notebook },
  { id: TAB_OPTIONS.FLASHCARDS, label: 'Flashcards', icon: Library },{ id: TAB_OPTIONS.LEARNING_CARDS, label: 'Learning Cards', icon: Notebook },
];  { id: TAB_OPTIONS.FLASHCARDS, label: 'Flashcards', icon: Library },

function reducer(state: State, action: Action): State {
  switch (action.type) {: State, action: Action): State {
    case 'LOAD_STATE':
      // Only clean up sessions that are not in_progress or on_hold
      const cleanedItems = action.payload.map(item => {ogress or on_hold
        if (!item.progress?.sessions) return item;      const cleanedItems = action.payload.map(item => {

        const cleanedSessions = item.progress.sessions.map(session => {
          // Only clean up sessions that are not in_progress or on_hold
          if (!session.endTime && session.status !== 'in_progress' && session.status !== 'on_hold') {ean up sessions that are not in_progress or on_hold
            return {dTime && session.status !== 'in_progress' && session.status !== 'on_hold') {
              ...session,
              endTime: new Date().toISOString(),
              status: 'completed' as constendTime: new Date().toISOString(),
            };   status: 'completed' as const
          }
          return session;
        });          return session;

        return {
          ...item,
          progress: {
            ...item.progress,
            sessions: cleanedSessions ...item.progress,
          }  sessions: cleanedSessions
        }; }
      });        };

      // Clean up localStorage only for completed sessions
      cleanedItems.forEach(item => {
        const hasActiveOrPausedSession = item.progress?.sessions?.some(
          s => !s.endTime && (s.status === 'in_progress' || s.status === 'on_hold')nst hasActiveOrPausedSession = item.progress?.sessions?.some(
        );  s => !s.endTime && (s.status === 'in_progress' || s.status === 'on_hold')
        
        if (!hasActiveOrPausedSession) {
          localStorage.removeItem(`activeSession_${item.id}`);
          localStorage.removeItem(`sessionLastUpdate_${item.id}`);
          localStorage.removeItem(`sessionPauseTime_${item.id}`); localStorage.removeItem(`sessionLastUpdate_${item.id}`);
        } localStorage.removeItem(`sessionPauseTime_${item.id}`);
      });        }

      // Find any active sessions and set them as the active item
      const activeSession = cleanedItems.find(item => 
        item.progress?.sessions?.some(s => !s.endTime && s.status === 'in_progress')nst activeSession = cleanedItems.find(item => 
      );        item.progress?.sessions?.some(s => !s.endTime && s.status === 'in_progress')

      return {
        ...state,
        items: cleanedItems,
        loading: false,
        activeItem: activeSession?.id || nullloading: false,
      };        activeItem: activeSession?.id || null

    case 'ADD_ITEM':
      return {M':
        ...state,
        items: [...state.items, action.payload],...state,
      };        items: [...state.items, action.payload],

    case 'UPDATE_ITEM':
      return {ITEM':
        ...state,
        items: state.items.map((item) =>
          item.id === action.payload.id
            ? { ...item, ...action.payload.updates }=== action.payload.id
            : item  ? { ...item, ...action.payload.updates }
        ),    : item
      };        ),

    case 'DELETE_ITEM':
      return {ITEM':
        ...state,
        items: state.items.filter((item) => item.id !== action.payload),
        notes: { ...state.notes },.id !== action.payload),
        sessionNotes: { ...state.sessionNotes },
        activeItem: state.activeItem === action.payload ? null : state.activeItem,sessionNotes: { ...state.sessionNotes },
      };        activeItem: state.activeItem === action.payload ? null : state.activeItem,

    case 'START_TRACKING':
      const targetItem = state.items.find(item => item.id === action.payload);
      if (!targetItem?.progress) return state;      const targetItem = state.items.find(item => item.id === action.payload);

      // Check for existing active or paused sessions
      const hasActiveSession = targetItem.progress.sessions?.some(s => !s.endTime && s.status === 'in_progress');
      const hasPausedSession = targetItem.progress.sessions?.some(s => !s.endTime && s.status === 'on_hold');      const hasActiveSession = targetItem.progress.sessions?.some(s => !s.endTime && s.status === 'in_progress');
hold');
      // Don't create a new session if there's already an active one or if we're resuming a paused one
      if (hasActiveSession || hasPausedSession) {reate a new session if there's already an active one or if we're resuming a paused one
        return {Session || hasPausedSession) {
          ...state,
          activeItem: action.payload...state,
        };   activeItem: action.payload
      }        };

      // Create new session only if there's no active or paused session
      const now = new Date();n only if there's no active or paused session
      const newSession = {
        startTime: now.toISOString(),
        date: now.toISOString(), now.toISOString(),
        notes: [],
        status: 'in_progress' as constnotes: [],
      };        status: 'in_progress' as const

      return {
        ...state,
        items: state.items.map((item) =>
          item.id === action.payloadstate.items.map((item) =>
            ? {tion.payload
                ...item,
                lastTimestamp: Date.now(),
                progress: {.now(),
                  ...item.progress,
                  sessions: [...(item.progress.sessions || []), newSession] ...item.progress,
                }   sessions: [...(item.progress.sessions || []), newSession]
              }
            : item    }
        ),
        activeItem: action.payload,),
      };        activeItem: action.payload,

    case 'STOP_TRACKING':
      const stoppingItem = state.items.find(item => item.id === action.payload);
      if (!stoppingItem?.progress) return state;      const stoppingItem = state.items.find(item => item.id === action.payload);
s) return state;
      // End all active sessions
      const updatedSessions = stoppingItem.progress.sessions.map(session => {s
        if (!session.endTime) {ions.map(session => {
          const startTime = new Date(session.startTime);
          const now = new Date();
          const diffInMinutes = Math.floor((now.getTime() - startTime.getTime()) / (1000 * 60));          const now = new Date();
ffInMinutes = Math.floor((now.getTime() - startTime.getTime()) / (1000 * 60));
          return {
            ...session,
            endTime: now.toISOString(),
            status: 'completed' as const,w.toISOString(),
            duration: {
              hours: Math.floor(diffInMinutes / 60),
              minutes: diffInMinutes % 60 hours: Math.floor(diffInMinutes / 60),
            }  minutes: diffInMinutes % 60
          };   }
        }
        return session;
      });        return session;

      // Clean up localStorage
      localStorage.removeItem(`activeSession_${action.payload}`);
      localStorage.removeItem(`sessionLastUpdate_${action.payload}`);
      localStorage.removeItem(`sessionPauseTime_${action.payload}`);      localStorage.removeItem(`sessionLastUpdate_${action.payload}`);
rage.removeItem(`sessionPauseTime_${action.payload}`);
      return {
        ...state,
        items: state.items.map((item) =>
          item.id === action.payloadstate.items.map((item) =>
            ? {tion.payload
                ...item,
                lastTimestamp: null,
                progress: {,
                  ...item.progress,
                  sessions: updatedSessions ...item.progress,
                }   sessions: updatedSessions
              }
            : item    }
        ),
        activeItem: null,),
      };        activeItem: null,

    case 'UPDATE_NOTES':
      return {NOTES':
        ...state,
        notes: {
          ...state.notes,
          [action.payload.id]: action.payload.notes,...state.notes,
        },  [action.payload.id]: action.payload.notes,
      };        },

    case 'ADD_SESSION_NOTE':
      return {SION_NOTE':
        ...state,
        sessionNotes: {
          ...state.sessionNotes,
          [action.payload.id]: [
            ...(state.sessionNotes[action.payload.id] || []),
            action.payload.note,...(state.sessionNotes[action.payload.id] || []),
          ],  action.payload.note,
        },  ],
      };        },

    case 'SET_ACTIVE_ITEM':
      return {IVE_ITEM':
        ...state,
        activeItem: action.payload,...state,
      };        activeItem: action.payload,

    default:
      return state; default:
  }     return state;
}  }

const generateId = () => crypto.randomUUID();

// Helper function to get date string in YYYY-MM-DD format
const getDateStr = (date: Date) => {ing in YYYY-MM-DD format
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');h() + 1).padStart(2, '0');
  return `${year}-${month}-${day}`;const day = String(date.getDate()).padStart(2, '0');
};  return `${year}-${month}-${day}`;

export default function App() {
  const { user } = useAuth();
  const [state, dispatch] = useReducer(reducer, { } = useAuth();
    items: [],spatch] = useReducer(reducer, {
    loading: true,
    activeItem: null,rue,
    notes: {},
    sessionNotes: {},otes: {},
  });
  const [selectedTab, setSelectedTab] = useState<string>(TAB_OPTIONS.DASHBOARD);
  const [showAddDialog, setShowAddDialog] = useState(false);ASHBOARD);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);false);
  const [searchQuery, setSearchQuery] = useState('');null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'completed'>('all');
  const [flashcardDecks, setFlashcardDecks] = useState<FlashcardDeck[]>([]);| 'completed'>('all');
  const [flashcardsLoading, setFlashcardsLoading] = useState(false);  const [flashcardDecks, setFlashcardDecks] = useState<FlashcardDeck[]>([]);
false);
  // Add global styles to ensure dark mode works consistently
  useEffect(() => {ure dark mode works consistently
    // Create a style element
    const style = document.createElement('style');// Create a style element
    
    // Add CSS rules to ensure dark mode works properly
    style.textContent = `k mode works properly
      /* Force dark mode styles */
      .dark body, .dark #root, .dark [data-theme="dark"] {
        background-color: #0f172a !important;rk [data-theme="dark"] {
        color: #f8fafc !important; background-color: #0f172a !important;
      }  color: #f8fafc !important;
      
      /* Force light mode styles */
      body:not(.dark), #root:not(.dark), [data-theme="light"] {
        background-color: #ffffff !important;dark), [data-theme="light"] {
        color: #0f172a !important; background-color: #ffffff !important;
      }  color: #0f172a !important;
      
      /* Fix for mobile dark backgrounds in light mode */
      @media (max-width: 768px) {nds in light mode */
        body:not(.dark) .bg-gray-50, 
        body:not(.dark) .bg-gray-100,
        body:not(.dark) .bg-gray-200 {
          background-color: #ffffff !important;ody:not(.dark) .bg-gray-200 {
        }  background-color: #ffffff !important;
        
        /* Ensure text is visible on mobile in light mode */
        body:not(.dark) .text-gray-500,bile in light mode */
        body:not(.dark) .text-gray-600,
        body:not(.dark) .text-gray-700 {00,
          color: #1e293b !important;ody:not(.dark) .text-gray-700 {
        }  color: #1e293b !important;
        
        /* Ensure cards have proper background in light mode */
        body:not(.dark) .card,r background in light mode */
        body:not(.dark) .bg-card {
          background-color: #ffffff !important;
          border-color: #e2e8f0 !important; background-color: #ffffff !important;
        }   border-color: #e2e8f0 !important;
      }  }
      
      /* Ensure Learning Insights calendar takes full width */
      .yearly-activity-heatmap-container {ts calendar takes full width */
        width: 100% !important;ainer {
        max-width: 100% !important;
        overflow-x: hidden !important; max-width: 100% !important;
      }  overflow-x: hidden !important;
      
      .yearly-activity-grid {
        width: 100% !important;
        grid-template-columns: repeat(53, minmax(0, 1fr)) !important; width: 100% !important;
      }  grid-template-columns: repeat(53, minmax(0, 1fr)) !important;
      
      /* Improve navigation menu spacing */
      @media (min-width: 768px) {on menu spacing */
        .tab-navigation {
          padding: 0.5rem !important;
          gap: 0.5rem !important; padding: 0.5rem !important;
        }  gap: 0.5rem !important;
        
        .tab-navigation button {
          padding: 0.5rem 0.75rem !important;
          font-size: 0.875rem !important; padding: 0.5rem 0.75rem !important;
        }   font-size: 0.875rem !important;
      }  }
    `;  }
    
    // Append the style element to the document head
    document.head.appendChild(style);// Append the style element to the document head
    Child(style);
    // Clean up function
    return () => {
      document.head.removeChild(style);turn () => {
    };ument.head.removeChild(style);
  }, []);    };

  useEffect(() => {
    let mounted = true;  useEffect(() => {

    async function loadItems() {
      if (!user) {dItems() {
        if (mounted) {
          dispatch({ type: 'LOAD_STATE', payload: [] });f (mounted) {
        }tch({ type: 'LOAD_STATE', payload: [] });
        return; }
      }        return;

      try {
        const items = await getLearningItems();
        if (mounted) {
          dispatch({ type: 'LOAD_STATE', payload: items });
          setError(null); dispatch({ type: 'LOAD_STATE', payload: items });
        });
      } catch (error) {
        console.error('Error loading items:', error);{
        if (mounted) {
          dispatch({ type: 'LOAD_STATE', payload: [] });
          setError('Failed to load items. Please try again later.'); dispatch({ type: 'LOAD_STATE', payload: [] });
        }   setError('Failed to load items. Please try again later.');
      }   }
    }      }

    loadItems();

    return () => {
      mounted = false;turn () => {
    }; = false;
  }, [user]);    };

  useEffect(() => {
    const activeItem = state.activeItem;
    if (!activeItem) return;    const activeItem = state.activeItem;

    const item = state.items.find(i => i.id === activeItem);
    if (!item?.progress?.sessions) return;    const item = state.items.find(i => i.id === activeItem);

    const activeSession = item.progress.sessions.find(s => !s.endTime && s.status === 'in_progress');
    if (!activeSession) return;    const activeSession = item.progress.sessions.find(s => !s.endTime && s.status === 'in_progress');

    // Store active session info
    localStorage.setItem(`activeSession_${activeItem}`, JSON.stringify({
      startTime: activeSession.startTime,ssion_${activeItem}`, JSON.stringify({
      status: activeSession.statusartTime: activeSession.startTime,
    }));
    localStorage.setItem(`sessionLastUpdate_${activeItem}`, Date.now().toString());
  }, [state.activeItem, state.items]);    localStorage.setItem(`sessionLastUpdate_${activeItem}`, Date.now().toString());
tem, state.items]);
  useEffect(() => {
    const loadPersistedSessions = () => {
      state.items.forEach(item => {
        const persistedSession = localStorage.getItem(`activeSession_${item.id}`);=> {
        if (persistedSession) {ersistedSession = localStorage.getItem(`activeSession_${item.id}`);
          try {
            const session = JSON.parse(persistedSession);
            if (session.status === 'in_progress') {
              dispatch({ type: 'SET_ACTIVE_ITEM', payload: item.id });f (session.status === 'in_progress') {
            }{ type: 'SET_ACTIVE_ITEM', payload: item.id });
          } catch (e) {
            console.error('Error parsing persisted session:', e); catch (e) {
          }   console.error('Error parsing persisted session:', e);
        } }
      });  }
    };      });

    if (!state.loading) {
      loadPersistedSessions();f (!state.loading) {
    }
  }, [state.loading, state.items]);    }
e.items]);
  // Load flashcard decks
  useEffect(() => {
    const loadFlashcards = async () => {(() => {
      try { => {
        setFlashcardsLoading(true);
        const { data, error } = await supabase;
          .from('flashcard_decks')rror } = await supabase
          .select('*');  .from('flashcard_decks')
        ');
        if (error) {
          console.error('Error loading flashcards:', error);) {
          return; console.error('Error loading flashcards:', error);
        }  return;
        
        setFlashcardDecks(data || []);
      } catch (error) {
        console.error('Error loading flashcards:', error);ror) {
      } finally { flashcards:', error);
        setFlashcardsLoading(false); finally {
      }  setFlashcardsLoading(false);
    };  }
    
    loadFlashcards();
  }, []);    loadFlashcards();

  // Appliquer le correctif d'icônes après le rendu initial
  useEffect(() => { useMemo(() => {
    // Applique le correctif des icônes SVG
    const cleanup = fixSvgIcons();
    
    return () => {
      if (typeof cleanup === 'function') {
        cleanup();          item.category.toLowerCase().includes(searchLower) ||
      });
    };
  }, []);

  const filteredItems = useMemo(() => {        const itemDate = item.date ? getDateStr(new Date(item.date)) : null;
    return state.items selectedDate ? itemDate === selectedDateStr : true;
      .filter(item => {
        const searchLower = searchQuery.toLowerCase();
        const matchesSearch =
          item.title.toLowerCase().includes(searchLower) ||
          item.category.toLowerCase().includes(searchLower) ||          filterStatus === 'active' ? item.status !== 'completed' && item.status !== 'archived' :
          (item.notes?.toLowerCase() || '').includes(searchLower);pleted' || item.status === 'archived' : true;

        // If a date is selected, only show items from that date
        const selectedDateStr = selectedDate ? getDateStr(selectedDate) : null;      });
        const itemDate = item.date ? getDateStr(new Date(item.date)) : null;
        const matchesDate = selectedDate ? itemDate === selectedDateStr : true;
 async (selectedDate?: Date | null) => {
        // Filter by status
        const matchesStatus =f (selectedDate) {
          filterStatus === 'all' ? true :  setSelectedDate(selectedDate);
          filterStatus === 'active' ? item.status !== 'completed' && item.status !== 'archived' :    }
          filterStatus === 'completed' ? item.status === 'completed' || item.status === 'archived' : true;

        return matchesSearch && matchesDate && matchesStatus;mData) => {
      });
  }, [state.items, searchQuery, filterStatus, selectedDate]);ht in local timezone
      const date = selectedDate ? selectedDate : new Date();
  const handleAddItem = async (selectedDate?: Date | null) => {
    setShowAddDialog(true);
    if (selectedDate) {ata object that matches LearningItemFormData
      setSelectedDate(selectedDate);earningItemFormData = {
    }
  };
t || { hours: 0, minutes: 0 },
  const handleSubmitItem = async (formData: LearningItemFormData) => {s',
    try {
      // Create a date string at midnight in local timezone
      const date = selectedDate ? selectedDate : new Date();ted || false,
      const dateStr = getDateStr(date);riority || 'medium',
 [],
      // Create a clean form data object that matches LearningItemFormData
      const cleanFormData: LearningItemFormData = {a.total,
        title: formData.title,
        type: formData.type,
        current: formData.current || { hours: 0, minutes: 0 },difficulty: formData.difficulty || 'medium',
        unit: formData.unit || 'hours',        status: formData.status || 'not_started'
        url: formData.url || '',
        notes: formData.notes || '',
        completed: formData.completed || false,addLearningItem(cleanFormData);
        priority: formData.priority || 'medium',: 'ADD_ITEM', payload: addedItem });
        tags: formData.tags || [],
        goal: formData.goal,
        total: formData.total, console.error('Error adding item:', error);
        category: formData.category || '',  setError('Failed to add item. Please try again.');
        date: dateStr,    }
        difficulty: formData.difficulty || 'medium',
        status: formData.status || 'not_started'
      };al<LearningItem>) => {

      const addedItem = await addLearningItem(cleanFormData);      const item = state.items.find(item => item.id === id);
      dispatch({ type: 'ADD_ITEM', payload: addedItem });
      setShowAddDialog(false);
    } catch (error) {
      console.error('Error adding item:', error);
      setError('Failed to add item. Please try again.'); uniquement les propriétés existantes 
    }// et enlever completed_at qui n'existe pas dans l'interface
  };

  const handleUpdateItem = async (id: string, updates: Partial<LearningItem>) => {
    try {categorized').toUpperCase();
      const item = state.items.find(item => item.id === id); console.log('Tracking activity for category:', { category: normalizedCategory });
      if (!item) return;        await trackLearningActivity(normalizedCategory);

      // Si marking as completed
      if (updates.completed && !item.completed) {      // Update local state first for immediate feedback
        // Modifier cette partie pour utiliser uniquement les propriétés existantes );
        // et enlever completed_at qui n'existe pas dans l'interface
        updates.status = 'completed' as const;em = await updateLearningItem(id, updates);
        
        // Track learning activity when completing an item
        const normalizedCategory = (item.category || 'Uncategorized').toUpperCase();or);
        console.log('Tracking activity for category:', { category: normalizedCategory });
        await trackLearningActivity(normalizedCategory);he local state change on error
      }
f (item) {
      // Update local state first for immediate feedback   dispatch({ type: 'UPDATE_ITEM', payload: { id, updates: item } });
      dispatch({ type: 'UPDATE_ITEM', payload: { id, updates } });  }
    }
      const updatedItem = await updateLearningItem(id, updates);
      setError(null);
    } catch (error) {d: string) => {
      console.error('Error updating item:', error);
      setError('Failed to update item. Please try again.');rningItem(id);
      // Revert the local state change on error: 'DELETE_ITEM', payload: id });
      const item = state.items.find(item => item.id === id);
      if (item) {
        dispatch({ type: 'UPDATE_ITEM', payload: { id, updates: item } }); console.error('Error deleting item:', error);
      }  setError('Failed to delete item. Please try again.');
    }    }
  };

  const handleDeleteItem = async (id: string) => {
    try {
      await deleteLearningItem(id);      const item = state.items.find(item => item.id === id);
      dispatch({ type: 'DELETE_ITEM', payload: id });
      setError(null);
    } catch (error) {      // Update local state first for immediate feedback
      console.error('Error deleting item:', error);G', payload: id });
      setError('Failed to delete item. Please try again.');
    }Time = new Date();
  };l<LearningItem> = {

  const handleStartTracking = async (id: string) => {gress,
    try {ISOString(),
      const item = state.items.find(item => item.id === id);sions: [
      if (!item) return;

      // Update local state first for immediate feedback startTime: currentTime.toISOString(),
      dispatch({ type: 'START_TRACKING', payload: id });   date: currentTime.toISOString().split('T')[0]
   }
      const currentTime = new Date();  ]
      const updates: Partial<LearningItem> = {        }
        progress: {
          ...item.progress,
          lastAccessed: currentTime.toISOString(),
          sessions: [
            ...item.progress.sessions, error);
            {ain.');
              startTime: currentTime.toISOString(), // Revert the local state change on error
              date: currentTime.toISOString().split('T')[0]  dispatch({ type: 'STOP_TRACKING', payload: id });
            }    }
          ]
        }
      };

      await updateLearningItem(id, updates);      const item = state.items.find(item => item.id === id);
    } catch (error) {
      console.error('Error starting tracking:', error);
      setError('Failed to start tracking. Please try again.');      // First update local state for immediate feedback
      // Revert the local state change on error', payload: id });
      dispatch({ type: 'STOP_TRACKING', payload: id });
    }      const currentTime = new Date();
  };gress.sessions.length - 1];

  const handleStopTracking = async (id: string) => {;
    try {
      const item = state.items.find(item => item.id === id);      const startTime = new Date(lastSession.startTime);
      if (!item) return;- startTime.getTime()) / 60000);

      // First update local state for immediate feedback
      dispatch({ type: 'STOP_TRACKING', payload: id });) + item.progress.current.minutes;
* 60) + item.progress.total.minutes : 0;
      const currentTime = new Date();      const newCurrentValue = currentMinutes + elapsedMinutes;
      const lastSession = item.progress.sessions[item.progress.sessions.length - 1];wCurrentValue >= totalMinutes;

      if (!lastSession || !lastSession.startTime) return;l<LearningItem> = {

      const startTime = new Date(lastSession.startTime);
      const elapsedMinutes = Math.round((currentTime.getTime() - startTime.getTime()) / 60000);
hours: Math.floor(newCurrentValue / 60),
      // Convert all times to minutes for accurate calculations
      const currentMinutes = (item.progress.current.hours * 60) + item.progress.current.minutes;
      const totalMinutes = item.progress.total ? (item.progress.total.hours * 60) + item.progress.total.minutes : 0;.progress.total || { hours: 0, minutes: 0 },
      const newCurrentValue = currentMinutes + elapsedMinutes;
      const completed = totalMinutes > 0 && newCurrentValue >= totalMinutes;sions: [
sessions.slice(0, -1),
      const updates: Partial<LearningItem> = {
        progress: {ion,
          ...item.progress,
          current: {
            hours: Math.floor(newCurrentValue / 60), hours: Math.floor(elapsedMinutes / 60),
            minutes: newCurrentValue % 60   minutes: elapsedMinutes % 60
          },   }
          total: item.progress.total || { hours: 0, minutes: 0 },   }
          lastAccessed: currentTime.toISOString(),  ]
          sessions: [        }
            ...item.progress.sessions.slice(0, -1),
            {
              ...lastSession,tatus if it's newly completed
              endTime: currentTime.toISOString(),
              duration: {
                hours: Math.floor(elapsedMinutes / 60), // Suppression de la propriété 'completed_at' qui n'existe pas dans le type Partial<LearningItem>
                minutes: elapsedMinutes % 60        updates.status = 'completed' as const;
              }
            }
          ]
        }
      }; error);
n.');
      // Only update completion status if it's newly completed // Revert the local state change on error
      if (completed && !item.completed) {  dispatch({ type: 'START_TRACKING', payload: id });
        updates.completed = true;    }
        // Suppression de la propriété 'completed_at' qui n'existe pas dans le type Partial<LearningItem>
        updates.status = 'completed' as const;
      }date?: Date) => {
f (date) {
      await updateLearningItem(id, updates);  setSelectedDate(date);
    } catch (error) {    }
      console.error('Error stopping tracking:', error);
      setError('Failed to stop tracking. Please try again.');
      // Revert the local state change on errornst handleUpdateNotes = (id: string, notes: string) => {
      dispatch({ type: 'START_TRACKING', payload: id });    dispatch({ type: 'UPDATE_NOTES', payload: { id, notes } });
    }
  };
nst handleAddSessionNote = (id: string, note: string) => {
  const handleDateSelect = (date?: Date) => {    dispatch({ type: 'ADD_SESSION_NOTE', payload: { id, note } });
    if (date) {
      setSelectedDate(date);
    }nst handleSetActiveItem = (id: string | null) => {
  };    dispatch({ type: 'SET_ACTIVE_ITEM', payload: id });

  const handleUpdateNotes = (id: string, notes: string) => {
    dispatch({ type: 'UPDATE_NOTES', payload: { id, notes } });nst handleDashboardUpdate = (id: string, updates: Partial<LearningItem>) => {
  };    handleUpdateItem(id, updates);

  const handleAddSessionNote = (id: string, note: string) => {
    dispatch({ type: 'ADD_SESSION_NOTE', payload: { id, note } });em = (date?: Date | null) => {
  };f (date) {
;
  const handleSetActiveItem = (id: string | null) => {}
    dispatch({ type: 'SET_ACTIVE_ITEM', payload: id });    setShowAddDialog(true);
  };

  const handleDashboardUpdate = (id: string, updates: Partial<LearningItem>) => {nst handleItemsAddItem = () => {
    handleUpdateItem(id, updates);    setShowAddDialog(true);
  };

  const handleDashboardAddItem = (date?: Date | null) => {data: { name: string; description: string }) => {
    if (date) {
      setSelectedDate(date);k({
    }ame: data.name,
    setShowAddDialog(true);  description: data.description
  };

  const handleItemsAddItem = () => {// Update state with the new deck
    setShowAddDialog(true);hcardDecks(prev => [...prev, newDeck]);
  };

  const handleAddFlashcardDeck = async (data: { name: string; description: string }) => {itle: "Success",
    try {  description: "New deck created successfully",
      const newDeck = await createDeck({
        name: data.name,
        description: data.description
      });error) {
      or creating deck:', error);
      // Update state with the new deck
      setFlashcardDecks(prev => [...prev, newDeck]);
      escription: "Failed to create the deck",
      toast({destructive"
        title: "Success", });
        description: "New deck created successfully",  throw error;
      });    }
      
      return newDeck;
    } catch (error) {k = async (deckId: string) => {
      console.error('Error creating deck:', error);
      toast({ study
        title: "Error", kToStudy = flashcardDecks.find(d => d.id === deckId);
        description: "Failed to create the deck",
        variant: "destructive"
      });
      throw error;escription: "Deck not found",
    }nt: "destructive"
  }; });
  return;
  const handleStudyFlashcardDeck = async (deckId: string) => {
    try {
      // Find the deck to studyis deck
      const deckToStudy = flashcardDecks.find(d => d.id === deckId);cards, error } = await supabase
      if (!deckToStudy) {
        toast({  .select('*')
          title: "Error",);
          description: "Deck not found",
          variant: "destructive"
        });
        return;ngth === 0) {
      }
      itle: "No Cards",
      // Fetch cards for this deckiption: "This deck has no cards to study. Add some cards first!",
      const { data: cards, error } = await supabase });
        .from('flashcards')  return;
        .select('*')
        .eq('deck_id', deckId);
      // Set the selected tab to flashcards to ensure we're in the right view
      if (error) throw error;
      
      if (!cards || cards.length === 0) {FlashcardsTab component will handle the navigation to study mode
        toast({s the deckId through the onStudyDeck prop
          title: "No Cards",
          description: "This deck has no cards to study. Add some cards first!",itle: "Study Mode",
        });`Now studying deck: ${deckToStudy.name} (${cards.length} cards)`,
        return;
      }error) {
      ror starting study session:', error);
      // Set the selected tab to flashcards to ensure we're in the right view
      setSelectedTab(TAB_OPTIONS.FLASHCARDS);
      escription: "Failed to start study session",
      // The FlashcardsTab component will handle the navigation to study mode   variant: "destructive"
      // We just need to pass the deckId through the onStudyDeck prop  });
      toast({    }
        title: "Study Mode",
        description: `Now studying deck: ${deckToStudy.name} (${cards.length} cards)`,
      });ring, deckData: { name: string; description: string }) => {
    } catch (error) {
      console.error('Error starting study session:', error);o edit in the current state
      toast({kToEdit = flashcardDecks.find(d => d.id === deckId);
        title: "Error",
        description: "Failed to start study session",
        variant: "destructive"
      });escription: "Deck not found",
    }nt: "destructive"
  }; });
  return;
  const handleEditFlashcardDeck = async (deckId: string, deckData: { name: string; description: string }) => {
    try {
      // Find the deck to edit in the current statehe deck
      const deckToEdit = flashcardDecks.find(d => d.id === deckId);or } = await supabase
      if (!deckToEdit) {')
        toast({
          title: "Error",name: deckData.name,
          description: "Deck not found",kData.description || ''
          variant: "destructive"  })
        });
        return;
      }
      
      // Use raw SQL to update the deckafter update
      const { error } = await supabaseefreshedDecks, error: refreshError } = await supabase
        .from('flashcard_decks')
        .update({
          name: deckData.name,if (refreshError) throw refreshError;
          description: deckData.description || ''hcardDecks(refreshedDecks || []);
        })
        .eq('id', deckId);
      itle: "Success",
      if (error) throw error;"Deck updated successfully",
      
      // Refresh the decks list after updateerror) {
      const { data: refreshedDecks, error: refreshError } = await supabaseror updating deck:', error);
        .from('flashcard_decks')
        .select('*');
      if (refreshError) throw refreshError;escription: "Failed to update the deck",
      setFlashcardDecks(refreshedDecks || []);   variant: "destructive"
        });
      toast({    }
        title: "Success",
        description: "Deck updated successfully",
      });ync (deckId: string) => {
    } catch (error) {
      console.error('Error updating deck:', error);tabase
      toast({or } = await supabase
        title: "Error",ecks')
        description: "Failed to update the deck",  .delete()
        variant: "destructive"
      });
    }w error;
  };
// Update state
  const handleDeleteFlashcardDeck = async (deckId: string) => {Decks(prev => prev.filter(deck => deck.id !== deckId));
    try {
      // Delete the deck from database
      const { error } = await supabaseerror) {
        .from('flashcard_decks')ror deleting deck:', error);
        .delete()
        .eq('id', deckId);
      escription: "Failed to delete the deck",
      if (error) throw error;destructive"
       });
      // Update state  throw error;
      setFlashcardDecks(prev => prev.filter(deck => deck.id !== deckId));    }
      
      return true;
    } catch (error) {{
      console.error('Error deleting deck:', error);
      toast({
        title: "Error",-h-screen flex flex-col md:flex-row">
        description: "Failed to delete the deck",
        variant: "destructive"
      });activeTab={selectedTab} 
      throw error;TabChange={setSelectedTab}
    }
  };
erflow-y-auto bg-white dark:bg-gray-900">
  if (state.loading) {
    return (
      <ThemeProvider>lex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <div className="min-h-screen flex flex-col md:flex-row">lassName="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
          <div className="md:w-64">
            <TabNavigation 
              activeTab={selectedTab} Name="flex items-center gap-3">
              onTabChange={setSelectedTab}
            />
          </div>
          <div className="flex-1 p-4 overflow-y-auto bg-white dark:bg-gray-900">
            <div className="container mx-auto py-4 h-full flex flex-col"> className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all"
              <header className="mb-4">()} 
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                  <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">lus className="h-4 w-4" /> Add Item
                    Learning DashboardButton>
                  </h1>>
                  <div className="flex items-center gap-3">                </div>
                    <ThemeToggle />
                    <Button 
                      variant="default"uto">
                      size="sm"
                      className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all"
                      onClick={() => handleDashboardAddItem()}  className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    > className="text-gray-600 dark:text-gray-400">Chargement...</p>
                      <Plus className="h-4 w-4" /> Add Itemdiv>
                    </Button>div>
                  </div>              </div>
                </div>
              </header>
tem Dialog */}
              <div className="flex-1 overflow-auto">
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">m}
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>alog(false)}
                    <p className="text-gray-600 dark:text-gray-400">Chargement...</p>isOpen={showAddDialog}
                  </div>  selectedDate={selectedDate}
                </div>
              </div>
            </div>v>

            {/* Add Learning Item Dialog */}  </div>
            {showAddDialog && (   </ThemeProvider>
              <AddLearningItem    );
                onAdd={handleSubmitItem}
                onClose={() => setShowAddDialog(false)}
                isOpen={showAddDialog}
                selectedDate={selectedDate}
              />
            )}-h-screen flex flex-col md:flex-row">
          </div>
          <Toaster />
        </div>activeTab={selectedTab} 
      </ThemeProvider>TabChange={setSelectedTab}
    );
  }
erflow-y-auto bg-white dark:bg-gray-900">
  if (error) {
    return (
      <ThemeProvider>lex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <div className="min-h-screen flex flex-col md:flex-row">lassName="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
          <div className="md:w-64">
            <TabNavigation 
              activeTab={selectedTab} Name="flex items-center gap-3">
              onTabChange={setSelectedTab}
            />
          </div>
          <div className="flex-1 p-4 overflow-y-auto bg-white dark:bg-gray-900">
            <div className="container mx-auto px-4 py-4 h-screen flex flex-col bg-white dark:bg-gray-900"> className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all"
              <header className="mb-4">()} 
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                  <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">lus className="h-4 w-4" /> Add Item
                    Learning DashboardButton>
                  </h1>>
                  <div className="flex items-center gap-3">                </div>
                    <ThemeToggle />
                    <Button 
                      variant="default"x flex-col md:flex-row flex-1 h-full gap-4 overflow-hidden">
                      size="sm"-72">
                      className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all"
                      onClick={() => handleDashboardAddItem()} activeTab={selectedTab} 
                    >TabChange={setSelectedTab}
                      <Plus className="h-4 w-4" /> Add Item                  />
                    </Button>
                  </div>
                </div>idden flex flex-col">
              </header>ark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
sName="text-center">
              <div className="flex flex-col md:flex-row flex-1 h-full gap-4 overflow-hidden">p>
                <div className="md:w-64 lg:w-72">
                  <TabNavigation  onClick={() => window.location.reload()}
                    activeTab={selectedTab} Name="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                    onTabChange={setSelectedTab}
                  />try
                </div>utton>
div>
                <div className="flex-1 overflow-hidden flex flex-col">main>
                  <main className="flex-1 overflow-auto bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">div>
                    <div className="text-center">div>
                      <p className="text-red-600 mb-4">{error}</p>
                      <buttonv>
                        onClick={() => window.location.reload()}
                        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"  </div>
                      >   </ThemeProvider>
                        Retry    );
                      </button>
                    </div>
                  </main>
                </div>dark">
              </div>-h-screen flex flex-col md:flex-row">
            </div>
          </div>
          <Toaster />activeTab={selectedTab} 
        </div>TabChange={setSelectedTab} 
      </ThemeProvider>
    );
  }:p-6 overflow-y-auto bg-white dark:bg-gray-900">

  return (
    <ThemeProvider defaultTheme="dark">lex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
      <div className="min-h-screen flex flex-col md:flex-row">lassName="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent drop-shadow-sm">
        <div className="md:w-64">
          <TabNavigation 
            activeTab={selectedTab} Name="flex items-center gap-3">
            onTabChange={setSelectedTab} 
          />
        </div>
        <div className="flex-1 p-4 md:p-6 overflow-y-auto bg-white dark:bg-gray-900">
          <div className="container mx-auto py-4 h-full flex flex-col"> className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all"
            <header className="mb-6">()} 
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent drop-shadow-sm">lus className="h-4 w-4" /> Add Item
                  Learning DashboardButton>
                </h1>>
                <div className="flex items-center gap-3">              </div>
                  <ThemeToggle />
                  <Button 
                    variant="default"lex-1 overflow-auto bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4 md:p-6">
                    size="sm"TIONS.DASHBOARD && (
                    className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all"
                    onClick={() => handleDashboardAddItem()} 
                  >
                    <Plus className="h-4 w-4" /> Add Item
                  </Button>ing}
                </div>
              </div>
            </header>Note}
eItem}
            <main className="flex-1 overflow-auto bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4 md:p-6">onAddItem={handleDashboardAddItem}
              {selectedTab === TAB_OPTIONS.DASHBOARD && (  onDateSelect={handleDateSelect}
                <DashboardTab                 />
                  items={state.items}
                  onUpdate={handleDashboardUpdate}
                  onDelete={handleDeleteItem}TIONS.ITEMS && (
                  onStartTracking={handleStartTracking}
                  onStopTracking={handleStopTracking}
                  onNotesUpdate={handleUpdateNotes}
                  onSessionNoteAdd={handleAddSessionNote}
                  onSetActiveItem={handleSetActiveItem}ing}
                  onAddItem={handleDashboardAddItem}
                  onDateSelect={handleDateSelect}
                />sionNote}
              )}onSetActiveItem={handleSetActiveItem}
  onAddItem={handleItemsAddItem}
              {selectedTab === TAB_OPTIONS.ITEMS && (                />
                <ItemsTab 
                  items={state.items}
                  onUpdate={handleUpdateItem}electedTab === TAB_OPTIONS.ANALYTICS && (
                  onDelete={handleDeleteItem}                <AnalyticsTab items={state.items} />
                  onStartTracking={handleStartTracking}
                  onStopTracking={handleStopTracking}
                  onNotesUpdate={handleUpdateNotes}electedTab === TAB_OPTIONS.POMODORO && (
                  onSessionNoteAdd={handleAddSessionNote}  <PomodoroTimer />
                  onSetActiveItem={handleSetActiveItem}
                  onAddItem={handleItemsAddItem}
                />electedTab === TAB_OPTIONS.LEARNING_CARDS && (
              )}                <LearningCardsPage />

              {selectedTab === TAB_OPTIONS.ANALYTICS && (
                <AnalyticsTab items={state.items} />ASHCARDS && (
              )}

              {selectedTab === TAB_OPTIONS.POMODORO && (
                <PomodoroTimer />
              )}onEditDeck={handleEditFlashcardDeck}
                onDeleteDeck={handleDeleteFlashcardDeck}
              {selectedTab === TAB_OPTIONS.LEARNING_CARDS && (
                <LearningCardsPage />
              )}            </main>

              {selectedTab === TAB_OPTIONS.FLASHCARDS && (
                <FlashcardsTab tem Dialog */}
                  flashcards={flashcardDecks}
                  onAddDeck={handleAddFlashcardDeck}
                  onStudyDeck={handleStudyFlashcardDeck}m}
                  onEditDeck={handleEditFlashcardDeck}alog(false)}
                  onDeleteDeck={handleDeleteFlashcardDeck}isOpen={showAddDialog}
                />  selectedDate={selectedDate}
              )}  />
            </main>
          </div>
oaster />
          {/* Add Learning Item Dialog */}
          {showAddDialog && (  </div>
            <AddLearningItem   </ThemeProvider>













}  );    </ThemeProvider>      </div>        </div>          <Toaster />                    )}            />              selectedDate={selectedDate}              isOpen={showAddDialog}              onClose={() => setShowAddDialog(false)}              onAdd={handleSubmitItem}  );
}