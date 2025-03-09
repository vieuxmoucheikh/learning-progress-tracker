import * as React from 'react';
import { useCallback, useEffect, useState, useMemo } from 'react';
import { LearningItem } from '../types';
import { Clock, Info, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface DayActivity {
  minutes: number;
  sessions: number;
  completedTasks: LearningItem[];
  activeItems: LearningItem[];
  archivedItems: LearningItem[];
}

interface CalendarDay {
  date: Date;
  minutes: number;
  sessions: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  activities: DayActivity;
}

interface CalendarWeek {
  days: CalendarDay[];
}

interface CalendarData {
  month: string;
  year: number;
  weeks: CalendarWeek[];
}

interface Props {
  items: LearningItem[];
  onDateSelect: (date: Date, activeTasks: LearningItem[], completedTasks: LearningItem[]) => void;
  selectedDate: Date | null;
  onAddItem?: () => void;
}

// Helper function to get timezone-adjusted date string
const getAdjustedDateStr = (date: Date | string) => {
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) {
      return null;
    }
    // Get local date components
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch (e) {
    console.error('Error adjusting date:', e);
    return null;
  }
};

// Helper function to format minutes into hours and minutes
const formatDuration = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
};

const Calendar: React.FC<Props> = ({ items, onDateSelect, selectedDate: externalSelectedDate, onAddItem }) => {
  const [currentDate, setCurrentDate] = useState(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
  });
  const [selectedDay, setSelectedDay] = useState<Date | null>(() => {
    if (externalSelectedDate) {
      const date = new Date(externalSelectedDate);
      date.setHours(0, 0, 0, 0);
      return date;
    }
    return null;
  });
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const [isYearPickerOpen, setIsYearPickerOpen] = useState(false);
  const [hoveredDay, setHoveredDay] = useState<CalendarDay | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [showLegend, setShowLegend] = useState(false);

  // Update current date when external selected date changes
  useEffect(() => {
    if (externalSelectedDate) {
      const newDate = new Date(externalSelectedDate);
      setSelectedDay(newDate);
      setCurrentDate(new Date(newDate.getFullYear(), newDate.getMonth(), 1));
    }
  }, [externalSelectedDate]);

  const calendarData = useMemo<CalendarData>(() => {
    const calendar: CalendarData = {
      month: currentDate.toLocaleString('default', { month: 'long' }),
      year: currentDate.getFullYear(),
      weeks: []
    };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    // Start from the first day of the week that contains the first day of the month
    const start = new Date(firstDay);
    start.setDate(firstDay.getDate() - firstDay.getDay());

    // End on the last day of the week that contains the last day of the month
    const end = new Date(lastDay);
    end.setDate(lastDay.getDate() + (6 - lastDay.getDay()));

    let weeks: CalendarWeek[] = [];
    let currentWeek: CalendarDay[] = [];

    // Iterate through each day
    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      const currentDate = new Date(date);
      currentDate.setHours(0, 0, 0, 0);

      // Initialize activities for this day
      const dayActivities: DayActivity = {
        minutes: 0,
        sessions: 0,
        completedTasks: [],
        activeItems: [],
        archivedItems: [],
      };

      // Process items for this date
      items.forEach(item => {
        if (!item.date) return;
        
        // Create dates in local timezone for comparison
        const itemDateStr = getAdjustedDateStr(item.date);
        const currentDateStr = getAdjustedDateStr(currentDate);

        if (itemDateStr && currentDateStr && itemDateStr === currentDateStr) {
          if (item.status === 'completed') {
            dayActivities.completedTasks.push(item);
          } else if (item.status === 'archived') {
            dayActivities.archivedItems.push(item);
          } else if (!dayActivities.activeItems.some(task => task.id === item.id)) {
            dayActivities.activeItems.push(item);
          }
        }

        // Process sessions
        if (item.progress?.sessions) {
          item.progress.sessions.forEach(session => {
            if (!session.date) return;
            
            const sessionDateStr = getAdjustedDateStr(session.date);
            if (sessionDateStr && currentDateStr && sessionDateStr === currentDateStr) {
              dayActivities.minutes += session.duration 
                ? (session.duration.hours || 0) * 60 + (session.duration.minutes || 0)
                : 0;
              dayActivities.sessions++;
            }
          });
        }
      });

      const calendarDay: CalendarDay = {
        date: currentDate,
        minutes: dayActivities.minutes,
        sessions: dayActivities.sessions,
        isCurrentMonth: currentDate.getMonth() === firstDay.getMonth(),
        isToday: getAdjustedDateStr(currentDate) === getAdjustedDateStr(today),
        activities: dayActivities,
      };

      currentWeek.push(calendarDay);

      if (currentWeek.length === 7) {
        weeks.push({ days: currentWeek });
        currentWeek = [];
      }
    }

    if (currentWeek.length > 0) {
      weeks.push({ days: currentWeek });
    }

    return {
      month: calendar.month,
      year: calendar.year,
      weeks
    };
  }, [currentDate, items]);

  useEffect(() => {
    if (externalSelectedDate) {
      const newSelectedDay = new Date(externalSelectedDate);
      newSelectedDay.setHours(0, 0, 0, 0);
      setSelectedDay(newSelectedDay);
      
      // Update currentDate to show the month of the selected date
      setCurrentDate(new Date(
        newSelectedDay.getFullYear(),
        newSelectedDay.getMonth(),
        1
      ));
      
      // Find the day in calendar data
      const selectedDayData = calendarData.weeks
        .flatMap(week => week.days)
        .find(day => getAdjustedDateStr(day.date) === getAdjustedDateStr(newSelectedDay));

      if (selectedDayData) {
        onDateSelect(newSelectedDay, selectedDayData.activities.activeItems, selectedDayData.activities.completedTasks);
      }
    }
  }, [externalSelectedDate, calendarData, onDateSelect]);

  // Handle date selection
  const handleDateSelect = useCallback((day: CalendarDay) => {
    try {
      const dateStr = getAdjustedDateStr(day.date);
      if (!dateStr) return;
      
      // Create a date at midnight in local timezone
      const selectedDate = new Date(dateStr);
      if (isNaN(selectedDate.getTime())) return;
      
      setSelectedDay(selectedDate);
      setHoveredDay(null); // Clear any hover state on selection
      onDateSelect(selectedDate, day.activities.activeItems, day.activities.completedTasks);
    } catch (e) {
      console.error('Error handling date selection:', e);
    }
  }, [onDateSelect]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!selectedDay) return;

    const newDate = new Date(selectedDay);
    switch (e.key) {
      case 'ArrowLeft':
        newDate.setDate(newDate.getDate() - 1);
        break;
      case 'ArrowRight':
        newDate.setDate(newDate.getDate() + 1);
        break;
      case 'ArrowUp':
        newDate.setDate(newDate.getDate() - 7);
        break;
      case 'ArrowDown':
        newDate.setDate(newDate.getDate() + 7);
        break;
      default:
        return;
    }
    setSelectedDay(newDate);
    setCurrentDate(newDate);
    onDateSelect(newDate, [], []);
  }, [selectedDay, onDateSelect]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const isSelectedDate = useCallback((day: CalendarDay) => {
    if (!selectedDay || !day.date) return false;
    return getAdjustedDateStr(day.date) === getAdjustedDateStr(selectedDay);
  }, [selectedDay]);

  const getActivityColor = (day: CalendarDay) => {
    const totalItems = 
      day.activities.activeItems.length + 
      day.activities.completedTasks.length + 
      day.activities.archivedItems.length;
    
    if (!day.isCurrentMonth) return 'bg-gray-50 dark:bg-gray-800/50 text-gray-400 dark:text-gray-500';
    if (isSelectedDate(day)) return 'bg-blue-500 dark:bg-blue-600 text-white hover:bg-blue-600 dark:hover:bg-blue-700';
    if (day.isToday) return 'bg-blue-100 dark:bg-blue-900/60 hover:bg-blue-200 dark:hover:bg-blue-800/80';
    
    // Color based on activity
    if (totalItems === 0 && day.sessions > 0) return 'bg-yellow-100 dark:bg-yellow-900/40 hover:bg-yellow-200 dark:hover:bg-yellow-800/60';
    if (totalItems === 0) return 'bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700';
    
    // Enhanced color scale based on total items
    if (totalItems >= 5) return 'bg-green-600 dark:bg-green-700 hover:bg-green-700 dark:hover:bg-green-600 text-white';
    if (totalItems >= 3) return 'bg-green-500 dark:bg-green-600 hover:bg-green-600 dark:hover:bg-green-500 text-white';
    if (totalItems >= 2) return 'bg-green-400 dark:bg-green-500 hover:bg-green-500 dark:hover:bg-green-400 text-gray-800 dark:text-white';
    return 'bg-green-300 dark:bg-green-600/50 hover:bg-green-400 dark:hover:bg-green-500/60 text-gray-800 dark:text-white';
  };

  const getDayContent = (day: CalendarDay) => {
    const hasActiveTasks = day.activities.activeItems.length > 0;
    const hasCompletedTasks = day.activities.completedTasks.length > 0;
    const hasArchivedTasks = day.activities.archivedItems.length > 0;
    const hasSessions = day.sessions > 0;
    const totalItems = day.activities.activeItems.length + day.activities.completedTasks.length + day.activities.archivedItems.length;

    return (
      <div 
        className={`relative w-full h-full flex flex-col justify-between ${getActivityColor(day)} rounded-lg transition-colors`}
        onMouseEnter={(e) => handleDayHover(day, e)}
        onMouseLeave={() => setHoveredDay(null)}
        onTouchStart={(e) => {
          // For touch devices, show tooltip on touch start
          handleDayHover(day, e as unknown as React.MouseEvent);
        }}
        onTouchEnd={() => {
          // Clear hover state after a short delay to allow tooltip viewing
          setTimeout(() => setHoveredDay(null), 1500);
        }}
      >
        <div className="text-sm font-medium p-1.5">{day.date.getDate()}</div>
        
        {/* Activity indicators */}
        {totalItems > 0 && (
          <div className="absolute bottom-1 right-1 flex flex-wrap justify-end gap-1 max-w-[80%]">
            {hasActiveTasks && (
              <div className="w-2 h-2 bg-blue-500 dark:bg-blue-400 rounded-full" title="Active Tasks" />
            )}
            {hasCompletedTasks && (
              <div className="w-2 h-2 bg-green-500 dark:bg-green-400 rounded-full" title="Completed Tasks" />
            )}
            {hasArchivedTasks && (
              <div className="w-2 h-2 bg-gray-500 dark:bg-gray-400 rounded-full" title="Archived Tasks" />
            )}
          </div>
        )}
        
        {/* Session indicator (only show if no tasks) */}
        {hasSessions && totalItems === 0 && (
          <div className="absolute bottom-1 right-1">
            <div className="w-2 h-2 bg-yellow-500 dark:bg-yellow-400 rounded-full" title="Has Sessions" />
          </div>
        )}
        
        {/* Task count badge for days with multiple tasks */}
        {totalItems > 1 && (
          <div className="absolute top-1 right-1">
            <div className="text-[10px] font-semibold bg-white dark:bg-gray-800 bg-opacity-80 dark:bg-opacity-80 rounded-full w-4 h-4 flex items-center justify-center">
              {totalItems}
            </div>
          </div>
        )}
      </div>
    );
  };

  const handleDayHover = (day: CalendarDay, event: React.MouseEvent) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setTooltipPosition({
      x: rect.right + window.scrollX + 10,
      y: rect.top + window.scrollY
    });
    setHoveredDay(day);
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const currentMonth = monthNames[currentDate.getMonth()];
  const currentYear = currentDate.getFullYear();

  const handleMonthChange = (monthIndex: number) => {
    try {
      const newDate = new Date(currentDate);
      newDate.setMonth(monthIndex);
      
      // If we have a selected day, try to keep the same day in the new month
      if (selectedDay) {
        const targetDay = selectedDay.getDate();
        const lastDayOfNewMonth = new Date(newDate.getFullYear(), monthIndex + 1, 0).getDate();
        const adjustedDay = Math.min(targetDay, lastDayOfNewMonth);
        
        const adjustedDate = new Date(newDate.getFullYear(), monthIndex, adjustedDay);
        setSelectedDay(adjustedDate);
        onDateSelect(adjustedDate, [], []);
      }
      
      setCurrentDate(newDate);
      setIsMonthPickerOpen(false);
    } catch (e) {
      console.error('Error changing month:', e);
    }
  };

  const handleYearChange = (year: number) => {
    try {
      const newDate = new Date(currentDate);
      newDate.setFullYear(year);
      
      // If we have a selected day, try to keep the same day in the new year
      if (selectedDay) {
        const targetMonth = selectedDay.getMonth();
        const targetDay = selectedDay.getDate();
        const lastDayOfNewMonth = new Date(year, targetMonth + 1, 0).getDate();
        const adjustedDay = Math.min(targetDay, lastDayOfNewMonth);
        
        const adjustedDate = new Date(year, targetMonth, adjustedDay);
        setSelectedDay(adjustedDate);
        onDateSelect(adjustedDate, [], []);
      }
      
      setCurrentDate(newDate);
      setIsYearPickerOpen(false);
    } catch (e) {
      console.error('Error changing year:', e);
    }
  };

  const renderHeader = () => (
    <div className="flex justify-between items-center mb-4">
      <button 
        onClick={() => {
          const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
          setCurrentDate(newDate);
          if (selectedDay) {
            const adjustedDate = new Date(selectedDay);
            adjustedDate.setMonth(adjustedDate.getMonth() - 1);
            setSelectedDay(adjustedDate);
            onDateSelect(adjustedDate, [], []);
          }
        }} 
        className="p-2"
      >
        <span className="text-xl">←</span>
      </button>
      <div className="flex gap-2">
        <div className="relative">
          <button 
            onClick={() => {
              setIsMonthPickerOpen(!isMonthPickerOpen);
              setIsYearPickerOpen(false);
            }}
            className="px-2 py-1 text-lg font-semibold hover:bg-gray-100 rounded"
          >
            {currentMonth}
          </button>
          {isMonthPickerOpen && (
            <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 shadow-lg rounded-lg z-50 grid grid-cols-3 gap-1 p-2 w-48">
              {monthNames.map((month, index) => (
                <button
                  key={month}
                  onClick={() => handleMonthChange(index)}
                  className={`px-2 py-1 text-sm hover:bg-blue-100 rounded ${
                    index === currentDate.getMonth() ? 'bg-blue-500 text-white' : ''
                  }`}
                >
                  {month}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="relative">
          <button 
            onClick={() => {
              setIsYearPickerOpen(!isYearPickerOpen);
              setIsMonthPickerOpen(false);
            }}
            className="px-2 py-1 text-lg font-semibold hover:bg-gray-100 rounded"
          >
            {currentYear}
          </button>
          {isYearPickerOpen && (
            <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 shadow-lg rounded-lg z-50 grid grid-cols-3 gap-1 p-2 w-48 max-h-48 overflow-y-auto">
              {Array.from({ length: 21 }, (_, i) => currentYear - 10 + i).map(year => (
                <button
                  key={year}
                  onClick={() => handleYearChange(year)}
                  className={`px-2 py-1 text-sm hover:bg-blue-100 rounded ${
                    year === currentDate.getFullYear() ? 'bg-blue-500 text-white' : ''
                  }`}
                >
                  {year}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <button 
        onClick={() => {
          const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
          setCurrentDate(newDate);
          if (selectedDay) {
            const adjustedDate = new Date(selectedDay);
            adjustedDate.setMonth(adjustedDate.getMonth() + 1);
            setSelectedDay(adjustedDate);
            onDateSelect(adjustedDate, [], []);
          }
        }} 
        className="p-2"
      >
        <span className="text-xl">→</span>
      </button>
    </div>
  );

  const handleClickOutside = (event: MouseEvent) => {
    const target = event.target as HTMLElement;
    if (!target.closest('.relative')) {
      setIsMonthPickerOpen(false);
      setIsYearPickerOpen(false);
    }
  };

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative space-y-4 w-full">
      {/* Month and Year Navigation */}
      {renderHeader()}

      {/* Legend */}
      <div className="flex items-center justify-end space-x-2 text-sm">
        <button
          onClick={() => setShowLegend(!showLegend)}
          className="text-gray-500 hover:text-gray-700 transition-colors flex items-center gap-1"
        >
          <Info className="w-4 h-4" />
          Legend
        </button>
        <AnimatePresence>
          {showLegend && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="absolute top-full right-0 mt-2 bg-white dark:bg-gray-800 shadow-lg rounded-lg p-3 z-50 w-64"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-300 dark:bg-green-700 rounded" />
                  <span className="text-gray-800 dark:text-gray-200">1 task</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-400 dark:bg-green-600 rounded" />
                  <span className="text-gray-800 dark:text-gray-200">2 tasks</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-500 dark:bg-green-500 rounded" />
                  <span className="text-gray-800 dark:text-gray-200">3-4 tasks</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-600 dark:bg-green-400 rounded" />
                  <span className="text-gray-800 dark:text-gray-200">5+ tasks</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-100 dark:bg-blue-900/60 rounded" />
                  <span className="text-gray-800 dark:text-gray-200">Today</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {onAddItem && (
          <button
            onClick={onAddItem}
            className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Item
          </button>
        )}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1 w-full">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="text-center text-sm font-semibold py-2 text-gray-700 dark:text-gray-300">
            {day}
          </div>
        ))}
        <AnimatePresence>
          {calendarData.weeks.map((week, weekIndex) => (
            <React.Fragment key={weekIndex}>
              {week.days.map((day, dayIndex) => (
                <motion.button
                  key={`${weekIndex}-${dayIndex}`}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => handleDateSelect(day)}
                  className={cn(
                    "aspect-square w-full min-w-[24px] min-h-[24px] p-1 relative focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg transition-all z-10",
                    selectedDay && isSelectedDate(day)
                      ? 'ring-2 ring-blue-500'
                      : ''
                  )}
                  style={{ touchAction: "manipulation" }}
                >
                  {getDayContent(day)}
                </motion.button>
              ))}
            </React.Fragment>
          ))}
        </AnimatePresence>
      </div>

      {/* Hover Tooltip */}
      {hoveredDay && (hoveredDay.activities.activeItems.length > 0 ||
                     hoveredDay.activities.completedTasks.length > 0 ||
                     hoveredDay.activities.archivedItems.length > 0 ||
                     hoveredDay.sessions > 0) && (
        <div 
          className="fixed z-50 bg-white dark:bg-gray-800 shadow-xl rounded-lg p-4 w-72 border border-gray-200 dark:border-gray-700 transform -translate-x-full"
          style={{
            left: `${tooltipPosition.x}px`,
            top: `${tooltipPosition.y}px`,
            maxHeight: '300px',
            overflowY: 'auto'
          }}
        >
          <div className="text-sm font-semibold mb-2 text-gray-900 dark:text-white">
            {hoveredDay.date.toLocaleDateString('default', { 
              month: 'long', 
              day: 'numeric',
              year: 'numeric'
            })}
          </div>
          {hoveredDay.activities.minutes > 0 && (
            <div className="text-sm text-gray-600 dark:text-gray-300 mb-3 flex items-center gap-2 bg-blue-50 dark:bg-blue-900/30 p-2 rounded-md">
              <Clock className="w-4 h-4 text-blue-500 dark:text-blue-400" />
              <span>Total time: <strong>{formatDuration(hoveredDay.activities.minutes)}</strong></span>
            </div>
          )}
          {hoveredDay.activities.activeItems.length > 0 && (
            <div className="mb-3">
              <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1 flex items-center gap-1">
                <div className="w-2 h-2 bg-blue-500 dark:bg-blue-400 rounded-full" />
                Active Tasks ({hoveredDay.activities.activeItems.length}):
              </div>
              <div className="pl-3 border-l-2 border-blue-200 dark:border-blue-800">
                {hoveredDay.activities.activeItems.map(item => (
                  <div key={item.id} className="text-xs text-gray-700 dark:text-gray-300 py-1">{item.title}</div>
                ))}
              </div>
            </div>
          )}
          {hoveredDay.activities.completedTasks.length > 0 && (
            <div className="mb-3">
              <div className="text-xs font-semibold text-green-600 dark:text-green-400 mb-1 flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 dark:bg-green-400 rounded-full" />
                Completed ({hoveredDay.activities.completedTasks.length}):
              </div>
              <div className="pl-3 border-l-2 border-green-200 dark:border-green-800">
                {hoveredDay.activities.completedTasks.map(item => (
                  <div key={item.id} className="text-xs text-gray-700 dark:text-gray-300 py-1">{item.title}</div>
                ))}
              </div>
            </div>
          )}
          {hoveredDay.activities.archivedItems.length > 0 && (
            <div className="mb-3">
              <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 flex items-center gap-1">
                <div className="w-2 h-2 bg-gray-500 dark:bg-gray-400 rounded-full" />
                Archived ({hoveredDay.activities.archivedItems.length}):
              </div>
              <div className="pl-3 border-l-2 border-gray-200 dark:border-gray-700">
                {hoveredDay.activities.archivedItems.map(item => (
                  <div key={item.id} className="text-xs text-gray-700 dark:text-gray-300 py-1">{item.title}</div>
                ))}
              </div>
            </div>
          )}
          {hoveredDay.sessions > 0 && hoveredDay.activities.activeItems.length === 0 && 
           hoveredDay.activities.completedTasks.length === 0 && hoveredDay.activities.archivedItems.length === 0 && (
            <div className="text-sm text-gray-600 dark:text-gray-300 mb-2 flex items-center gap-2 bg-yellow-50 dark:bg-yellow-900/30 p-2 rounded-md">
              <Clock className="w-4 h-4 text-yellow-500 dark:text-yellow-400" />
              <span>Sessions tracked: <strong>{hoveredDay.sessions}</strong></span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export { Calendar };
