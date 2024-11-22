import { useReducer, useEffect, useState } from 'react';
import { AddLearningItem } from './components/AddLearningItem';
import { LearningItemCard } from './components/LearningItemCard';
import { Stats } from './components/Stats';
import { Insights } from './components/Insights';
import { LearningInsights } from './components/LearningInsights';
import { LearningItem } from './types';
import { Plus } from 'lucide-react';
import { Calendar } from './components/Calendar';
import { getLearningItems, addLearningItem, updateLearningItem, deleteLearningItem, getStreakData, updateStreakData } from './lib/database';
import { useAuth } from './lib/auth';

type State = {
  items: LearningItem[];
  loading: boolean;
};

type Action =
  | { type: 'LOAD_STATE'; payload: LearningItem[] }
  | { type: 'ADD_ITEM'; payload: LearningItem }
  | { type: 'UPDATE_ITEM'; payload: { id: string; updates: Partial<LearningItem> } }
  | { type: 'DELETE_ITEM'; payload: string }
  | { type: 'START_TRACKING'; payload: string }
  | { type: 'STOP_TRACKING'; payload: string };

function reducer(state: State, action: Action): State {
  let newState: State;

  switch (action.type) {
    case 'LOAD_STATE':
      newState = {
        ...state,
        items: action.payload,
        loading: false,
      };
      break;

    case 'ADD_ITEM':
      newState = {
        ...state,
        items: [...state.items, action.payload],
      };
      break;

    case 'UPDATE_ITEM':
      newState = {
        ...state,
        items: state.items.map(item =>
          item.id === action.payload.id
            ? { ...item, ...action.payload.updates }
            : item
        ),
      };
      break;

    case 'DELETE_ITEM':
      newState = {
        ...state,
        items: state.items.filter(item => item.id !== action.payload),
      };
      break;

    case 'START_TRACKING':
      newState = {
        ...state,
        items: state.items.map(item =>
          item.id === action.payload
            ? { ...item, lastTimestamp: Date.now() }
            : item
        ),
      };
      break;

    case 'STOP_TRACKING':
      newState = {
        ...state,
        items: state.items.map(item => {
          if (item.id === action.payload && item.lastTimestamp) {
            const elapsedMinutes = Math.floor((Date.now() - item.lastTimestamp) / 1000 / 60);
            const currentMinutes = item.progress.current.hours * 60 + item.progress.current.minutes + elapsedMinutes;

            return {
              ...item,
              lastTimestamp: undefined,
              progress: {
                ...item.progress,
                current: {
                  hours: Math.floor(currentMinutes / 60),
                  minutes: currentMinutes % 60,
                },
                lastAccessed: new Date().toISOString(),
              },
            };
          }
          return item;
        }),
      };
      break;

    default:
      return state;
  }

  return newState;
}

export default function App() {
  const { user } = useAuth();
  const [state, dispatch] = useReducer(reducer, {
    items: [],
    loading: true,
  });

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedDateTasks, setSelectedDateTasks] = useState<{
    activeTasks: LearningItem[];
    completedTasks: LearningItem[];
  }>({ activeTasks: [], completedTasks: [] });
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

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

  const handleAddItem = async (formData: any) => {
    try {
      const newItem = await addLearningItem(formData);
      dispatch({ type: 'ADD_ITEM', payload: newItem });
      setIsAddModalOpen(false);
    } catch (error) {
      console.error('Error adding item:', error);
    }
  };

  const handleUpdateItem = async (id: string, updates: Partial<LearningItem>) => {
    try {
      const updatedItem = await updateLearningItem(id, updates);
      dispatch({ type: 'UPDATE_ITEM', payload: { id, updates: updatedItem } });
    } catch (error) {
      console.error('Error updating item:', error);
    }
  };

  const handleDeleteItem = async (id: string) => {
    try {
      await deleteLearningItem(id);
      dispatch({ type: 'DELETE_ITEM', payload: id });
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  const handleStartTracking = (id: string) => {
    dispatch({ type: 'START_TRACKING', payload: id });
  };

  const handleStopTracking = (id: string) => {
    dispatch({ type: 'STOP_TRACKING', payload: id });
  };

  const handleDateSelect = (date: Date, activeTasks: LearningItem[], completedTasks: LearningItem[]) => {
    setSelectedDate(date);
    setSelectedDateTasks({ activeTasks, completedTasks });
  };

  const filteredItems = state.items.filter(item => {
    const searchString = `${item.title} ${item.category} ${item.tags.join(' ')} ${item.notes}`.toLowerCase();
    const matchesSearch = searchString.includes(searchQuery.toLowerCase());

    if (item.status === 'archived') {
      const itemDate = new Date(item.date);
      const isSelectedDate = itemDate.toDateString() === selectedDate.toDateString();
      return matchesSearch && isSelectedDate;
    }

    return matchesSearch;
  });

  const sortedItems = [...filteredItems].sort((a, b) => {
    if (a.completed === b.completed) {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    }
    return a.completed ? 1 : -1;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Learning Progress Tracker</h1>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Learning Item
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-800">Learning Items</h2>
              <div className="text-sm text-gray-500">
                {sortedItems.length} {sortedItems.length === 1 ? 'item' : 'items'} total
              </div>
            </div>
            <div className="space-y-4 bg-gray-50 p-4 rounded-xl">
              {sortedItems.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-lg font-medium mb-2">No learning items yet</div>
                  <div className="text-sm">Click the "Add New" button to create your first learning item</div>
                </div>
              ) : (
                <div className="space-y-4">
                  {sortedItems.map((item) => (
                    <LearningItemCard
                      key={item.id}
                      item={item}
                      onDelete={handleDeleteItem}
                      onStartTracking={handleStartTracking}
                      onStopTracking={handleStopTracking}
                      onUpdate={(updates) =>
                        handleUpdateItem(item.id, updates)
                      }
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Calendar View</h2>
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
          />
        )}
      </div>
    </div>
  );
}