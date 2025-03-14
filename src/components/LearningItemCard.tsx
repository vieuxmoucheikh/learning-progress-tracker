import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Badge } from '../components/ui/badge';
import { 
  Play, 
  Square, 
  Clock, 
  ChevronDown, 
  ChevronUp, 
  Trash2, 
  Edit, 
  CheckCircle2, 
  X, 
  StopCircle, 
  MoreVertical, 
  BookOpen, 
  StickyNote, 
  Pause,
  Download,
  AlertCircle,
  Save,
  ExternalLink,
  MessageSquare,
  Calendar,
  Pencil,
  Copy,
  CheckCheck,
  Plus
} from 'lucide-react';
// @ts-ignore
import html2pdf, { Html2PdfOptions, ImageType, JsPdfUnit, JsPdfFormat, JsPdfOrientation } from 'html2pdf.js';
import type { LearningItem, Session } from '../types';
import { formatTime, calculateProgress, formatDuration, getTotalMinutes, calculateDuration } from '../lib/utils';
import clsx from 'clsx';
import { useSessionTimer } from '../hooks/useSessionTimer';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import './LearningItemCard.css';

interface Props {
  item: LearningItem;
  onUpdate: (id: string, updates: Partial<LearningItem>) => void;
  onDelete: (id: string) => void;
  onStartTracking: (id: string) => void;
  onStopTracking: (id: string) => void;
  onNotesUpdate: (id: string, notes: string) => void;
  onSetActiveItem: (id: string | null) => void;
  onSessionNoteAdd: (id: string, note: string) => void;
}

interface LocalSession {
  startTime: string;
  endTime?: string;
  duration?: {
    hours: number;
    minutes: number;
  };
  hours: number;
  minutes: number;
  date: string;
  notes?: (string | { content: string; timestamp: string })[];
  title?: string;
  description?: string;
  status: 'in_progress' | 'completed' | 'on_hold';
}

interface Time {
  hours: number;
  minutes: number;
}

const calculateTotalTimeSpent = (item: LearningItem) => {
  const sessions = item.progress?.sessions || [];
  return sessions.reduce((total, session) => {
    const duration = session.duration;
    if (duration) {
      return total + (duration.hours * 60) + duration.minutes;
    }
    return total;
  }, 0);
};

