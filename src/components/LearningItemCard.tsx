import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Progress } from '../ui/progress';
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
  AlertCircle,
  Save,
  ExternalLink,
  MessageSquare,
  Calendar,
  Pencil
} from 'lucide-react';
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
} from "@/components/ui/dialog";

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

  const activeSession = item.progress?.sessions?.find(session => !session.endTime);
  const { elapsedTime, formatElapsedTime, lastUpdateTime, isValidSession } = useSessionTimer({
    isActive: !!activeSession,
    startTime: activeSession?.startTime || null,
    itemId: item.id
  });

  // Handle session persistence and cleanup
  useEffect(() => {
    const storedSessionStr = localStorage.getItem(`activeSession_${item.id}`);
    const lastUpdateStr = localStorage.getItem(`sessionLastUpdate_${item.id}`);
    
    if (storedSessionStr) {
      try {
        const storedSession = JSON.parse(storedSessionStr);
        const lastUpdate = lastUpdateStr ? parseInt(lastUpdateStr, 10) : null;
        const now = Date.now();
        
        // Check if session is stale (no updates in last 5 minutes)
        const isStaleSession = lastUpdate && (now - lastUpdate) > 5 * 60 * 1000;
        
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

  // Handle session start
  const handleStartSession = useCallback(() => {
    if (activeSession || !item.progress) return; // Prevent multiple active sessions
    
    const now = new Date();
    const newSession = {
      startTime: now.toISOString(),
      date: now.toISOString().split('T')[0],
      notes: [],
      status: 'in_progress' as const
    };

    // First update local state
    onStartTracking(item.id);
    
    // Then update item with new session and status
    onUpdate(item.id, {
      status: 'in_progress',
      progress: {
        ...item.progress,
        sessions: [...[newSession], ...(item.progress.sessions || [])]  // Add new session at the beginning
      }
    });

    // Finally update localStorage
    localStorage.setItem(`activeSession_${item.id}`, JSON.stringify(newSession));
    localStorage.setItem(`sessionLastUpdate_${item.id}`, Date.now().toString());
  }, [item, onUpdate, onStartTracking, activeSession]);

  // Handle session pause
  const handlePauseSession = useCallback(() => {
    if (!activeSession || !item.progress?.sessions) return;

    // Store pause time in localStorage
    localStorage.setItem(`sessionPauseTime_${item.id}`, Date.now().toString());

    // Update the current session to paused state
    const updatedSessions = item.progress.sessions.map(s => 
      s.startTime === activeSession.startTime ? {
        ...s,
        status: 'on_hold' as const
      } : s
    );

    // First stop tracking
    onStopTracking(item.id);

    // Then update the session status
    onUpdate(item.id, {
      status: 'on_hold',
      progress: {
        ...item.progress,
        sessions: updatedSessions
      }
    });
  }, [item, activeSession, onUpdate, onStopTracking]);

  // Handle session resume
  const handleResumeSession = useCallback(() => {
    if (!item.progress?.sessions) return;

    const pausedSession = item.progress.sessions.find(s => s.status === 'on_hold' && !s.endTime);
    if (!pausedSession) return;

    // Clean up any existing active session in localStorage
    localStorage.removeItem(`activeSession_${item.id}`);
    localStorage.removeItem(`sessionLastUpdate_${item.id}`);
    localStorage.removeItem(`sessionPauseTime_${item.id}`);

    // Update the session status
    const updatedSessions = item.progress.sessions.map(s => 
      s.startTime === pausedSession.startTime ? {
        ...s,
        status: 'in_progress' as const
      } : s
    );

    // First update the session status
    onUpdate(item.id, {
      status: 'in_progress',
      progress: {
        ...item.progress,
        sessions: updatedSessions
      }
    });

    // Then start tracking
    onStartTracking(item.id);
  }, [item, onUpdate, onStartTracking]);

  // Handle session stop
  const handleStopSession = useCallback(() => {
    if (!item.progress?.sessions) return;

    // Find all active or paused sessions
    const activeSessions = item.progress.sessions.filter(s => !s.endTime);
    if (activeSessions.length === 0) return;

    const now = new Date();

    // Update all active/on-hold sessions to completed
    const updatedSessions = item.progress.sessions.map(s => {
      if (!s.endTime) {
        const startTime = new Date(s.startTime);
        const diffInMinutes = Math.floor((now.getTime() - startTime.getTime()) / (1000 * 60));
        
        return {
          ...s,
          endTime: now.toISOString(),
          duration: {
            hours: Math.floor(diffInMinutes / 60),
            minutes: diffInMinutes % 60
          },
          status: 'completed' as const
        };
      }
      return s;
    });

    // Clean up all localStorage items first
    localStorage.removeItem(`activeSession_${item.id}`);
    localStorage.removeItem(`sessionLastUpdate_${item.id}`);
    localStorage.removeItem(`sessionPauseTime_${item.id}`);

    // Stop tracking before updating the sessions
    onStopTracking(item.id);

    // Finally update the sessions
    onUpdate(item.id, {
      status: item.completed ? 'completed' : 'in_progress',
      progress: {
        ...item.progress,
        sessions: updatedSessions
      }
    });
  }, [item, onUpdate, onStopTracking]);

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
    setIsEditing(false);
  };

  const handleDeleteClick = () => {
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = useCallback(() => {
    // Clean up any localStorage items first
    localStorage.removeItem(`activeSession_${item.id}`);
    localStorage.removeItem(`sessionLastUpdate_${item.id}`);
    localStorage.removeItem(`sessionPauseTime_${item.id}`);
    
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

  const calculateTotalTimeSpent = useCallback((): number => {
    if (!item.progress?.sessions) return 0;
    return item.progress.sessions.reduce((total, session) => {
      if (session.duration) {
        return total + (session.duration.hours * 60) + session.duration.minutes;
      }
      return total;
    }, 0);
  }, [item.progress?.sessions]);

  const calculateProgress = useCallback(() => {
    if (!item.progress?.total) return 0;
    
    const totalSpentMinutes = calculateTotalTimeSpent();
    const totalTargetMinutes = (item.progress.total.hours * 60) + item.progress.total.minutes;
    
    if (totalTargetMinutes === 0) return 0;
    return Math.min(Math.round((totalSpentMinutes / totalTargetMinutes) * 100), 100);
  }, [item.progress?.total, calculateTotalTimeSpent]);

  const getProgressPercentage = () => {
    if (!item.progress?.total) return 0;
    
    const totalSpentMinutes = calculateTotalTimeSpent();
    const totalTargetMinutes = (item.progress.total.hours * 60) + item.progress.total.minutes;
    
    if (totalTargetMinutes === 0) return 0;
    return Math.min(Math.round((totalSpentMinutes / totalTargetMinutes) * 100), 100);
  };

  const formatDuration = (duration: Time | undefined) => {
    if (!duration) return '0h 0m';
    const hours = duration.hours || 0;
    const minutes = duration.minutes || 0;
    if (hours === 0) return `${minutes}m`;
    if (minutes === 0) return `${hours}h`;
    return `${hours}h ${minutes}m`;
  };

  const renderDuration = () => {
    if (!item.progress?.sessions) return null;
    
    const totalMinutes = getTotalMinutes(item.progress.sessions);
    const formattedDuration = formatDuration({ 
      hours: Math.floor(totalMinutes / 60), 
      minutes: totalMinutes % 60 
    });
    
    return (
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-gray-500" />
        <span className="text-sm font-medium text-gray-700">
          {formattedDuration}
        </span>
      </div>
    );
  };

  const renderProgressBar = () => {
    if (!item.progress?.total) return null;
    
    const progress = calculateProgress();
    return (
      <div className="space-y-2">
        <Progress value={progress} />
        <div className="flex justify-end">
          <span className="text-sm text-gray-600">{progress}%</span>
        </div>
      </div>
    );
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
                "bg-gradient-to-br from-white to-gray-50/30",
                "hover:from-gray-50 hover:to-white transition-all",
                "shadow-sm hover:shadow-md",
                "relative overflow-hidden",
                !session.endTime && "border-l-4 border-l-blue-400"
              )}
            >
              {/* Session Status Indicator */}
              <div className={clsx(
                "absolute top-0 right-0 w-24 h-24 -mr-12 -mt-12 transform rotate-45",
                !session.endTime && session.status === 'in_progress' && "bg-blue-500/10",
                !session.endTime && session.status === 'on_hold' && "bg-yellow-500/10",
                session.endTime && "bg-green-500/10"
              )} />

              {/* Header */}
              <div className="flex items-center justify-between relative">
                <div className="flex items-center gap-3">
                  <div className={clsx(
                    "font-semibold text-lg",
                    !session.endTime && session.status === 'in_progress' && "text-blue-600",
                    !session.endTime && session.status === 'on_hold' && "text-yellow-600",
                    session.endTime && "text-gray-700"
                  )}>
                    Session {sessionNumber}
                  </div>
                  <Badge 
                    variant={session.endTime ? "secondary" : session.status === 'on_hold' ? "outline" : "default"} 
                    className={clsx(
                      "capitalize font-medium",
                      !session.endTime && session.status === 'in_progress' && "bg-blue-100 text-blue-700 hover:bg-blue-200",
                      !session.endTime && session.status === 'on_hold' && "bg-yellow-50 text-yellow-700 border-yellow-200",
                      session.endTime && "bg-green-50 text-green-700"
                    )}
                  >
                    {session.endTime ? "Completed" : session.status === 'on_hold' ? "On Hold" : "In Progress"}
                  </Badge>
                </div>
                <div className="text-sm font-medium text-gray-600 bg-gray-100/80 px-3 py-1.5 rounded-full shadow-sm">
                  {formattedDuration}
                </div>
              </div>
              
              {/* Timing Information */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-1.5 bg-white/50 rounded-lg p-3 border border-gray-100">
                  <div className="text-gray-500 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-blue-500" />
                    Started
                  </div>
                  <div className="font-medium text-gray-700">{startDate.toLocaleString()}</div>
                </div>
                {endDate && (
                  <div className="space-y-1.5 bg-white/50 rounded-lg p-3 border border-gray-100">
                    <div className="text-gray-500 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      Ended
                    </div>
                    <div className="font-medium text-gray-700">{endDate.toLocaleString()}</div>
                  </div>
                )}
              </div>

              {/* Notes */}
              {(Array.isArray(session.notes) || item.notes) && (
                <div className="space-y-3 overflow-hidden">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <StickyNote className="h-4 w-4 text-amber-500" />
                    Notes
                  </div>
                  <ul className="space-y-2 overflow-hidden">
                    {Array.isArray(session.notes) && session.notes.map((note, noteIndex) => (
                      <li 
                        key={noteIndex} 
                        className={clsx(
                          "group relative text-sm p-3 rounded-lg",
                          "bg-gradient-to-r from-amber-50 to-amber-50/30",
                          "border border-amber-100/50",
                          "hover:from-amber-100/50 hover:to-amber-50/50 transition-colors",
                          "overflow-hidden"
                        )}
                      >
                        <div className="pr-8 max-w-full">
                          <p className="text-gray-700 break-words whitespace-pre-line overflow-hidden">
                            {typeof note === 'string' ? note : note.content}
                          </p>
                        </div>
                        <button
                          onClick={() => openEditNoteDialog(sessionIndex, noteIndex, typeof note === 'string' ? note : note.content)}
                          className={clsx(
                            "absolute top-2 right-2 p-1.5 rounded-md",
                            "bg-white/80 hover:bg-white shadow-sm",
                            "text-gray-500 hover:text-blue-600",
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
                        "bg-gradient-to-r from-amber-50 to-amber-50/30",
                        "border border-amber-100/50",
                        "hover:from-amber-100/50 hover:to-amber-50/50 transition-colors",
                        "overflow-hidden"
                      )}>
                        <div className="max-w-full">
                          <p className="text-gray-700 break-words whitespace-pre-line overflow-hidden">
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
    if (!item.status || item.status === 'unknown') {
      return 'border-gray-300';
    }

    switch (item.status) {
      case 'not_started':
        return 'border-gray-300';
      case 'in_progress':
        return 'border-blue-400';
      case 'completed':
        return 'border-green-400';
      case 'on_hold':
        return 'border-yellow-400';
      case 'archived':
        return 'border-gray-400';
      default:
        return 'border-gray-300';
    }
  };

  const getStatusBadgeClass = () => {
    if (!item.status || item.status === 'unknown') {
      return 'bg-gray-100 text-gray-600';
    }

    switch (item.status) {
      case 'not_started':
        return 'bg-gray-100 text-gray-600';
      case 'in_progress':
        return 'bg-blue-100 text-blue-700';
      case 'completed':
        return 'bg-green-100 text-green-700';
      case 'on_hold':
        return 'bg-yellow-100 text-yellow-700';
      case 'archived':
        return 'bg-gray-200 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const getStatusText = () => {
    if (!item.status || item.status === 'unknown') {
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

  return (
    <div className="w-full">
      <Card className={clsx(
        "relative overflow-hidden transition-all duration-200",
        "hover:shadow-lg border-l-4",
        getBorderColorClass()
      )}>
        {/* Card Header with gradient background */}
        <div className="bg-gradient-to-r from-gray-50 via-white to-gray-50 border-b border-gray-200/80">
          <div className="p-6">
            {/* Title Section */}
            <div className="flex justify-between items-start gap-4 mb-4">
              <div className="flex-1 space-y-3">
                {/* Title */}
                <div>
                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={editedTitle}
                        onChange={(e) => setEditedTitle(e.target.value)}
                        className="text-xl font-semibold border-blue-200 focus:ring-blue-500"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleTitleSave}
                        className="text-green-600 hover:text-green-700 hover:bg-green-50"
                      >
                        <Save className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setIsEditing(false);
                          setEditedTitle(item.title);
                        }}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 group">
                      <h3 className="text-2xl font-bold text-gray-800">{item.title}</h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsEditing(true)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>

                {/* Category and Type */}
                <div className="flex items-center gap-3">
                  {item.category && (
                    <div className="flex items-center">
                      <span className="px-3 py-1.5 rounded-full text-sm font-medium bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border border-blue-100 shadow-sm">
                        {item.category}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={getStatusBadgeClass().includes('bg-gray-100') ? 'destructive' : getStatusBadgeClass().includes('bg-blue-100') ? 'secondary' : getStatusBadgeClass().includes('bg-green-100') ? 'default' : 'outline'} 
                      className={clsx(
                        getStatusBadgeClass(),
                        "capitalize font-medium",
                        "shadow-sm"
                      )}
                    >
                      {getStatusText()}
                    </Badge>
                    <span className="text-sm font-medium text-gray-600">{item.type}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col items-center gap-2 p-2 rounded-lg bg-gray-50/50">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleMarkComplete()}
                  className={clsx(
                    "hover:bg-white transition-colors rounded-lg shadow-sm",
                    {
                      'text-green-500 hover:text-green-700': item.status !== 'completed',
                      'text-gray-400 hover:text-gray-600': item.status === 'completed'
                    }
                  )}
                >
                  <CheckCircle2 className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleDeleteClick}
                  className="text-red-400 hover:text-red-600 hover:bg-white transition-colors rounded-lg shadow-sm"
                >
                  <Trash2 className="h-5 w-5" />
                </Button>
                {item.url && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => window.open(item.url, '_blank')}
                    className="text-blue-500 hover:text-blue-700 hover:bg-white transition-colors rounded-lg shadow-sm"
                  >
                    <ExternalLink className="h-5 w-5" />
                  </Button>
                )}
              </div>
            </div>

            {/* Progress Section */}
            <div className="space-y-3 mt-6">
              <div className="flex items-center justify-between">
                {renderDuration()}
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-600">
                    {formatDate(item.date)}
                  </span>
                </div>
              </div>
              {renderProgressBar()}
            </div>
          </div>
        </div>

        {/* Timer Controls and Session Info */}
        <div className="p-6 bg-white">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              {activeSession || item.progress?.sessions?.some(s => s.status === 'on_hold' && !s.endTime) ? (
                <div className="flex gap-2">
                  {activeSession?.status !== 'on_hold' ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 bg-yellow-50 hover:bg-yellow-100 border-yellow-200 text-yellow-700 shadow-sm"
                      onClick={handlePauseSession}
                    >
                      <Pause className="h-4 w-4" />
                      Pause
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700 shadow-sm"
                      onClick={handleResumeSession}
                    >
                      <Play className="h-4 w-4" />
                      Resume
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 bg-red-50 hover:bg-red-100 border-red-200 text-red-700 shadow-sm"
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
                      className="gap-2 bg-blue-500 hover:bg-blue-600 text-white shadow-sm"
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
                <span className="text-sm font-medium text-blue-600">
                  {activeSession?.status === 'on_hold' || item.progress?.sessions?.some(s => s.status === 'on_hold' && !s.endTime)
                    ? 'Session Paused'
                    : `Current Session: ${formatElapsedTime()}`}
                </span>
                {activeSession?.status !== 'on_hold' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleOpenNoteDialog}
                    className="gap-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 border border-blue-200 rounded-lg shadow-sm transition-colors"
                  >
                    <MessageSquare className="h-4 w-4" />
                    Add Note
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Session History */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-semibold text-gray-800">Session History</h4>
              {item.progress?.sessions?.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAllSessions(!showAllSessions)}
                  className="text-blue-600 hover:text-blue-700"
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
              <DialogTitle className="text-xl font-semibold text-gray-900">
                Add Session Note
              </DialogTitle>
              <DialogDescription className="mt-2 text-gray-600">
                Record your thoughts, progress, or any important points about this learning session.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 space-y-4">
              <Textarea
                value={sessionNote}
                onChange={(e) => setSessionNote(e.target.value)}
                placeholder="What did you learn or accomplish in this session?"
                className="min-h-[120px] resize-none bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={handleCloseNoteDialog}
                  className="px-4 hover:bg-gray-50"
                >
                  Cancel
                </Button>
                <Button
                  variant="default"
                  onClick={handleAddNoteSubmit}
                  className="px-4 bg-blue-600 hover:bg-blue-700 text-white gap-2"
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
              <DialogTitle className="text-xl font-semibold text-gray-900">
                Edit Note
              </DialogTitle>
              <DialogDescription className="mt-2 text-gray-600">
                Modify your session note below.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 space-y-4">
              <Textarea
                value={editingNote?.content || ''}
                onChange={(e) => setEditingNote(prev => prev ? { ...prev, content: e.target.value } : null)}
                placeholder="Edit your note..."
                className="min-h-[120px] resize-none bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowEditNoteDialog(false);
                    setEditingNote(null);
                  }}
                  className="px-4 hover:bg-gray-50"
                >
                  Cancel
                </Button>
                <Button
                  variant="default"
                  onClick={handleEditNote}
                  className="px-4 bg-blue-600 hover:bg-blue-700 text-white gap-2"
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
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold text-gray-900">
                Delete Learning Item
              </DialogTitle>
              <DialogDescription className="mt-3 text-gray-600">
                <div className="space-y-3">
                  <p>
                    Are you sure you want to delete <span className="font-medium text-gray-900">"{item.title}"</span>?
                  </p>
                  <div className="flex items-center gap-2 p-3 bg-amber-50 text-amber-800 rounded-lg border border-amber-200">
                    <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0" />
                    <p className="text-sm">
                      This action cannot be undone. All sessions and progress will be permanently deleted.
                    </p>
                  </div>
                </div>
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-3 mt-6">
              <Button
                variant="outline"
                onClick={handleCancelDelete}
                className="px-4 hover:bg-gray-50"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirmDelete}
                className="px-4 bg-red-600 hover:bg-red-700 focus:ring-red-500"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Item
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </Card>
    </div>
  );
};

export default LearningItemCard;