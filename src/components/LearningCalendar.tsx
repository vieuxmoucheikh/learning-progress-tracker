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
    // Ensure we're using the local date string in YYYY-MM-DD format
    const localDate = new Date(date);
    localDate.setMinutes(localDate.getMinutes() - localDate.getTimezoneOffset());
    const formattedDate = localDate.toISOString().split('T')[0];
    
    setSelectedDate(formattedDate);
    setNewActivity(prev => ({
      ...prev,
      date: formattedDate
    }));
  };

  const getActivitiesForDate = (date: string): LearningItem[] => {
    const localDate = new Date(date);
    localDate.setMinutes(localDate.getMinutes() - localDate.getTimezoneOffset());
    const formattedDate = localDate.toISOString().split('T')[0];
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
        item.date === selectedDate
      );
      
      if (isDuplicate) {
        setNotification("An activity with this title already exists for this date.");
        return;
      }

      const totalHours = newActivity.total ? 
        newActivity.total.hours + (newActivity.total.minutes / 60) : 0;
      
      const { total, ...restNewActivity } = newActivity;
      
      const activity: LearningItem = {
        id: generateUniqueId(),
        ...restNewActivity,
        date: selectedDate,
        status: 'not_started',
        progress: {
          current: { hours: 0, minutes: 0 },
          lastAccessed: new Date().toISOString(),
          total: totalHours > 0 ? {
            hours: Math.floor(totalHours),
            minutes: Math.round((totalHours - Math.floor(totalHours)) * 60)
          } : undefined,
          sessions: []
        },
        completed: false,
        notes: ''
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

  const getCalendarDays = () => {
    const startDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const endDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    const daysInMonth = endDate.getDate();
    const firstDayOfMonth = startDate.getDay();

    const calendarDays = [];

    // Add empty boxes for days before the first day of the month
    for (let i = 0; i < firstDayOfMonth; i++) {
      calendarDays.push(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1 - i));
    }

    // Create calendar days
    for (let i = 1; i <= daysInMonth; i++) {
      calendarDays.push(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i));
    }

    // Add empty boxes for days after the last day of the month
    for (let i = 1; i <= 6 - endDate.getDay(); i++) {
      calendarDays.push(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, i));
    }

    return calendarDays;
  };

  return (
    <div className="w-full max-w-[1200px] mx-auto p-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold mb-2">Learning Calendar</h2>
          <div className="flex gap-2">
            <button
              className={`p-2 rounded ${view === 'daily' ? 'bg-blue-500 text-white' : 'bg-gray-300'}`}
              onClick={() => setView('daily')}
            >
              Daily
            </button>
            <button
              className={`p-2 rounded ${view === 'monthly' ? 'bg-blue-500 text-white' : 'bg-gray-300'}`}
              onClick={() => setView('monthly')}
            >
              Monthly
            </button>
          </div>
        </div>

        <div className="w-full sm:w-auto">
          {view === 'monthly' && (
            <div className="flex items-center gap-2">
              <button
                className="p-2 bg-gray-300 rounded"
                onClick={() => {
                  const newDate = new Date(currentMonth);
                  newDate.setMonth(newDate.getMonth() - 1);
                  setCurrentMonth(newDate);
                }}
              >
                Previous
              </button>
              <span className="text-sm font-medium">
                {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
              </span>
              <button
                className="p-2 bg-gray-300 rounded"
                onClick={() => {
                  const newDate = new Date(currentMonth);
                  newDate.setMonth(newDate.getMonth() + 1);
                  setCurrentMonth(newDate);
                }}
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>

      {view === 'daily' ? (
        <div className="space-y-6">
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {getActivitiesForDate(selectedDate).map((item) => (
              <div key={item.id} className="w-full">
                <div className="border p-2 rounded">
                  <h3 className="text-lg font-bold">{item.title}</h3>
                  <p>Category: {item.category}</p>
                  <p>Notes: {item.notes}</p>
                </div>
              </div>
            ))}
          </div>

          {getActivitiesForDate(selectedDate).length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No learning activities for this date</p>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-card rounded-lg shadow-sm overflow-hidden">
          <div className="grid grid-cols-7 text-center text-sm font-medium border-b">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="py-2 border-r last:border-r-0">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {getCalendarDays().map((date, index) => {
              const isCurrentMonth = date.getMonth() === currentMonth.getMonth();
              const isToday = date.toDateString() === new Date().toDateString();
              const dateString = date.toISOString().split('T')[0];
              const hasActivities = getActivitiesForDate(dateString).length > 0;

              return (
                <button
                  key={index}
                  onClick={() => handleDateClick(dateString)}
                  className={`
                    min-h-[80px] p-2 border-r border-b last:border-r-0
                    hover:bg-muted/50 transition-colors
                    ${!isCurrentMonth ? 'text-muted-foreground' : ''}
                    ${isToday ? 'bg-primary/5' : ''}
                    ${selectedDate === dateString ? 'bg-primary/10' : ''}
                  `}
                >
                  <div className="flex flex-col h-full">
                    <span className={`
                      text-sm font-medium mb-1
                      ${hasActivities ? 'text-primary' : ''}
                    `}>
                      {date.getDate()}
                    </span>
                    {hasActivities && (
                      <div className="flex-1 flex items-end">
                        <div className="w-2 h-2 rounded-full bg-primary"></div>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