const LearningItemCard = ({ item, onUpdate, onDelete, onStartTracking, onStopTracking, onNotesUpdate, onSetActiveItem, onSessionNoteAdd }: Props) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(item.title);
  const [editedNotes, setEditedNotes] = useState(item.notes || '');
  const [showHistory, setShowHistory] = useState(false);
  const [sessionNote, setSessionNote] = useState('');
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  const [showAllSessions, setShowAllSessions] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingNote, setEditingNote] = useState<{ sessionIndex: number; noteIndex: number; content: string } | null>(null);
  const [showEditNoteDialog, setShowEditNoteDialog] = useState(false);
  const [isTimeEditing, setIsTimeEditing] = useState(false);
  const [editedMinutes, setEditedMinutes] = useState(calculateTotalTimeSpent(item));
  const [pausedTime, setPausedTime] = useState<string | null>(null);
  const [isUrlEditing, setIsUrlEditing] = useState(false);
  const [editedUrl, setEditedUrl] = useState(item.url || '');
  const [copySuccess, setCopySuccess] = useState(false);
  const [isTitleEditing, setIsTitleEditing] = useState(false);
  
  // Ajouter des états pour la section URL du bas
  const [isFooterUrlEditing, setIsFooterUrlEditing] = useState(false);
  const [editedFooterUrl, setEditedFooterUrl] = useState(item.url || '');
  const [copyFooterSuccess, setCopyFooterSuccess] = useState(false);

  const getActiveSession = () => {
    if (!item.progress?.sessions) return null;
    return item.progress.sessions.find(s => !s.endTime);
  };
  
  const activeSession = getActiveSession();
  const [isPausedState, setIsPausedState] = useState(activeSession?.status === 'on_hold');
  
  // Use the session timer hook to track elapsed time
  const { formattedTime, isPaused, setIsPaused, handleResume } = useSessionTimer({
    isActive: !!activeSession,
    startTime: activeSession?.startTime || null,
    externalPaused: isPausedState,
    itemId: item.id
  });

  // Keep isPausedState in sync with the timer's isPaused
  useEffect(() => {
    setIsPausedState(isPaused);
  }, [isPaused]);

  // Initialize paused time from localStorage when component mounts
  useEffect(() => {
    // Check if we should be in paused state
    const isPausedFromStorage = localStorage.getItem(`sessionIsPaused_${item.id}`) === 'true';
    const isPausedFromSession = activeSession?.status === 'on_hold';
    const hasPauseTime = !!localStorage.getItem(`sessionPauseTime_${item.id}`);
    
    // If any of these conditions is true, the session should be paused
    const shouldBePaused = isPausedFromStorage || isPausedFromSession || hasPauseTime;
    
    console.log('Initial pause state detection:', { 
      isPausedFromStorage, 
      isPausedFromSession, 
      hasPauseTime, 
      shouldBePaused 
    });
    
    if (shouldBePaused) {
      console.log('Session should be paused, setting paused state');
      setIsPausedState(true);
      setIsPaused(true);
      
      // Also try to restore pausedTime
      const pauseTimeDisplay = localStorage.getItem(`sessionPauseTimeDisplay_${item.id}`);
      if (pauseTimeDisplay) {
        console.log('Restoring pause time display:', pauseTimeDisplay);
        setPausedTime(pauseTimeDisplay);
      } else {
        // Try to get from frozen time
        const frozenTimeStr = localStorage.getItem(`sessionFrozenTime_${item.id}`);
        if (frozenTimeStr) {
          const frozenTime = parseInt(frozenTimeStr, 10);
          const formatted = formatSecondsToHHMMSS(frozenTime);
          setPausedTime(formatted);
          console.log('Created pause time display from frozen time:', formatted);
          localStorage.setItem(`sessionPauseTimeDisplay_${item.id}`, formatted);
        }
      }
    }
  }, [item.id, activeSession, setIsPaused]);

  // Handle session persistence and cleanup
  useEffect(() => {
    const storedSessionStr = localStorage.getItem(`activeSession_${item.id}`);
    const lastUpdateStr = localStorage.getItem(`sessionLastUpdate_${item.id}`);
    
    if (storedSessionStr) {
      try {
        const storedSession = JSON.parse(storedSessionStr);
        const lastUpdate = lastUpdateStr ? parseInt(lastUpdateStr, 10) : null;
        const now = Date.now();
        
        // Check if session is stale (no updates in last 24 hours)
        const isStaleSession = lastUpdate && (now - lastUpdate) > 24 * 60 * 60 * 1000;
        
        const isAlreadyInSessions = item.progress?.sessions?.some(
          s => s.startTime === storedSession.startTime
        );
        
        if (!isAlreadyInSessions && !storedSession.endTime && !isStaleSession) {
          // Valid active session - restore it
          onUpdate(item.id, {
            progress: {
              ...item.progress,
              sessions: [storedSession, ...(item.progress?.sessions || [])]
            }
          });
          onStartTracking(item.id);
          onSetActiveItem(item.id);
        } else {
          // Clean up stale or duplicate session
          if (isStaleSession && !storedSession.endTime) {
            // Auto-end stale session
            const endedSession = {
              ...storedSession,
              endTime: new Date(lastUpdate || now).toISOString(),
              status: 'completed' as const
            };
            onUpdate(item.id, {
              progress: {
                ...item.progress,
                sessions: [endedSession, ...(item.progress?.sessions || [])]
              }
            });
          }
          localStorage.removeItem(`activeSession_${item.id}`);
          localStorage.removeItem(`sessionLastUpdate_${item.id}`);
        }
      } catch (error) {
        console.error('Error restoring session:', error);
        localStorage.removeItem(`activeSession_${item.id}`);
        localStorage.removeItem(`sessionLastUpdate_${item.id}`);
      }
    }
  }, [item.id]);

  // Update the localStorage session data periodically to prevent it from being marked as stale
  useEffect(() => {
    if (!activeSession) return;
    
    // Update the session data in localStorage every minute
    const updateInterval = setInterval(() => {
      localStorage.setItem(`sessionLastUpdate_${item.id}`, Date.now().toString());
      
      // Also update the active session data
      localStorage.setItem(`activeSession_${item.id}`, JSON.stringify({
        ...activeSession,
        status: isPausedState ? 'on_hold' : 'in_progress'
      }));
      
      console.log('Updated session last update time:', new Date().toISOString());
    }, 60000); // Every minute
    
    return () => {
      clearInterval(updateInterval);
    };
  }, [activeSession, item.id, isPausedState]);

  // Handle session start
  const handleStartSession = useCallback(() => {
    if (activeSession || !item.progress) return; // Prevent multiple active sessions
    
    console.log('Starting new session...');
    
    // IMPORTANT: Reset all timer state in localStorage
    localStorage.removeItem(`sessionFrozenTime_${item.id}`);
    localStorage.removeItem(`sessionPauseTime_${item.id}`);
    localStorage.removeItem(`sessionPauseTimeDisplay_${item.id}`);
    localStorage.removeItem(`sessionCurrentTimeFormatted_${item.id}`);
    localStorage.removeItem(`sessionCurrentTimeSeconds_${item.id}`);
    localStorage.removeItem(`sessionIsPaused_${item.id}`);
    localStorage.removeItem(`sessionAccumulatedTime_${item.id}`);
    
    // Set accumulated time to 0 for a fresh start
    localStorage.setItem(`sessionAccumulatedTime_${item.id}`, '0');
    
    const now = new Date();
    const newSession: LocalSession = {
      startTime: now.toISOString(),
      date: now.toISOString().split('T')[0],
      hours: 0,
      minutes: 0,
      notes: [],
      status: 'in_progress'
    };
    
    // Store the new session in localStorage for persistence
    localStorage.setItem(`activeSession_${item.id}`, JSON.stringify(newSession));
    localStorage.setItem(`sessionLastUpdate_${item.id}`, Date.now().toString());
    
    // Update the item with the new session
    onUpdate(item.id, {
      progress: {
        ...item.progress,
        sessions: [newSession, ...(item.progress.sessions || [])]
      }
    });
    
    // Notify parent components
    onStartTracking(item.id);
    onSetActiveItem(item.id);
    
    // Reset any paused state
    setPausedTime(null);
    setIsPausedState(false);
    setIsPaused(false);
    
    console.log('New session started with ID:', item.id);
  }, [item, onStartTracking, onSetActiveItem, onUpdate, activeSession, setIsPaused]);

  // Handle session pause
  const handlePauseSession = useCallback(() => {
    if (!activeSession || !item.progress?.sessions) return;
    
    console.log('Pausing session...');
    
    // Record the pause time
    const pauseTime = Date.now();
    localStorage.setItem(`sessionPauseTime_${item.id}`, pauseTime.toString());
    
    // Calculate elapsed time up to the pause point for storage
    const startTime = new Date(activeSession.startTime).getTime();
    const accumulatedTimeStr = localStorage.getItem(`sessionAccumulatedTime_${item.id}`);
    const accumulatedTime = accumulatedTimeStr ? parseInt(accumulatedTimeStr, 10) : 0;
    const elapsedUntilPause = Math.floor((pauseTime - startTime) / 1000) - accumulatedTime;
    
    // Store the frozen time and formatted display
    const currentFormattedTime = formatSecondsToHHMMSS(Math.max(0, elapsedUntilPause));
    localStorage.setItem(`sessionFrozenTime_${item.id}`, Math.max(0, elapsedUntilPause).toString());
    localStorage.setItem(`sessionCurrentTimeSeconds_${item.id}`, Math.max(0, elapsedUntilPause).toString());
    localStorage.setItem(`sessionCurrentTimeFormatted_${item.id}`, currentFormattedTime);
    localStorage.setItem(`sessionPauseTimeDisplay_${item.id}`, currentFormattedTime);
    
    // Also store an explicit pause state flag to ensure it persists through navigation
    localStorage.setItem(`sessionIsPaused_${item.id}`, 'true');
    
    // Update the local state immediately to show the paused time
    setPausedTime(currentFormattedTime);
    
    // CRITICAL: Force the timer to stop immediately by setting both state variables
    // This must happen BEFORE updating the session to ensure the timer stops
    setIsPausedState(true);
    setIsPaused(true);
    
    // Update the session status to on_hold
    const updatedSessions = [...item.progress.sessions];
    const sessionIndex = updatedSessions.findIndex(s => !s.endTime);
    
    if (sessionIndex !== -1) {
      updatedSessions[sessionIndex] = {
        ...updatedSessions[sessionIndex],
        status: 'on_hold'
      };
      
      onUpdate(item.id, {
        progress: {
          ...item.progress,
          sessions: updatedSessions
        }
      });
    }
  }, [item, activeSession, onUpdate, setIsPaused]);

  // Handle session resume
  const handleResumeSession = useCallback(() => {
    if (!item.progress?.sessions) return;
    
    console.log('Resuming session...');
    
    // Find the paused session
    const pausedSession = item.progress.sessions.find(s => s.status === 'on_hold' && !s.endTime);
    if (!pausedSession) return;
    
    // Get the pause time from localStorage
    const pauseTimeStr = localStorage.getItem(`sessionPauseTime_${item.id}`);
    const pauseTime = pauseTimeStr ? parseInt(pauseTimeStr, 10) : null;
    
    // Calculate accumulated time (time spent paused)
    if (pauseTime) {
      const now = Date.now();
      const pauseDuration = Math.floor((now - pauseTime) / 1000);
      
      // Get existing accumulated time
      const accumulatedTimeStr = localStorage.getItem(`sessionAccumulatedTime_${item.id}`);
      const accumulatedTime = accumulatedTimeStr ? parseInt(accumulatedTimeStr, 10) : 0;
      
      // Add pause duration to accumulated time
      const newAccumulatedTime = accumulatedTime + pauseDuration;
      localStorage.setItem(`sessionAccumulatedTime_${item.id}`, newAccumulatedTime.toString());
      console.log(`Updated accumulated time: ${accumulatedTime} + ${pauseDuration} = ${newAccumulatedTime} seconds`);
    }
    
    // Clear pause markers
    localStorage.removeItem(`sessionPauseTime_${item.id}`);
    localStorage.removeItem(`sessionPauseTimeDisplay_${item.id}`);
    
    // Also remove the explicit pause state flag
    localStorage.removeItem(`sessionIsPaused_${item.id}`);
    
    // Update local state
    setPausedTime(null);
    setIsPausedState(false);
    setIsPaused(false);
    
    // Resume the timer
    handleResume();
    
    // Update the session status to in_progress
    const updatedSessions = [...item.progress.sessions];
    const sessionIndex = updatedSessions.findIndex(s => s.status === 'on_hold' && !s.endTime);
    
    if (sessionIndex !== -1) {
      updatedSessions[sessionIndex] = {
        ...updatedSessions[sessionIndex],
        status: 'in_progress'
      };
      
      // Update the session first so database is updated
      onUpdate(item.id, {
        progress: {
          ...item.progress,
          sessions: updatedSessions
        }
      });
    }
  }, [item, setIsPaused, onUpdate, handleResume]);

  // Handle session stop
  const handleStopSession = useCallback(() => {
    if (!activeSession || !item.progress?.sessions) return;

    // Get the current elapsed time directly from our centralized source
    let totalSessionTime = 0;
    
    // If we're paused, use the frozen time
    if (activeSession.status === 'on_hold') {
      // Use the frozen time for consistent calculations
      const frozenTimeStr = localStorage.getItem(`sessionFrozenTime_${item.id}`);
      if (frozenTimeStr) {
        totalSessionTime = parseInt(frozenTimeStr, 10);
      } else {
        // Fallback to pause time if frozen time is not available
        const pauseTimeStr = localStorage.getItem(`sessionPauseTime_${item.id}`);
        const startTime = new Date(activeSession.startTime).getTime();
        if (pauseTimeStr && !isNaN(startTime)) {
          const pauseTime = parseInt(pauseTimeStr, 10);
          // Get accumulated time from previous pauses
          const accumulatedTimeStr = localStorage.getItem(`sessionAccumulatedTime_${item.id}`);
          const accumulatedTime = accumulatedTimeStr ? parseInt(accumulatedTimeStr, 10) : 0;
          
          // Calculate elapsed time up to the pause point
          totalSessionTime = Math.floor((pauseTime - startTime) / 1000) - accumulatedTime;
        }
      }
    } else {
      // For active sessions, use the current time from our centralized source
      const currentTimeSecondsStr = localStorage.getItem(`sessionCurrentTimeSeconds_${item.id}`);
      if (currentTimeSecondsStr) {
        totalSessionTime = parseInt(currentTimeSecondsStr, 10);
      } else {
        // Fallback to calculating from start time with accumulated pauses
        const startTime = new Date(activeSession.startTime).getTime();
        const now = Date.now();
        
        // Get accumulated time from previous pauses
        const accumulatedTimeStr = localStorage.getItem(`sessionAccumulatedTime_${item.id}`);
        const accumulatedTime = accumulatedTimeStr ? parseInt(accumulatedTimeStr, 10) : 0;
        
        // Calculate total time accounting for pauses
        totalSessionTime = Math.floor((now - startTime) / 1000) - accumulatedTime;
      }
    }
    
    // Ensure we have a positive value
    totalSessionTime = Math.max(0, totalSessionTime);
    
    // Calculate final duration in minutes (rounding down)
    const durationMinutes = Math.floor(totalSessionTime / 60);
    
    // Create end time
    const endDate = new Date();
    
    // Update the session
    const updatedSessions = [...item.progress.sessions];
    const sessionIndex = updatedSessions.findIndex(s => !s.endTime);
    
    if (sessionIndex !== -1) {
      updatedSessions[sessionIndex] = {
        ...updatedSessions[sessionIndex],
        endTime: endDate.toISOString(),
        status: 'completed',
        duration: {
          hours: Math.floor(durationMinutes / 60),
          minutes: durationMinutes % 60
        },
      };
      
      // Clean up all localStorage entries related to this session
      localStorage.removeItem(`sessionLastUpdate_${item.id}`);
      localStorage.removeItem(`sessionPauseTime_${item.id}`);
      localStorage.removeItem(`sessionAccumulatedTime_${item.id}`);
      localStorage.removeItem(`sessionPauseTimeDisplay_${item.id}`);
      localStorage.removeItem(`sessionFrozenTime_${item.id}`);
      localStorage.removeItem(`sessionCurrentTimeSeconds_${item.id}`);
      localStorage.removeItem(`sessionCurrentTimeFormatted_${item.id}`);
      
      // Reset timer state
      setPausedTime(null);
      setIsPausedState(false);
      
      // Update the learning item
      onUpdate(item.id, {
        progress: {
          ...item.progress,
          sessions: updatedSessions,
        },
        status: 'in_progress' // Use a valid status value from the type definition
      });
    }
  }, [item, activeSession, onUpdate]);

  const handleAddNote = useCallback(() => {
    if (!sessionNote.trim() || !activeSession) return;

    const sessions = item.progress?.sessions || [];
    
    const updatedSessions = sessions.map(session => {
      if (session.startTime === activeSession.startTime) {
        return {
          ...session,
          notes: [...(session.notes || []), sessionNote.trim()]
        };
      }
      return session;
    });

    onUpdate(item.id, {
      progress: {
        ...item.progress,
        sessions: updatedSessions
      }
    });

    onSessionNoteAdd(item.id, sessionNote);
    setSessionNote('');
    setShowNoteDialog(false);
  }, [item.id, item.progress, sessionNote, onSessionNoteAdd, onUpdate, activeSession]);

  const handleSaveNotes = () => {
    onNotesUpdate(item.id, editedNotes);
    setIsEditing(false);
  };

  const handleTitleSave = () => {
    if (editedTitle.trim() !== item.title) {
      onUpdate(item.id, { title: editedTitle.trim() });
    }
    setIsTitleEditing(false);
  };

  const handleDeleteClick = () => {
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = useCallback(() => {
    // Clean up any localStorage items first
    localStorage.removeItem(`activeSession_${item.id}`);
    localStorage.removeItem(`sessionLastUpdate_${item.id}`);
    localStorage.removeItem(`sessionPauseTime_${item.id}`);
    localStorage.removeItem(`sessionPauseTimeDisplay_${item.id}`);
    localStorage.removeItem(`sessionFrozenTime_${item.id}`);
    
    // Stop tracking if item is being tracked
    if (activeSession) {
      onStopTracking(item.id);
    }
    
    // Reset UI state
    setShowHistory(false);
    setShowNoteDialog(false);
    setIsEditing(false);
    setShowDeleteDialog(false);
    
    // Finally delete the item
    onDelete(item.id);
  }, [item.id, activeSession, onStopTracking, onDelete]);

  const handleCancelDelete = () => {
    setShowDeleteDialog(false);
  };

  const handleToggleComplete = () => {
    onUpdate(item.id, { completed: !item.completed });
  };

  const handleMarkComplete = () => {
    onUpdate(item.id, {
      status: item.status === 'completed' ? 'not_started' : 'completed',
      completed: item.status === 'completed' ? false : true
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const calculateProgress = useCallback(() => {
    if (!item.progress?.total) return 0;
    
    const totalSpentMinutes = calculateTotalTimeSpent(item);
    const totalTargetMinutes = item.progress.total.minutes;
    
    if (totalTargetMinutes === 0) return 0;
    return Math.min(Math.round((totalSpentMinutes / totalTargetMinutes) * 100), 100);
  }, [item.progress?.total, calculateTotalTimeSpent]);

  const getProgressPercentage = () => {
    if (!item.progress?.total) return 0;
    
    const totalSpentMinutes = calculateTotalTimeSpent(item);
    const totalTargetMinutes = item.progress.total.minutes;
    
    if (totalTargetMinutes === 0) return 0;
    return Math.min(Math.round((totalSpentMinutes / totalTargetMinutes) * 100), 100);
  };

  const formatDuration = (duration: Time | undefined) => {
    if (!duration) return '0m';
    const minutes = duration.minutes || 0;
    return `${minutes}m`;
  };

  const handleTimeEdit = () => {
    setIsTimeEditing(true);
    setEditedMinutes(calculateTotalTimeSpent(item));
  };

  const handleTimeCancel = () => {
    setIsTimeEditing(false);
    setEditedMinutes(calculateTotalTimeSpent(item));
  };

  const handleTimeSave = () => {
    const minutes = Math.max(0, editedMinutes);
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    // Create or update a session with the edited time
    const updatedSessions = item.progress?.sessions || [];
    if (updatedSessions.length === 0) {
      // If no sessions exist, create a new completed session
      updatedSessions.push({
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
        duration: {
          hours,
          minutes: remainingMinutes
        },
        date: new Date().toISOString().split('T')[0] // Add this line
      });
    } else {
      // Update the last session's duration
      const lastSession = updatedSessions[updatedSessions.length - 1];
      lastSession.duration = {
        hours,
        minutes: remainingMinutes
      };
    }

    // Update the sessions in the progress
    onUpdate(item.id, {
      progress: {
        ...item.progress,
        sessions: updatedSessions
      }
    });
    
    setIsTimeEditing(false);
  };

  const renderSessionHistory = () => {
    if (!item.progress?.sessions?.length) {
      return (
        <div className="text-sm text-muted-foreground italic">
          No sessions recorded yet
        </div>
      );
    }

    // Sort sessions chronologically (newest first)
    const sessions = [...item.progress.sessions].sort((a, b) => 
      new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    );
    
    const activeSession = sessions.find(s => !s.endTime);
    const displaySessions = showAllSessions 
      ? sessions
      : sessions.slice(0, activeSession ? 2 : 1);
    
    return (
      <div className="space-y-4 overflow-hidden">
        {displaySessions.map((session, sessionIndex) => {
          const startDate = new Date(session.startTime);
          const endDate = session.endTime ? new Date(session.endTime) : null;
          const duration = session.duration || { hours: 0, minutes: 0 };
          const formattedDuration = `${duration.hours}h ${duration.minutes}m`;
          const totalSessions = item.progress!.sessions!.length;
          const sessionNumber = totalSessions - sessionIndex;
          
          return (
            <div 
              key={session.startTime}
              className={clsx(
                "border rounded-xl p-5 space-y-4",
                "bg-gradient-to-br from-white to-gray-50/30 dark:from-gray-900 to-gray-800/30",
                "hover:from-gray-50 hover:to-white transition-all dark:hover:from-gray-800 dark:hover:to-gray-900",
                "shadow-sm hover:shadow-md",
                "relative overflow-hidden",
                !session.endTime && "border-l-4 border-l-blue-400 dark:border-l-blue-500"
              )}
            >
              {/* Session Status Indicator */}
              <div className={clsx(
                "absolute top-0 right-0 w-24 h-24 -mr-12 -mt-12 transform rotate-45",
                !session.endTime && session.status === 'in_progress' && "bg-blue-500/10 dark:bg-blue-500/20",
                !session.endTime && session.status === 'on_hold' && "bg-yellow-500/10 dark:bg-yellow-500/20",
                session.endTime && "bg-green-500/10 dark:bg-green-500/20"
              )} />

              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={clsx(
                    "font-semibold text-lg",
                    !session.endTime && session.status === 'in_progress' && "text-blue-600 dark:text-blue-400",
                    !session.endTime && session.status === 'on_hold' && "text-yellow-600 dark:text-yellow-400",
                    session.endTime && "text-gray-700 dark:text-gray-300"
                  )}>
                    Session {sessionNumber}
                  </div>
                  <Badge 
                    variant={session.endTime ? "secondary" : session.status === 'on_hold' ? "outline" : "default"} 
                    className={clsx(
                      "capitalize font-medium",
                      !session.endTime && session.status === 'in_progress' && "bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-800/30 dark:text-blue-300",
                      !session.endTime && session.status === 'on_hold' && "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-800/30 dark:text-yellow-300",
                      session.endTime && "bg-green-50 text-green-700 dark:bg-green-800/30 dark:text-green-300"
                    )}
                  >
                    {session.endTime ? "Completed" : session.status === 'on_hold' ? "On Hold" : "In Progress"}
                  </Badge>
                </div>
                <div className="text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100/80 dark:bg-gray-800/80 px-3 py-1.5 rounded-full shadow-sm">
                  {formattedDuration}
                </div>
              </div>
              
              {/* Timing Information */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-1.5 bg-white/50 dark:bg-gray-800/50 rounded-lg p-3 border border-gray-100 dark:border-gray-700">
                  <div className="text-gray-500 dark:text-gray-400 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-blue-500 dark:text-blue-400" />
                    Started
                  </div>
                  <div className="font-medium text-gray-700 dark:text-gray-300">{startDate.toLocaleString()}</div>
                </div>
                {endDate && (
                  <div className="space-y-1.5 bg-white/50 dark:bg-gray-800/50 rounded-lg p-3 border border-gray-100 dark:border-gray-700">
                    <div className="text-gray-500 dark:text-gray-400 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500 dark:text-green-400" />
                      Ended
                    </div>
                    <div className="font-medium text-gray-700 dark:text-gray-300">{endDate.toLocaleString()}</div>
                  </div>
                )}
              </div>

              {/* Notes */}
              {(Array.isArray(session.notes) || item.notes) && (
                <div className="space-y-3 overflow-hidden">
                  <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <StickyNote className="h-4 w-4 text-amber-500 dark:text-amber-400" />
                    Notes
                  </div>
                  <ul className="space-y-2 overflow-hidden">
                    {Array.isArray(session.notes) && session.notes.map((note, noteIndex) => (
                      <li 
                        key={noteIndex} 
                        className={clsx(
                          "group relative text-sm p-3 rounded-lg",
                          "bg-gradient-to-r from-amber-50 to-amber-50/30 dark:from-amber-900 to-amber-800/30",
                          "border border-amber-100/50 dark:border-amber-800/50",
                          "hover:from-amber-100/50 hover:to-amber-50/50 transition-colors dark:hover:from-amber-800/50 dark:hover:to-amber-900/50",
                          "overflow-hidden"
                        )}
                      >
                        <div className="pr-8 max-w-full">
                          <p className="text-gray-700 dark:text-gray-300 break-words whitespace-pre-line overflow-hidden">
                            {typeof note === 'string' ? note : note.content}
                          </p>
                        </div>
                        <button
                          onClick={() => openEditNoteDialog(sessionIndex, noteIndex, typeof note === 'string' ? note : note.content)}
                          className={clsx(
                            "absolute top-2 right-2 p-1.5 rounded-md",
                            "bg-white/80 dark:bg-gray-800/80 hover:bg-white dark:hover:bg-gray-700 shadow-sm",
                            "text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400",
                            "transition-all duration-200",
                            "opacity-100 md:opacity-0 md:group-hover:opacity-100"
                          )}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      </li>
                    ))}
                    {sessionIndex === 0 && item.notes && (
                      <li className={clsx(
                        "text-sm p-3 rounded-lg",
                        "bg-gradient-to-r from-amber-50 to-amber-50/30 dark:from-amber-900 to-amber-800/30",
                        "border border-amber-100/50 dark:border-amber-800/50",
                        "hover:from-amber-100/50 hover:to-amber-50/50 transition-colors dark:hover:from-amber-800/50 dark:hover:to-amber-900/50",
                        "overflow-hidden"
                      )}>
                        <div className="max-w-full">
                          <p className="text-gray-700 dark:text-gray-300 break-words whitespace-pre-line overflow-hidden">
                            {item.notes}
                          </p>
                        </div>
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const getSessionTimeDisplay = useCallback(() => {
    if (!activeSession) return '00:00:00';
    
    // If we're actively paused, use the pause time display
    if (isPausedState || activeSession.status === 'on_hold') {
      // First use local state if available
      if (pausedTime) {
        console.log('Using local paused time for display:', pausedTime);
        return pausedTime;
      }
      
      // Then check localStorage for pause time display
      const pauseTimeDisplay = localStorage.getItem(`sessionPauseTimeDisplay_${item.id}`);
      if (pauseTimeDisplay) {
        console.log('Using stored pause time display:', pauseTimeDisplay);
        return pauseTimeDisplay;
      }
      
      // Final fallback: check for frozen time when paused
      const frozenTimeStr = localStorage.getItem(`sessionFrozenTime_${item.id}`);
      if (frozenTimeStr) {
        const frozenTime = parseInt(frozenTimeStr, 10);
        const formatted = formatSecondsToHHMMSS(frozenTime);
        return formatted;
      }
    }
    
    // If we're not paused, always use the current formatted time
    // This ensures the time is always updating when the timer is running
    return formattedTime;
  }, [activeSession, formattedTime, isPausedState, pausedTime, item.id]);

  const [displayTime, setDisplayTime] = useState('00:00:00');
  
  useEffect(() => {
    const time = getSessionTimeDisplay();
    setDisplayTime(time);
    
    // If the session is running (not paused), set up a frequent update
    // This helps ensure the time display is updated even if formattedTime 
    // doesn't trigger a re-render
    if (activeSession && activeSession.status === 'in_progress' && !isPausedState) {
      const intervalId = setInterval(() => {
        setDisplayTime(getSessionTimeDisplay());
      }, 100);
      
      return () => clearInterval(intervalId);
    }
  }, [activeSession, isPausedState, getSessionTimeDisplay]);

  const renderDuration = () => {
    const totalCurrentMinutes = calculateTotalTimeSpent(item);
    
    if (isTimeEditing) {
      return (
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min="0"
              value={editedMinutes}
              onChange={(e) => setEditedMinutes(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-20 text-sm border-blue-200 focus:ring-blue-500 dark:border-blue-700 dark:bg-gray-800 dark:text-white"
            />
            <span className="text-sm text-gray-600 dark:text-gray-300">min</span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleTimeSave}
              className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:text-green-300 dark:hover:bg-green-900/30"
            >
              <Save className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleTimeCancel}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/30"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2 group">
        <div className="flex items-center gap-1.5">
          <Clock className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
            {totalCurrentMinutes}m (Total minutes)
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleTimeEdit}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-500 hover:text-gray-700 hover:bg-gray-50 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700/50"
        >
          <Edit className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  };

  // Helper function to format seconds to HH:MM:SS
  const formatSecondsToHHMMSS = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    const pad = (num: number) => num.toString().padStart(2, '0');
    return `${pad(hours)}:${pad(minutes)}:${pad(secs)}`;
  };

  const handleEditNote = useCallback(() => {
    if (!editingNote || !item.progress?.sessions) return;

    const { sessionIndex, noteIndex, content } = editingNote;
    const updatedSessions = [...item.progress.sessions];
    
    if (updatedSessions[sessionIndex]?.notes) {
      updatedSessions[sessionIndex].notes[noteIndex] = content.trim();
      
      onUpdate(item.id, {
        progress: {
          ...item.progress,
          sessions: updatedSessions
        }
      });
    }

    setShowEditNoteDialog(false);
    setEditingNote(null);
  }, [editingNote, item.id, item.progress, onUpdate]);

  const openEditNoteDialog = (sessionIndex: number, noteIndex: number, content: string) => {
    setEditingNote({ sessionIndex, noteIndex, content });
    setShowEditNoteDialog(true);
  };

  const handleOpenNoteDialog = () => {
    setShowNoteDialog(true);
    setSessionNote('');
  };

  const handleCloseNoteDialog = () => {
    setShowNoteDialog(false);
    setSessionNote('');
  };

  const handleAddNoteSubmit = () => {
    handleAddNote();
    handleCloseNoteDialog();
  };

  const getBorderColorClass = () => {
    if (!item.status) {
      return 'border-gray-300 dark:border-gray-700';
    }

    switch (item.status) {
      case 'not_started':
        return 'border-gray-300 dark:border-gray-700';
      case 'in_progress':
        return 'border-blue-400 dark:border-blue-500';
      case 'completed':
        return 'border-green-400 dark:border-green-500';
      case 'on_hold':
        return 'border-yellow-400 dark:border-yellow-500';
      case 'archived':
        return 'border-gray-400 dark:border-gray-700';
      default:
        return 'border-gray-300 dark:border-gray-700';
    }
  };

  const getStatusBadgeClass = () => {
    if (!item.status) {
      return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300';
    }

    switch (item.status) {
      case 'not_started':
        return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300';
      case 'in_progress':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-800/30 dark:text-blue-300';
      case 'completed':
        return 'bg-green-100 text-green-700 dark:bg-green-800/30 dark:text-green-300';
      case 'on_hold':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-800/30 dark:text-yellow-300';
      case 'archived':
        return 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
      default:
        return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  const getStatusText = () => {
    if (!item.status) {
      return 'Not Started';
    }

    switch (item.status) {
      case 'not_started':
        return 'Not Started';
      case 'in_progress':
        return 'In Progress';
      case 'completed':
        return 'Completed';
      case 'on_hold':
        return 'On Hold';
      case 'archived':
        return 'Archived';
      default:
        return 'Not Started';
    }
  };

  // Fonction pour ouvrir l'URL dans un nouvel onglet (commune aux deux sections)
  const handleOpenUrl = useCallback(() => {
    if (item.url) {
      window.open(item.url, '_blank', 'noopener,noreferrer');
    }
  }, [item.url]);

  // Fonction pour copier l'URL dans le presse-papier (pour l'en-tête)
  const handleCopyUrl = useCallback(() => {
    if (item.url) {
      navigator.clipboard.writeText(item.url).then(() => {
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      });
    }
  }, [item.url]);

  // Fonction pour copier l'URL dans le presse-papier (pour le pied de page)
  const handleCopyFooterUrl = useCallback(() => {
    if (item.url) {
      navigator.clipboard.writeText(item.url).then(() => {
        setCopyFooterSuccess(true);
        setTimeout(() => setCopyFooterSuccess(false), 2000);
      });
    }
  }, [item.url]);

  // Fonction pour enregistrer l'URL modifiée (pour l'en-tête)
  const handleUrlSave = useCallback(() => {
    if (editedUrl !== item.url) {
      onUpdate(item.id, { url: editedUrl.trim() });
    }
    setIsUrlEditing(false);
  }, [editedUrl, item.id, item.url, onUpdate]);

  // Fonction pour enregistrer l'URL modifiée (pour le pied de page)
  const handleFooterUrlSave = useCallback(() => {
    if (editedFooterUrl !== item.url) {
      onUpdate(item.id, { url: editedFooterUrl.trim() });
    }
    setIsFooterUrlEditing(false);
  }, [editedFooterUrl, item.id, item.url, onUpdate]);

  // Synchroniser les URLs lorsque l'élément change
  useEffect(() => {
    setEditedUrl(item.url || '');
    setEditedFooterUrl(item.url || '');
  }, [item.url]);

  return (
    <div className="w-full">
      <Card className={clsx(
        "relative overflow-hidden transition-all duration-200",
        "hover:shadow-lg border-l-4",
        "bg-white light:bg-white preserve-colors", // Ajout de la classe preserve-colors
        getBorderColorClass()
      )}>
        {/* Card Header with gradient background */}
        <div className="bg-gradient-to-r from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 light:from-white light:via-white light:to-white light:bg-white border-b border-gray-200/80 dark:border-gray-700/80">
          <div className="p-6">
            {/* Title Section */}
            <div className="flex justify-between items-start gap-4 mb-4">
              <div className="flex-1 space-y-3">
                {/* Title */}
                <div>
                  {isTitleEditing ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={editedTitle}
                        onChange={(e) => setEditedTitle(e.target.value)}
                        className="text-xl font-semibold border-blue-200 focus:ring-blue-500 dark:border-blue-700 dark:bg-gray-800 dark:text-white"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleTitleSave}
                        className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:text-green-300 dark:hover:bg-green-900/30"
                      >
                        <Save className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setIsTitleEditing(false);
                          setEditedTitle(item.title);
                        }}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/30"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 group flex-wrap">
                      <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{item.title}</h3>
                      <div className="flex items-center">
                        {item.url && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleOpenUrl}
                            className="inline-flex items-center text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-900/30 transition-colors h-8 px-2"
                            title="Ouvrir le lien"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setIsTitleEditing(true)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-500 hover:text-gray-700 hover:bg-gray-50 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700/50 h-8 px-2"
                          title="Modifier le titre"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* URL and Link Management Row - Add this directly after the title */}
                {(item.url || isUrlEditing) && (
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    {isUrlEditing ? (
                      <div className="flex items-center gap-2 w-full">
                        <Input
                          type="url"
                          value={editedUrl}
                          onChange={(e) => setEditedUrl(e.target.value)}
                          placeholder="https://..."
                          className="flex-1 text-sm border-blue-200 focus:ring-blue-500 dark:border-blue-700 dark:bg-gray-800 dark:text-white"
                        />
                        <div className="flex-shrink-0 flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleUrlSave}
                            className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:text-green-300 dark:hover:bg-green-900/30 h-8 w-8 p-0"
                          >
                            <Save className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setIsUrlEditing(false);
                              setEditedUrl(item.url || '');
                            }}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/30 h-8 w-8 p-0"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ) : item.url ? (
                      <>
                        <a 
                          href={item.url} 
                          target="_blank"
                          rel="noopener noreferrer" 
                          className="text-sm text-blue-600 hover:underline dark:text-blue-400 break-all line-clamp-1 flex-1 max-w-full"
                          title={item.url}
                        >
                          {item.url}
                        </a>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleCopyUrl}
                            className="h-7 w-7 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-100 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-900/30"
                            title="Copier le lien"
                          >
                            {copySuccess ? <CheckCheck className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setIsUrlEditing(true);
                              setEditedUrl(item.url || '');
                            }}
                            className="h-7 w-7 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-100 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-900/30"
                            title="Modifier le lien"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </>
                    ) : (
                      <div className="flex w-full justify-between">
                        <span className="text-sm text-gray-500 dark:text-gray-400 italic">
                          Aucun lien défini
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setIsUrlEditing(true)}
                          className="h-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-900/30"
                          title="Ajouter un lien"
                        >
                          <Plus className="h-3.5 w-3.5 mr-1" />
                          <span className="text-xs">Ajouter un lien</span>
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {/* Category and Type */}
                <div className="flex items-center gap-3 flex-wrap">
                  {item.category && (
                    <div className="flex items-center">
                      <span className="px-3 py-1.5 rounded-full text-sm font-medium bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border border-blue-100 shadow-sm dark:from-blue-900/30 dark:to-indigo-900/30 dark:text-blue-300 dark:border-blue-800/50">
                        {item.category}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge 
                      variant={getStatusBadgeClass().includes('bg-gray-100') ? 'destructive' : getStatusBadgeClass().includes('bg-blue-100') ? 'secondary' : getStatusBadgeClass().includes('bg-green-100') ? 'default' : 'outline'} 
                      className={clsx(
                        getStatusBadgeClass(),
                        "capitalize font-medium",
                        "shadow-sm",
                        "preserve-color" // Classe pour préserver les couleurs
                      )}
                    >
                      {getStatusText()}
                    </Badge>
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-300">{item.type}</span>
                    {!item.url && !isUrlEditing && (
                      <Button
                        variant="outline"
                        size="sm" 
                        onClick={() => setIsUrlEditing(true)}
                        className="inline-flex items-center gap-1 text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800/50 h-7 px-2"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        <span className="text-xs">Lien</span>
                      </Button>
                    )}
                  </div>
                </div>

                {/* Date */}
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    {formatDate(item.date)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Timer Controls and Session Info */}
        <div className="p-6 bg-white dark:bg-gray-800 light:bg-white">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              {activeSession || item.progress?.sessions?.some(s => s.status === 'on_hold' && !s.endTime) ? (
                <div className="flex gap-2">
                  {activeSession?.status !== 'on_hold' ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 bg-yellow-50 hover:bg-yellow-100 border-yellow-200 text-yellow-700 shadow-sm dark:bg-yellow-800/30 dark:hover:bg-yellow-900/30 dark:text-yellow-300 preserve-color"
                      onClick={handlePauseSession}
                    >
                      <Pause className="h-4 w-4 preserve-color" />
                      Pause
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700 shadow-sm dark:bg-blue-800/30 dark:hover:bg-blue-900/30 dark:text-blue-300 preserve-color"
                      onClick={handleResumeSession}
                    >
                      <Play className="h-4 w-4 preserve-color" />
                      Resume
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 bg-red-50 hover:bg-red-100 border-red-200 text-red-700 shadow-sm dark:bg-red-800/30 dark:hover:bg-red-900/30 dark:text-red-300"
                    onClick={handleStopSession}
                  >
                    <StopCircle className="h-4 w-4" />
                    Stop
                  </Button>
                </div>
              ) : (
                <div>
                  {!item.completed && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handleStartSession}
                      className="gap-2 bg-blue-500 hover:bg-blue-600 text-white shadow-sm dark:bg-blue-600 dark:hover:bg-blue-700"
                    >
                      <Play className="h-4 w-4" />
                      Start Session
                    </Button>
                  )}
                </div>
              )}
            </div>

            {(activeSession || item.progress?.sessions?.some(s => s.status === 'on_hold' && !s.endTime)) && (
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                  {activeSession?.status === 'on_hold' || item.progress?.sessions?.some(s => s.status === 'on_hold' && !s.endTime)
                    ? `Session Paused: ${displayTime}`
                    : `Current Session: ${displayTime}`}
                </span>
                {activeSession?.status !== 'on_hold' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleOpenNoteDialog}
                    className="gap-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-900/30 border border-blue-200 rounded-lg shadow-sm transition-colors"
                  >
                    <MessageSquare className="h-4 w-4" />
                    Add Note
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* URL Section with editing functionality */}
          {(item.url || isFooterUrlEditing) && (
            <div className="mt-4 mb-4 border border-blue-100 dark:border-blue-800/50 rounded-lg p-3 bg-blue-50/50 dark:bg-blue-900/10">
              <div className="flex items-center justify-between mb-2">
                <h5 className="text-sm font-medium text-blue-700 dark:text-blue-300 flex items-center gap-1">
                  <ExternalLink className="h-3.5 w-3.5" />
                  Lien externe
                </h5>
                <div className="flex items-center gap-1">
                  {!isFooterUrlEditing && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCopyFooterUrl}
                        className="h-7 w-7 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-100 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-900/30"
                        title="Copier le lien"
                        disabled={!item.url}
                      >
                        {copyFooterSuccess ? <CheckCheck className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setIsFooterUrlEditing(true);
                          setEditedFooterUrl(item.url || '');
                        }}
                        className="h-7 w-7 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-100 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-900/30"
                        title="Modifier le lien"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
              
              {isFooterUrlEditing ? (
                <div className="flex items-center gap-2">
                  <Input
                    type="url"
                    value={editedFooterUrl}
                    onChange={(e) => setEditedFooterUrl(e.target.value)}
                    placeholder="https://..."
                    className="flex-1 text-sm border-blue-200 focus:ring-blue-500 dark:border-blue-700 dark:bg-gray-800 dark:text-white"
                  />
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleFooterUrlSave}
                      className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:text-green-300 dark:hover:bg-green-900/30"
                    >
                      <Save className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setIsFooterUrlEditing(false);
                        setEditedFooterUrl(item.url || '');
                      }}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/30"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : item.url ? (
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mt-1">
                  <a 
                    href={item.url} 
                    target="_blank"
                    rel="noopener noreferrer" 
                    className="text-sm text-blue-600 hover:underline dark:text-blue-400 break-all line-clamp-1 flex-1"
                  >
                    {item.url}
                  </a>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleOpenUrl}
                    className="w-full sm:w-auto bg-white hover:bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 dark:text-blue-300 dark:border-blue-800/50 flex items-center justify-center gap-2"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Ouvrir
                  </Button>
                </div>
              ) : (
                <div className="text-sm text-gray-500 dark:text-gray-400 italic">
                  Aucun lien défini
                </div>
              )}
            </div>
          )}

          {/* Session History */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Session History</h4>
              {item.progress?.sessions?.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAllSessions(!showAllSessions)}
                  className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  {showAllSessions ? 'Show Less' : 'Show All'}
                </Button>
              )}
            </div>
            {renderSessionHistory()}
          </div>
        </div>

        {/* Note Dialog */}
        <Dialog open={showNoteDialog} onOpenChange={setShowNoteDialog}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Add Session Note
              </DialogTitle>
              <DialogDescription className="mt-2 text-gray-600 dark:text-gray-300">
                <div className="space-y-3">
                  <p>
                    Record your thoughts, progress, or any important points about this learning session.
                  </p>
                  <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-800/30 text-amber-800 dark:text-amber-300 rounded-lg border border-amber-200 dark:border-amber-800/50">
                    <AlertCircle className="h-5 w-5 text-amber-500 dark:text-amber-400 flex-shrink-0" />
                    <p className="text-sm">
                      This action cannot be undone. All sessions and progress will be permanently deleted.
                    </p>
                  </div>
                </div>
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 space-y-4">
              <Textarea
                value={sessionNote}
                onChange={(e) => setSessionNote(e.target.value)}
                placeholder="What did you learn or accomplish in this session?"
                className="min-h-[120px] resize-none bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-700 focus:ring-blue-500 dark:focus:ring-blue-700"
              />
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={handleCloseNoteDialog}
                >
                  Cancel
                </Button>
                <Button
                  variant="default"
                  onClick={handleAddNoteSubmit}
                  className="px-4 bg-blue-600 hover:bg-blue-700 text-white gap-2 dark:bg-blue-600 dark:hover:bg-blue-700"
                  disabled={!sessionNote.trim()}
                >
                  <MessageSquare className="h-4 w-4" />
                  Add Note
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Note Dialog */}
        <Dialog open={showEditNoteDialog} onOpenChange={setShowEditNoteDialog}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Edit Note
              </DialogTitle>
              <DialogDescription className="mt-2 text-gray-600 dark:text-gray-300">
                <div className="space-y-3">
                  <p>
                    Modify your session note below.
                  </p>
                </div>
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 space-y-4">
              <Textarea
                value={editingNote?.content || ''}
                onChange={(e) => setEditingNote(prev => prev ? { ...prev, content: e.target.value } : null)}
                placeholder="Edit your note..."
                className="min-h-[120px] resize-none bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-700 focus:ring-blue-500 dark:focus:ring-blue-700"
              />
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowEditNoteDialog(false);
                    setEditingNote(null);
                  }}
                  className="px-4 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </Button>
                <Button
                  variant="default"
                  onClick={handleEditNote}
                  className="px-4 bg-blue-600 hover:bg-blue-700 text-white gap-2 dark:bg-blue-600 dark:hover:bg-blue-700"
                  disabled={!editingNote?.content.trim()}
                >
                  <Pencil className="h-4 w-4" />
                  Save Changes
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent className="sm:max-w-md bg-background dark:bg-gray-800">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold text-foreground dark:text-gray-100">
                Delete Learning Item
              </DialogTitle>
              <DialogDescription className="mt-3 text-muted-foreground dark:text-gray-300">
                <div className="space-y-3">
                  <p>
                    Are you sure you want to delete <span className="font-medium text-foreground dark:text-gray-100">"{item.title}"</span>?
                  </p>
                  <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-800/30 text-amber-800 dark:text-amber-300 rounded-lg border border-amber-200 dark:border-amber-800/50">
                    <AlertCircle className="h-5 w-5 text-amber-500 dark:text-amber-400 flex-shrink-0" />
                    <p className="text-sm">
                      This action cannot be undone. All sessions and progress will be permanently deleted.
                    </p>
                  </div>
                </div>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-6">
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={handleCancelDelete}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleConfirmDelete}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Item
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Card>
    </div>
  );
};

export default LearningItemCard;