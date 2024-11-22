import { useReducer, useEffect, useState, useMemo } from 'react';
import { AddLearningItem } from './components/AddLearningItem';
import { LearningItemCard } from './components/LearningItemCard';
import { Stats } from './components/Stats';
import { Insights } from './components/Insights';
import { LearningInsights } from './components/LearningInsights';
import { LearningItem, LearningItemFormData } from './types';
import { Plus } from 'lucide-react';
import { Calendar } from './components/Calendar';
import { getLearningItems, addLearningItem, updateLearningItem, deleteLearningItem } from './lib/database';
import { useAuth } from './lib/auth';

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

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'LOAD_STATE':
      return {
        ...state,
        items: action.payload,
        loading: false,
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
      return {
        ...state,
        items: state.items.map((item) =>
          item.id === action.payload
            ? {
                ...item,
                lastTimestamp: Date.now(),
                progress: {
                  ...item.progress,
                  sessions: [
                    ...item.progress.sessions,
                    { 
                      startTime: new Date().toISOString(),
                      date: new Date().toISOString(),
                      notes: [] 
                    }
                  ]
                }
              }
            : item
        ),
        activeItem: action.payload,
      };

    case 'STOP_TRACKING':
      return {
        ...state,
        items: state.items.map((item) =>
          item.id === action.payload
            ? { ...item, lastTimestamp: null }
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

export default function App() {
  const { user } = useAuth();
  const [state, dispatch] = useReducer(reducer, {
    items: [],
    loading: true,
    activeItem: null,
    notes: {},
    sessionNotes: {},
  });

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [selectedDateTasks, setSelectedDateTasks] = useState<{
    activeTasks: LearningItem[];
    completedTasks: LearningItem[];
  }>({ activeTasks: [], completedTasks: [] });
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'completed'>('all');

  const filteredItems = useMemo(() => {
    return state.items
      .filter(item => {
        const searchLower = searchQuery.toLowerCase();
        const matchesSearch = 
          item.title.toLowerCase().includes(searchLower) ||
          item.category.toLowerCase().includes(searchLower) ||
          (item.notes?.toLowerCase() || '').includes(searchLower);
        
        // If a date is selected, only show items from that date
        const selectedDateStr = selectedDate ? selectedDate.toISOString().split('T')[0] : null;
        const itemDate = new Date(item.date).toISOString().split('T')[0];
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

  const handleAddItem = async (formData: LearningItemFormData) => {
    try {
      const newItem = await addLearningItem({
        ...formData,
        user_id: user?.id,
      });
      dispatch({ type: 'ADD_ITEM', payload: newItem });
      setIsAddModalOpen(false);
      setError(null);
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
        updates.completed_at = new Date().toISOString();
        updates.status = 'completed' as const;
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

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    
    // Get all tasks for the selected date
    const selectedDateStr = date.toISOString().split('T')[0];
    const tasksForDate = state.items.filter(item => {
      const itemDate = new Date(item.date).toISOString().split('T')[0];
      return itemDate === selectedDateStr;
    });

    setSelectedDateTasks({
      activeTasks: tasksForDate.filter(task => task.status !== 'completed' && task.status !== 'archived'),
      completedTasks: tasksForDate.filter(task => task.status === 'completed' || task.status === 'archived')
    });
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

  if (state.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
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
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search learning items..."
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="ml-4">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <Plus className="-ml-1 mr-2 h-5 w-5" />
              Add Item
            </button>
          </div>
        </div>
      </div>

      <div className="mb-8">
        <Stats items={state.items} />
      </div>

      <div className="mb-8">
        <LearningInsights items={state.items} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-medium text-gray-900">
                {selectedDate ? (
                  <span>Tasks for {selectedDate.toLocaleDateString()}</span>
                ) : (
                  'Learning Items'
                )}
              </h2>
              {selectedDate && (
                <button
                  onClick={() => setSelectedDate(null)}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  (Show All)
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setFilterStatus('all')}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  filterStatus === 'all'
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterStatus('active')}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  filterStatus === 'active'
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                Active
              </button>
              <button
                onClick={() => setFilterStatus('completed')}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  filterStatus === 'completed'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                Completed
              </button>
            </div>
          </div>
          <div className="space-y-4">
            {filteredItems.length > 0 ? (
              filteredItems.map((item) => (
                <LearningItemCard
                  key={item.id}
                  item={item}
                  onUpdate={handleUpdateItem}
                  onDelete={handleDeleteItem}
                  onStartTracking={handleStartTracking}
                  onStopTracking={handleStopTracking}
                  onNotesUpdate={handleUpdateNotes}
                  onSessionNoteAdd={handleAddSessionNote}
                  onSetActiveItem={handleSetActiveItem}
                />
              ))
            ) : (
              <div className="text-gray-500 text-center py-4">
                {selectedDate ? 'No tasks for this date' : 'No items found'}
              </div>
            )}
          </div>
        </div>

        <div>
          <Calendar
            items={state.items}
            onDateSelect={handleDateSelect}
          />
        </div>
      </div>

      {isAddModalOpen && (
        <AddLearningItem
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onAdd={handleAddItem}
          selectedDate={selectedDate}
        />
      )}
    </div>
  );
}