import { useState, FormEvent, useEffect } from 'react';
import { LearningItem, LearningItemFormData } from '../types';

interface Props {
  items: LearningItem[];
  setItems: (items: LearningItem[]) => void;
}

const generateUniqueId = (): string => {
  return 'id-' + Math.random().toString(36).substr(2, 9);
};

export function LearningCalendar({ items, setItems }: Props) {
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [view, setView] = useState<'daily' | 'monthly'>('daily');
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [loading, setLoading] = useState<boolean>(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [newActivity, setNewActivity] = useState<LearningItemFormData>({
    title: '',
    type: 'video',
    current: { hours: 0, minutes: 0 },
    unit: 'hours',
    url: '',
    notes: '',
    completed: false,
    priority: 'medium',
    tags: [],
    goal: { hours: 0, minutes: 0 },
    date: selectedDate,
    total: { hours: 0, minutes: 0 },
    category: '',
    difficulty: 'medium',
    status: 'in_progress'
  });

  useEffect(() => {
    setNewActivity(prev => ({
      ...prev,
      date: selectedDate
    }));
  }, [selectedDate]);

  const handleDateClick = (date: string): void => {
    const utcDate = new Date(date + 'T00:00:00Z');
    setSelectedDate(utcDate.toISOString().split('T')[0]);
  };

  const getActivitiesForDate = (date: string): LearningItem[] => {
    const formattedDate = new Date(date).toISOString().split('T')[0];
    return items.filter(item => item.date === formattedDate);
  };

  const handleMonthChange = (direction: 'prev' | 'next'): void => {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev);
      newMonth.setMonth(prev.getMonth() + (direction === 'next' ? 1 : -1));
      return newMonth;
    });
  };

  const handleAddActivity = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!newActivity.title || !newActivity.category) {
      setNotification("Title and Category are required.");
      return;
    }
    
    setLoading(true);
    try {
      const newItems = [...items];
      // Check for duplicate titles on the same date
      const isDuplicate = newItems.some(item => 
        item.title.toLowerCase() === newActivity.title.toLowerCase() && 
        item.date === newActivity.date
      );
      
      if (isDuplicate) {
        setNotification("An activity with this title already exists for this date.");
        return;
      }

      const activity: LearningItem = {
        id: generateUniqueId(),
        ...newActivity,
        date: selectedDate,
        progress: {
          current: { hours: 0, minutes: 0 },
          lastAccessed: new Date().toISOString(),
          total: newActivity.total || { hours: 0, minutes: 0 },
          sessions: [{
            date: selectedDate,
            startTime: new Date().toISOString(),
            duration: { hours: 0, minutes: 0 }
          }]
        },
        completed: false,
      };
      
      setItems([...newItems, activity]);
      setNewActivity({
        title: '',
        type: 'video',
        current: { hours: 0, minutes: 0 },
        unit: 'hours',
        url: '',
        notes: '',
        completed: false,
        priority: 'medium',
        tags: [],
        goal: { hours: 0, minutes: 0 },
        date: selectedDate,
        total: { hours: 0, minutes: 0 },
        category: '',
        difficulty: 'medium',
        status: 'in_progress'
      });
      setNotification("Activity added successfully!");
    } catch (error) {
      setNotification(error instanceof Error ? error.message : "Failed to add activity");
    } finally {
      setLoading(false);
    }
  };

  const renderCalendar = (): JSX.Element => {
    const today = new Date();
    const startDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const endDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    const daysInMonth = endDate.getDate();
    const firstDayOfMonth = startDate.getDay();

    const calendarDays = [];

    // Add empty boxes for days before the first day of the month
    for (let i = 0; i < firstDayOfMonth; i++) {
      calendarDays.push(<div key={`empty-${i}`} className="border p-2 m-1"></div>);
    }

    // Create calendar days
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i);
      const formattedDate = date.toISOString().split('T')[0];
      const activities = getActivitiesForDate(formattedDate);
      const isToday = formattedDate === today.toISOString().split('T')[0];
      const isSelected = formattedDate === selectedDate;

      calendarDays.push(
        <div
          key={i}
          className={`border p-2 m-1 cursor-pointer ${isToday ? 'bg-yellow-200' : isSelected ? 'bg-blue-200' : activities.length > 0 ? 'bg-blue-100' : 'bg-gray-200'}`}
          onClick={() => handleDateClick(formattedDate)}
          title={activities.length > 0 ? `${activities.length} activity(ies)` : 'No activities'}
        >
          {i}
          {activities.length > 0 && <span className="text-xs"> ({activities.length})</span>}
        </div>
      );
    }

    return <div className="grid grid-cols-7">{calendarDays}</div>;
  };

  const renderActivityDetails = (): JSX.Element | null => {
    if (!selectedDate) return null;

    const activities = getActivitiesForDate(selectedDate);
    return (
      <div className="mt-4">
        <h3 className="text-lg font-semibold">Activities on {selectedDate}</h3>
        {activities.length > 0 ? (
          <ul>
            {activities.map(item => (
              <li key={item.id} className="border-b py-2">
                <div>{item.title}</div>
                <div>{item.progress.current.hours}h {item.progress.current.minutes}m</div>
                <div>Category: {item.category}</div>
                <div>Notes: {item.notes}</div>
              </li>
            ))}
          </ul>
        ) : (
          <p>No activities found for this date.</p>
        )}
      </div>
    );
  };

  return (
    <div>
      <h2 className="text-xl font-bold">Learning Calendar</h2>
      <form onSubmit={handleAddActivity}>
        <input
          type="text"
          value={newActivity.title}
          onChange={(e) => setNewActivity({ ...newActivity, title: e.target.value })}
          placeholder="Activity Title"
          required
          className="border p-2 rounded"
        />
        <input
          type="text"
          value={newActivity.category}
          onChange={(e) => setNewActivity({ ...newActivity, category: e.target.value })}
          placeholder="Category"
          required
          className="border p-2 rounded"
        />
        <button type="submit" className="p-2 bg-blue-500 text-white rounded" disabled={loading}>
          {loading ? 'Adding...' : 'Add Activity'}
        </button>
      </form>
      {notification && <div className="mt-2 text-green-500">{notification}</div>}
      <div className="flex justify-between mb-4">
        <button onClick={() => handleMonthChange('prev')} className="p-2 bg-gray-300 rounded">Previous</button>
        <span>{currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
        <button onClick={() => handleMonthChange('next')} className="p-2 bg-gray-300 rounded">Next</button>
        <button onClick={() => setCurrentMonth(new Date())} className="p-2 bg-gray-300 rounded">Today</button>
      </div>
      <div className="flex mb-4">
        <button onClick={() => setView('daily')} className="p-2 bg-gray-300 rounded">Daily View</button>
        <button onClick={() => setView('monthly')} className="p-2 bg-gray-300 rounded">Monthly View</button>
      </div>
      {view === 'monthly' ? (
        renderCalendar()
      ) : (
        renderActivityDetails()
      )}
    </div>
  );
}
