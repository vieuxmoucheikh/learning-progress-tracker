import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Progress } from '../ui/progress';
import { Badge } from '../components/ui/badge';
import { 
  Clock, 
  PlayCircle, 
  StopCircle, 
  Edit2, 
  Save, 
  Plus, 
  Trash2, 
  ExternalLink,
  AlertCircle,
  CheckCircle,
  X,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Calendar,
  MoreVertical,
  BookOpen,
  StickyNote,
  CheckCircle2
} from 'lucide-react';
import type { LearningItem, Session } from '../types';
import { formatTime, calculateProgress, formatDuration, getTotalMinutes } from '../lib/utils';
import clsx from 'clsx';
import { useSessionTimer } from '../hooks/useSessionTimer';

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
  status: 'in_progress' | 'completed' | 'paused';
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
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [showAllSessions, setShowAllSessions] = useState(false);

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
      notes: []
    };

    // First update local state
    onStartTracking(item.id);
    
    // Then update item with new session
    onUpdate(item.id, {
      progress: {
        ...item.progress,
        sessions: [...(item.progress.sessions || []), newSession]
      }
    });

    // Finally update localStorage
    localStorage.setItem(`activeSession_${item.id}`, JSON.stringify(newSession));
    localStorage.setItem(`sessionLastUpdate_${item.id}`, Date.now().toString());
  }, [item, onUpdate, onStartTracking, activeSession]);

  // Handle session stop
  const handleStopSession = useCallback(() => {
    if (!activeSession || !item.progress?.sessions) return;

    const now = new Date();
    const startTime = new Date(activeSession.startTime);
    const diffInMinutes = Math.floor((now.getTime() - startTime.getTime()) / (1000 * 60));
    
    const duration = {
      hours: Math.floor(diffInMinutes / 60),
      minutes: diffInMinutes % 60
    };

    const updatedSession = {
      ...activeSession,
      endTime: now.toISOString(),
      duration,
      date: startTime.toISOString().split('T')[0]
    };

    // First update local state
    onStopTracking(item.id);
    
    // Then update item with ended session
    const updatedSessions = item.progress.sessions.map(s => 
      s.startTime === activeSession.startTime ? updatedSession : s
    );

    onUpdate(item.id, {
      progress: {
        ...item.progress,
        sessions: updatedSessions
      }
    });

    // Finally clean up localStorage
    localStorage.removeItem(`activeSession_${item.id}`);
    localStorage.removeItem(`sessionLastUpdate_${item.id}`);
  }, [activeSession, item, onUpdate, onStopTracking]);

  const handleAddNote = useCallback(() => {
    if (!sessionNote.trim() || !activeSession) return;

    const sessions = item.progress.sessions || [];
    
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
    setShowNoteInput(false);
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

  const handleDelete = () => {
    onDelete(item.id);
    setShowHistory(false);
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
    const timeSpentMinutes = calculateTotalTimeSpent();
    const currentDuration = {
      hours: Math.floor(timeSpentMinutes / 60),
      minutes: timeSpentMinutes % 60
    };
    
    return (
      <div className="flex items-center gap-1.5">
        <Clock className="h-4 w-4 text-gray-500" />
        <span className="text-sm text-gray-600">
          {formatDuration(currentDuration)}
          {item.progress?.total ? ` / ${formatDuration(item.progress.total)}` : ' / ∞'}
        </span>
      </div>
    );
  };

  const renderProgressBar = () => {
    if (!item.progress?.total) return null;
    
    const percentage = getProgressPercentage();
    return (
      <div className="mt-2">
        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
          <div 
            className={clsx(
              "h-full transition-all duration-300",
              {
                'bg-green-500': percentage >= 100,
                'bg-blue-500': percentage > 0 && percentage < 100,
                'bg-gray-200': percentage === 0
              }
            )}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <div className="mt-1 text-xs text-gray-500 text-right">
          {percentage}% Complete
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

    const reversedSessions = [...item.progress.sessions].reverse();
    const activeSession = reversedSessions.find(s => !s.endTime);
    const displaySessions = showAllSessions 
      ? reversedSessions
      : reversedSessions.slice(0, activeSession ? 2 : 1);
    
    return (
      <div className="space-y-3">
        {displaySessions.map((session, index) => {
          const startDate = new Date(session.startTime);
          const endDate = session.endTime ? new Date(session.endTime) : null;
          const duration = session.duration || { hours: 0, minutes: 0 };
          const formattedDuration = `${duration.hours}h ${duration.minutes}m`;
          
          return (
            <div 
              key={session.startTime}
              className={`border rounded-lg p-4 space-y-3 bg-gradient-to-br from-white to-gray-50/30 hover:from-gray-50 hover:to-white transition-all cursor-pointer shadow-sm hover:shadow-md ${!session.endTime ? 'border-l-4 border-l-blue-400' : ''}`}
              onClick={() => setShowHistory(true)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`font-medium text-lg ${!session.endTime ? 'text-blue-600' : 'text-gray-800'}`}>
                    Session {index + 1}
                  </div>
                  <Badge 
                    variant={session.endTime ? "secondary" : "default"} 
                    className={`capitalize ${!session.endTime ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' : ''}`}
                  >
                    {session.endTime ? "Completed" : "Active"}
                  </Badge>
                </div>
                <div className="text-sm font-medium text-gray-600 bg-gray-100/80 px-2 py-1 rounded-full">
                  {formattedDuration}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm border-t border-b py-3 border-gray-200">
                <div className="space-y-1">
                  <div className="text-gray-500 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-blue-500" />
                    Started
                  </div>
                  <div className="font-medium text-gray-700">{startDate.toLocaleString()}</div>
                </div>
                {endDate && (
                  <div className="space-y-1">
                    <div className="text-gray-500 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      Ended
                    </div>
                    <div className="font-medium text-gray-700">{endDate.toLocaleString()}</div>
                  </div>
                )}
              </div>

              {session.notes && session.notes.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <StickyNote className="h-4 w-4 text-amber-500" />
                    Notes
                  </div>
                  <ul className="space-y-2">
                    {session.notes.map((note, noteIndex) => (
                      <li 
                        key={noteIndex} 
                        className="text-sm bg-gradient-to-r from-amber-50 to-amber-50/30 p-2.5 rounded-md text-gray-700 border border-amber-100/50"
                      >
                        {typeof note === 'string' ? note : note.content}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
        
        {item.progress.sessions.length > (activeSession ? 2 : 1) && (
          <Button
            variant="outline"
            className="w-full text-sm gap-2 mt-2 border-gray-200 hover:bg-gray-50 hover:text-gray-900 text-gray-600"
            onClick={(e) => {
              e.stopPropagation();
              setShowAllSessions(!showAllSessions);
            }}
          >
            {showAllSessions ? (
              <>
                <ChevronUp className="h-4 w-4" />
                Show Less
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" />
                Show {item.progress.sessions.length - (activeSession ? 2 : 1)} More Sessions
              </>
            )}
          </Button>
        )}
      </div>
    );
  };

  return (
    <Card className={clsx(
      "w-full p-6 relative border-l-4 transition-all duration-200 hover:shadow-lg",
      {
        "border-l-green-500": item.completed,
        "border-l-blue-500": !item.completed && activeSession,
        "border-l-gray-300": !item.completed && !activeSession
      }
    )}>
      {/* Delete Confirmation Dialog */}
      {showHistory && (
        <div className="absolute inset-0 bg-white bg-opacity-95 z-10 flex items-center justify-center p-4 backdrop-blur-sm">
        <div className="bg-white p-6 rounded-lg shadow-lg border border-red-200 max-w-sm w-full">
          <div className="text-center mb-4">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-2" />
            <h3 className="text-lg font-semibold text-gray-900">Delete Item</h3>
            <p className="text-gray-600 mt-1">Are you sure you want to delete "{item.title}"? This action cannot be undone.</p>
          </div>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setShowHistory(false)}
              className="border-gray-300 hover:bg-gray-50"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              Delete
            </Button>
          </div>
        </div>
      </div>
      )}

      {/* Header Section */}
      <div className="flex justify-between items-start gap-4">
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
                <h3 className="text-xl font-semibold text-gray-900">{item.title}</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Category and Type */}
          <div className="flex items-center gap-3">
            {item.category && (
              <div className="flex items-center">
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border border-blue-100 shadow-sm">
                  {item.category}
                </span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className={clsx(
                "px-2 py-0.5 rounded-full text-xs font-medium",
                {
                  'bg-green-100 text-green-800': item.status === 'completed',
                  'bg-yellow-100 text-yellow-800': item.status === 'in_progress',
                  'bg-gray-100 text-gray-800': item.status === 'not_started',
                  'bg-red-100 text-red-800': item.status === 'on_hold',
                  'bg-blue-100 text-blue-800': item.status === 'archived',
                }
              )}>
                {item.status.replace('_', ' ')}
              </span>
              <span className="text-gray-400">•</span>
              <span className="text-sm text-gray-600 font-medium">{item.type}</span>
            </div>
          </div>

          {/* Progress Section */}
          <div className="space-y-2">
            {renderDuration()}
            {renderProgressBar()}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleMarkComplete()}
            className={clsx(
              "hover:bg-gray-50 transition-colors",
              {
                'text-green-500 hover:text-green-700': item.status !== 'completed',
                'text-gray-400 hover:text-gray-600': item.status === 'completed'
              }
            )}
          >
            <CheckCircle className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowHistory(true)}
            className="text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
          >
            <Trash2 className="h-5 w-5" />
          </Button>
          {item.url && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => window.open(item.url, '_blank')}
              className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 transition-colors"
            >
              <ExternalLink className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>

      {/* Timer Controls */}
      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {activeSession ? (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleStopSession}
              className="gap-2 bg-red-500 hover:bg-red-600"
            >
              <StopCircle className="h-4 w-4" />
              Stop Timer
            </Button>
          ) : (
            <Button
              variant="default"
              size="sm"
              onClick={handleStartSession}
              className="gap-2 bg-blue-500 hover:bg-blue-600"
            >
              <PlayCircle className="h-4 w-4" />
              Start Timer
            </Button>
          )}
          
          {activeSession && (
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-blue-600">
                Current Session: {formatElapsedTime}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowNoteInput(!showNoteInput)}
                className="gap-2 text-gray-600 hover:text-gray-800"
              >
                <MessageSquare className="h-4 w-4" />
                Add Note
              </Button>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-gray-500" />
          <span className="text-sm text-gray-600">
            {formatDate(item.date)}
          </span>
        </div>
      </div>

      {/* Note Input */}
      {showNoteInput && (
        <div className="mt-4 flex gap-2">
          <Input
            value={sessionNote}
            onChange={(e) => setSessionNote(e.target.value)}
            placeholder="Add a note about your progress..."
            className="flex-1"
          />
          <Button
            variant="default"
            size="sm"
            onClick={handleAddNote}
            disabled={!sessionNote.trim()}
            className="bg-blue-500 hover:bg-blue-600"
          >
            Add Note
          </Button>
        </div>
      )}

      {/* Session History */}
      {item.progress?.sessions?.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-gray-900">Session History</h4>
          </div>
          {renderSessionHistory()}
        </div>
      )}
    </Card>
  );
};

export default LearningItemCard;