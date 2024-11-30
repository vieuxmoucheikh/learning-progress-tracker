import * as React from 'react';
import { useMemo, useState, useEffect, useCallback } from 'react';
import { LearningItem } from '../types';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, CheckCircle2, Clock, Info, ChevronDown, Plus } from 'lucide-react';
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
const getAdjustedDateStr = (date: Date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);  // Set to midnight in local timezone
  return d.toISOString().split('T')[0];
};

// Helper function to format minutes into hours and minutes
const formatDuration = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
};

export function Calendar({ items, onDateSelect, selectedDate: externalSelectedDate, onAddItem }: Props) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isYearPickerOpen, setIsYearPickerOpen] = useState(false);
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Date | null>(externalSelectedDate);
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
        const itemDate = new Date(item.date);
        itemDate.setHours(0, 0, 0, 0);

        if (itemDate.getTime() === currentDate.getTime()) {
          if (item.status === 'completed' && !dayActivities.completedTasks.some(task => task.id === item.id)) {
            dayActivities.completedTasks.push(item);
          } else if (item.status === 'archived' && !dayActivities.archivedItems.some(task => task.id === item.id)) {
            dayActivities.archivedItems.push(item);
          } else if (!dayActivities.activeItems.some(task => task.id === item.id)) {
            dayActivities.activeItems.push(item);
          }
        }

        // Process sessions
        if (item.progress?.sessions) {
          item.progress.sessions.forEach(session => {
            const sessionDate = new Date(session.date);
            sessionDate.setHours(0, 0, 0, 0);

            if (sessionDate.getTime() === currentDate.getTime()) {
              // Convert Time to total minutes
              const sessionDurationMinutes = session.duration 
                ? (session.duration.hours || 0) * 60 + (session.duration.minutes || 0)
                : 0;
              dayActivities.minutes += sessionDurationMinutes;
              dayActivities.sessions++;
            }
          });
        }
      });

      const calendarDay: CalendarDay = {
        date: currentDate,
        minutes: dayActivities.minutes,
        sessions: dayActivities.sessions,
        isCurrentMonth: currentDate.getMonth() === currentDate.getMonth(),
        isToday: currentDate.getTime() === today.getTime(),
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
        .find(day => day.date.getTime() === newSelectedDay.getTime());

      if (selectedDayData) {
        onDateSelect(newSelectedDay, selectedDayData.activities.activeItems, selectedDayData.activities.completedTasks);
      }
    }
  }, [externalSelectedDate, calendarData, onDateSelect]);

  // Handle date selection
  const handleDateSelect = useCallback((day: CalendarDay) => {
    const selectedDate = new Date(day.date);
    selectedDate.setHours(0, 0, 0, 0);
    setSelectedDay(selectedDate);
    onDateSelect(selectedDate, day.activities.activeItems, day.activities.completedTasks);
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
    if (!selectedDay) return false;
    const dayDate = new Date(day.date);
    dayDate.setHours(0, 0, 0, 0);
    const compareDate = new Date(selectedDay);
    compareDate.setHours(0, 0, 0, 0);
    return dayDate.getTime() === compareDate.getTime();
  }, [selectedDay]);

  const getActivityColor = (day: CalendarDay) => {
    const totalItems = 
      day.activities.activeItems.length + 
      day.activities.completedTasks.length + 
      day.activities.archivedItems.length;
    
    if (!day.isCurrentMonth) return 'bg-gray-50 text-gray-400';
    if (isSelectedDate(day)) return 'bg-blue-500 text-white hover:bg-blue-600';
    if (day.isToday) return 'bg-blue-100 hover:bg-blue-200';
    
    // Color based on activity
    if (totalItems === 0 && day.sessions > 0) return 'bg-yellow-100 hover:bg-yellow-200';
    if (totalItems === 0) return 'hover:bg-gray-100';
    
    // Enhanced color scale based on total items
    if (totalItems >= 5) return 'bg-green-600 hover:bg-green-700 text-white';
    if (totalItems >= 3) return 'bg-green-500 hover:bg-green-600 text-white';
    if (totalItems >= 2) return 'bg-green-400 hover:bg-green-500';
    return 'bg-green-300 hover:bg-green-400';
  };

  const getDayContent = (day: CalendarDay) => {
    const hasActiveTasks = day.activities.activeItems.length > 0;
    const hasCompletedTasks = day.activities.completedTasks.length > 0;
    const hasArchivedTasks = day.activities.archivedItems.length > 0;
    const hasSessions = day.sessions > 0;

    return (
      <div 
        className={`relative w-full h-full p-2 ${getActivityColor(day)} rounded-lg transition-colors`}
        onMouseEnter={(e) => setHoveredDay(day)}
        onMouseLeave={() => setHoveredDay(null)}
      >
        <div className="text-sm">{day.date.getDate()}</div>
        <div className="absolute bottom-1 right-1 flex items-center space-x-1">
          {hasActiveTasks && (
            <div className="w-2 h-2 bg-blue-500 rounded-full" title="Active Tasks" />
          )}
          {hasCompletedTasks && (
            <div className="w-2 h-2 bg-green-500 rounded-full" title="Completed Tasks" />
          )}
          {hasArchivedTasks && (
            <div className="w-2 h-2 bg-gray-500 rounded-full" title="Archived Tasks" />
          )}
          {hasSessions && !hasActiveTasks && !hasCompletedTasks && !hasArchivedTasks && (
            <div className="w-2 h-2 bg-yellow-500 rounded-full" title="Has Sessions" />
          )}
        </div>
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

  return (
    <div className="relative space-y-4">
      {/* Month and Year Navigation */}
      <div className="flex justify-between items-center">
        <button
          onClick={() => {
            const newDate = new Date(currentDate);
            newDate.setMonth(newDate.getMonth() - 1);
            setCurrentDate(newDate);
          }}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center space-x-2">
          <div className="relative">
            <button
              onClick={() => setIsMonthPickerOpen(!isMonthPickerOpen)}
              className="text-lg font-semibold hover:bg-gray-100 px-3 py-1 rounded transition-colors flex items-center gap-2"
            >
              {calendarData.month}
              <ChevronDown className="w-4 h-4" />
            </button>
            {isMonthPickerOpen && (
              <div className="absolute top-full left-0 mt-1 bg-white shadow-lg rounded-lg p-2 z-50 grid grid-cols-3 gap-1 w-48">
                {Array.from({ length: 12 }).map((_, i) => {
                  const monthName = new Date(2000, i).toLocaleString('default', { month: 'short' });
                  return (
                    <button
                      key={i}
                      onClick={() => {
                        const newDate = new Date(currentDate);
                        newDate.setMonth(i);
                        setCurrentDate(newDate);
                        setIsMonthPickerOpen(false);
                      }}
                      className={cn(
                        "px-2 py-1 rounded text-sm",
                        currentDate.getMonth() === i
                          ? "bg-blue-100 text-blue-700"
                          : "hover:bg-gray-100"
                      )}
                    >
                      {monthName}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <div className="relative">
            <button
              onClick={() => setIsYearPickerOpen(!isYearPickerOpen)}
              className="text-lg font-semibold hover:bg-gray-100 px-3 py-1 rounded transition-colors flex items-center gap-2"
            >
              {calendarData.year}
              <ChevronDown className="w-4 h-4" />
            </button>
            {isYearPickerOpen && (
              <div className="absolute top-full left-0 mt-1 bg-white shadow-lg rounded-lg p-2 z-50 grid grid-cols-3 gap-1 w-48">
                {Array.from({ length: 10 }, (_, i) => {
                  const year = currentDate.getFullYear() - 5 + i;
                  return (
                    <button
                      key={year}
                      onClick={() => {
                        const newDate = new Date(currentDate);
                        newDate.setFullYear(year);
                        setCurrentDate(newDate);
                        setIsYearPickerOpen(false);
                      }}
                      className={cn(
                        "px-2 py-1 rounded text-sm",
                        currentDate.getFullYear() === year
                          ? "bg-blue-100 text-blue-700"
                          : "hover:bg-gray-100"
                      )}
                    >
                      {year}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        <button
          onClick={() => {
            const newDate = new Date(currentDate);
            newDate.setMonth(newDate.getMonth() + 1);
            setCurrentDate(newDate);
          }}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

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
              className="absolute top-full right-0 mt-2 bg-white shadow-lg rounded-lg p-3 z-50 w-64"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-300 rounded" />
                  <span>1 task</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-400 rounded" />
                  <span>2 tasks</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-500 rounded" />
                  <span>3-4 tasks</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-600 rounded" />
                  <span>5+ tasks</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-100 rounded" />
                  <span>Today</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {onAddItem && (
          <button
            onClick={onAddItem}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Item
          </button>
        )}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="text-center text-sm font-semibold py-2">
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
                    "aspect-square p-1 relative focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg transition-all",
                    selectedDay && isSelectedDate(day)
                      ? 'ring-2 ring-blue-500'
                      : ''
                  )}
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
                     hoveredDay.activities.archivedItems.length > 0) && (
        <div 
          className="fixed z-50 bg-white shadow-lg rounded-lg p-3 w-64 border transform -translate-x-full"
          style={{
            left: `${tooltipPosition.x}px`,
            top: `${tooltipPosition.y}px`,
            maxHeight: '300px',
            overflowY: 'auto'
          }}
        >
          <div className="text-sm font-semibold mb-2">
            {hoveredDay.date.toLocaleDateString('default', { 
              month: 'long', 
              day: 'numeric',
              year: 'numeric'
            })}
          </div>
          {hoveredDay.activities.minutes > 0 && (
            <div className="text-sm text-gray-600 mb-2 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Total time: {formatDuration(hoveredDay.activities.minutes)}
            </div>
          )}
          {hoveredDay.activities.activeItems.length > 0 && (
            <div className="mb-2">
              <div className="text-xs font-semibold text-blue-500 mb-1 flex items-center gap-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full" />
                Active Tasks ({hoveredDay.activities.activeItems.length}):
              </div>
              <div className="pl-3 border-l-2 border-blue-100">
                {hoveredDay.activities.activeItems.map(item => (
                  <div key={item.id} className="text-xs text-gray-600 py-0.5">{item.title}</div>
                ))}
              </div>
            </div>
          )}
          {hoveredDay.activities.completedTasks.length > 0 && (
            <div className="mb-2">
              <div className="text-xs font-semibold text-green-500 mb-1 flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                Completed ({hoveredDay.activities.completedTasks.length}):
              </div>
              <div className="pl-3 border-l-2 border-green-100">
                {hoveredDay.activities.completedTasks.map(item => (
                  <div key={item.id} className="text-xs text-gray-600 py-0.5">{item.title}</div>
                ))}
              </div>
            </div>
          )}
          {hoveredDay.activities.archivedItems.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-gray-500 mb-1 flex items-center gap-1">
                <div className="w-2 h-2 bg-gray-500 rounded-full" />
                Archived ({hoveredDay.activities.archivedItems.length}):
              </div>
              <div className="pl-3 border-l-2 border-gray-100">
                {hoveredDay.activities.archivedItems.map(item => (
                  <div key={item.id} className="text-xs text-gray-600 py-0.5">{item.title}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
