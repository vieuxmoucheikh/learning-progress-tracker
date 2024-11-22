import { useReducer, useEffect, useState } from 'react';
import { AddLearningItem } from './components/AddLearningItem';
import { LearningItemCard } from './components/LearningItemCard';
import { Stats } from './components/Stats';
import { Insights } from './components/Insights';
import { LearningInsights } from './components/LearningInsights';
import { LearningItem, LearningItemFormData } from './types';
import { Plus } from 'lucide-react';
import { Calendar } from './components/Calendar';
import { getLearningItems, addLearningItem, updateLearningItem, deleteLearningItem, getStreakData, updateStreakData } from './lib/database';
import { useAuth } from './lib/auth';
import { Auth } from './components/Auth';

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
  const { user, loading: authLoading } = useAuth();
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

  // If not authenticated, show auth page
  if (!user && !authLoading) {
    return <Auth />;
  }

  // Show loading state while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // Load items from database
  useEffect(() => {
    async function loadItems() {
      if (!user) return;
      try {
        const items = await getLearningItems();
        dispatch({ type: 'LOAD_STATE', payload: items });
      } catch (error) {
        console.error('Error loading items:', error);
        dispatch({ type: 'LOAD_STATE', payload: [] });
      }
    }
    loadItems();
  }, [user]);

  // Handle adding new item
  const handleAddItem = async (formData: LearningItemFormData) => {
    if (!user) return;
    try {
      const newItem = await addLearningItem({
        ...formData,
        user_id: user.id,
        progress: {
          current: formData.current,
          total: formData.total,
          lastAccessed: new Date().toISOString(),
          sessions: [],
        },
      });
      dispatch({ type: 'ADD_ITEM', payload: newItem });
      setIsAddModalOpen(false);
    } catch (error) {
      console.error('Error adding item:', error);
    }
  };

  // Handle updating item
  const handleUpdateItem = async (id: string, updates: Partial<LearningItem>) => {
    if (!user) return;
    try {
      const updatedItem = await updateLearningItem(id, updates);
      dispatch({ type: 'UPDATE_ITEM', payload: { id, updates: updatedItem } });
    } catch (error) {
      console.error('Error updating item:', error);
    }
  };

  // Handle deleting item
  const handleDeleteItem = async (id: string) => {
    if (!user) return;
    try {
      await deleteLearningItem(id);
      dispatch({ type: 'DELETE_ITEM', payload: id });
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  // Update streak data
  const updateStreak = async () => {
    if (!user) return;
    try {
      const currentStreak = await getStreakData(user.id);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (!currentStreak) {
        // Initialize streak data
        await updateStreakData(user.id, {
          currentStreak: 1,
          lastActivityDate: today.toISOString(),
          longestStreak: 1,
          history: []
        });
        return;
      }

      const lastActivity = new Date(currentStreak.lastActivityDate!);
      lastActivity.setHours(0, 0, 0, 0);

      const daysSinceLastActivity = Math.floor(
        (today.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysSinceLastActivity > 1) {
        // Reset streak
        await updateStreakData(user.id, {
          ...currentStreak,
          currentStreak: 1,
          lastActivityDate: today.toISOString(),
        });
      } else if (daysSinceLastActivity === 1) {
        // Increment streak
        const newCurrentStreak = currentStreak.currentStreak + 1;
        await updateStreakData(user.id, {
          ...currentStreak,
          currentStreak: newCurrentStreak,
          lastActivityDate: today.toISOString(),
          longestStreak: Math.max(newCurrentStreak, currentStreak.longestStreak)
        });
      }
    } catch (error) {
      console.error('Error updating streak:', error);
    }
  };

  useEffect(() => {
    const savedStreakData = getStreakData(user.id);
    if (savedStreakData) {
      const { currentStreak, longestStreak, lastUpdate } = savedStreakData;
      const lastUpdateDate = new Date(lastUpdate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      lastUpdateDate.setHours(0, 0, 0, 0);

      // If last update was not today, check if streak should be reset
      if (lastUpdateDate.getTime() !== today.getTime()) {
        const daysSinceLastUpdate = Math.floor(
          (today.getTime() - lastUpdateDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        // If more than 1 day has passed without activity, reset streak
        if (daysSinceLastUpdate > 1) {
          updateStreakData(user.id, {
            currentStreak: 0,
            longestStreak,
            lastUpdate: today.toISOString(),
          });
        }
      }
    }
  }, [user]);

  useEffect(() => {
    const checkMidnight = () => {
      const now = new Date();
      if (now.getHours() === 0 && now.getMinutes() === 0) {
        // Reload streak data at midnight
        const savedStreakData = getStreakData(user.id);
        if (savedStreakData) {
          const { currentStreak, longestStreak, lastUpdate } = savedStreakData;
          const lastUpdateDate = new Date(lastUpdate);
          lastUpdateDate.setHours(0, 0, 0, 0);
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          if (lastUpdateDate.getTime() !== today.getTime()) {
            // Reset streak if no activity yesterday
            updateStreakData(user.id, {
              currentStreak: 0,
              longestStreak,
              lastUpdate: today.toISOString(),
            });
          }
        }
      }
    };

    const midnightInterval = setInterval(checkMidnight, 60000); // Check every minute
    return () => clearInterval(midnightInterval);
  }, [user]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.querySelector<HTMLInputElement>('input[type="text"]');
        searchInput?.focus();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        setIsAddModalOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

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

  // Filter items based on search query and archive status
  const filteredItems = state.items.filter(item => {
    const searchString = `${item.title} ${item.category} ${item.tags.join(' ')} ${item.notes}`.toLowerCase();
    const matchesSearch = searchString.includes(searchQuery.toLowerCase());

    // Include archived items only if they match the selected date
    if (item.status === 'archived') {
      const itemDate = new Date(item.date);
      const isSelectedDate = itemDate.toDateString() === selectedDate.toDateString();
      return matchesSearch && isSelectedDate;
    }

    return matchesSearch;
  });

  // Sort items: active items first, then completed items, both sorted by date
  const sortedItems = [...filteredItems].sort((a, b) => {
    if (a.completed === b.completed) {
      // If both completed or both active, sort by date (newest first)
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    }
    // Put active items first
    return a.completed ? 1 : -1;
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const trackingItems = state.items.filter(item => item.lastTimestamp);
      const now = Date.now();

      trackingItems.forEach(item => {
        if (!item.lastTimestamp) return;

        const elapsedMinutes = Math.floor((now - item.lastTimestamp) / 1000 / 60);
        const currentMinutes = item.progress.current.hours * 60 + item.progress.current.minutes + elapsedMinutes;

        // Check if total time is reached
        if (item.progress.total) {
          const totalMinutes = item.progress.total.hours * 60 + item.progress.total.minutes;
          if (currentMinutes >= totalMinutes) {
            // Stop tracking and complete the item
            dispatch({ type: 'STOP_TRACKING', payload: item.id });

            // Calculate final session duration
            const finalSession = {
              date: new Date().toISOString(),
              duration: {
                hours: Math.floor(elapsedMinutes / 60),
                minutes: elapsedMinutes % 60
              }
            };

            // Update item with completion status and final session
            dispatch({
              type: 'UPDATE_ITEM',
              payload: {
                id: item.id,
                updates: {
                  completed: true,
                  status: 'completed',
                  completedAt: new Date().toISOString(),
                  progress: {
                    ...item.progress,
                    current: {
                      hours: Math.floor(currentMinutes / 60),
                      minutes: currentMinutes % 60
                    },
                    sessions: [...(item.progress.sessions || []), finalSession]
                  }
                }
              }
            });
          }
        }
      });
    }, 1000); // Check every second

    return () => clearInterval(interval);
  }, [state.items]);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Learning Tracker</h1>
          <div className="flex items-center gap-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Search learning items..."
                className="w-64 px-4 py-2 border-2 border-gray-200 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200 flex items-center gap-2 font-medium shadow-sm"
            >
              <Plus className="w-5 h-5" />
              Add New
            </button>
          </div>
        </div>

        {/* Stats Section */}
        <div className="mb-8">
          <Stats items={state.items} />
        </div>

        {/* Learning Insights */}
        <div className="mb-8">
          <LearningInsights items={state.items} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column: Learning Items */}
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

          {/* Calendar Section */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Calendar View</h2>
            <Calendar
              items={state.items}
              onDateSelect={handleDateSelect}
            />
          </div>
        </div>

        <AddLearningItem
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onAdd={handleAddItem}
        />
      </div>
    </div>
  );
}