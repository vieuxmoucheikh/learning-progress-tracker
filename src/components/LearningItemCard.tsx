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
  BookOpen
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

  const activeSession = item.progress?.sessions?.find(session => !session.endTime);
  const { elapsedTime, formatElapsedTime } = useSessionTimer({
    isActive: !!activeSession,
    startTime: activeSession?.startTime || null
  });

  const handleStartTracking = useCallback(() => {
    // Clear any existing stored session first
    localStorage.removeItem(`session_${item.id}`);
    
    // Check if there's already an active session
    if (item.progress.sessions.some(session => !session.endTime)) {
      console.log('Session already active, preventing duplicate');
      return; // Don't create a new session if one is active
    }
    
    const newSession = {
      startTime: new Date().toISOString(),
      date: new Date().toISOString().split('T')[0],
      notes: []
    };
    
    // Update the sessions array
    const updatedSessions = [newSession, ...(item.progress.sessions || [])];
    
    // Update item with new sessions array
    onUpdate(item.id, {
      progress: {
        ...item.progress,
        sessions: updatedSessions
      }
    });
    
    // Set active item first, then start tracking
    onSetActiveItem(item.id);
    onStartTracking(item.id);
  }, [item.id, onStartTracking, onSetActiveItem, onUpdate, item.progress.sessions]);

  // Effect to clean up any duplicate active sessions
  useEffect(() => {
    const activeSessions = item.progress.sessions.filter(session => !session.endTime);
    if (activeSessions.length > 1) {
      // Keep only the most recent active session
      const mostRecentSession = activeSessions[0];
      const updatedSessions = item.progress.sessions.map(session => {
        if (!session.endTime && session.startTime !== mostRecentSession.startTime) {
          // End any other active sessions
          const endTime = new Date().toISOString();
          const startTime = new Date(session.startTime);
          const endTimeDate = new Date(endTime);
          const durationInMinutes = Math.round((endTimeDate.getTime() - startTime.getTime()) / (1000 * 60));
          
          return {
            ...session,
            endTime,
            duration: {
              hours: Math.floor(durationInMinutes / 60),
              minutes: durationInMinutes % 60
            }
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
    }
  }, [item.id, item.progress.sessions, onUpdate]);

  const handleStopTracking = useCallback(() => {
    if (!activeSession) return;

    // Find all active sessions
    const activeSessions = item.progress.sessions.filter(session => !session.endTime);
    if (activeSessions.length === 0) return;

    const endTime = new Date().toISOString();
    const updatedSessions = [...item.progress.sessions];

    // Complete all active sessions
    activeSessions.forEach(session => {
      const sessionIndex = updatedSessions.findIndex(s => s.startTime === session.startTime);
      if (sessionIndex === -1) return;

      const startTime = new Date(session.startTime);
      const endTimeDate = new Date(endTime);
      const durationInMinutes = Math.round((endTimeDate.getTime() - startTime.getTime()) / (1000 * 60));

      updatedSessions[sessionIndex] = {
        ...session,
        endTime,
        duration: {
          hours: Math.floor(durationInMinutes / 60),
          minutes: durationInMinutes % 60
        }
      };
    });

    onUpdate(item.id, {
      progress: {
        ...item.progress,
        sessions: updatedSessions
      }
    });

    localStorage.removeItem(`session_${item.id}`);
    onStopTracking(item.id);
    onSetActiveItem(null);
    setShowNoteInput(true);
  }, [item.id, item.progress, onStopTracking, onSetActiveItem, onUpdate, activeSession]);

  const handleAddNote = useCallback(() => {
    if (!sessionNote.trim()) return;

    const sessions = item.progress.sessions || [];
    const lastSession = sessions[sessions.length - 1];
    
    if (!lastSession) return;

    const updatedSession = {
      ...lastSession,
      notes: [...(lastSession.notes || []), sessionNote.trim()]
    };

    onUpdate(item.id, {
      progress: {
        ...item.progress,
        sessions: [...sessions.slice(0, -1), updatedSession]
      }
    });

    onSessionNoteAdd(item.id, sessionNote);
    setSessionNote('');
    setShowNoteInput(false);
  }, [item.id, item.progress, sessionNote, onSessionNoteAdd, onUpdate]);

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

  const getProgressPercentage = () => {
    if (!item.progress || !item.progress.total || !item.progress.current) return 0;
    const totalMinutes = getTotalMinutes(item.progress.total);
    if (totalMinutes === 0) return 0;
    const currentMinutes = getTotalMinutes(item.progress.current);
    return Math.min(100, Math.round((currentMinutes / totalMinutes) * 100));
  };

  const renderProgressBar = () => {
    const percentage = getProgressPercentage();
    return (
      <div className="mt-2">
        <Progress value={percentage} className="h-2" />
        <div className="mt-1 text-xs text-gray-500">
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

    return (
      <div className="space-y-3">
        {item.progress.sessions.map((session, index) => {
          const startDate = new Date(session.startTime);
          const endDate = session.endTime ? new Date(session.endTime) : null;
          const duration = session.duration || { hours: 0, minutes: 0 };
          const formattedDuration = `${duration.hours}h ${duration.minutes}m`;
          
          return (
            <div 
              key={index}
              className="border rounded-lg p-3 space-y-2 bg-card hover:border-blue-200 transition-colors cursor-pointer"
              onClick={() => setShowHistory(true)}
            >
              <div className="flex items-center justify-between">
                <div className="font-medium">
                  Session {item.progress.sessions.length - index}
                </div>
                <Badge variant={session.endTime ? "secondary" : "default"}>
                  {session.endTime ? "Completed" : "Active"}
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <div className="text-muted-foreground">Started</div>
                  <div>{startDate.toLocaleString()}</div>
                </div>
                {endDate && (
                  <div>
                    <div className="text-muted-foreground">Ended</div>
                    <div>{endDate.toLocaleString()}</div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground mr-2">Duration:</span>
                  {formattedDuration}
                </div>
                {session.notes && session.notes.length > 0 && (
                  <div className="flex-1">
                    <span className="text-muted-foreground mr-2">Notes:</span>
                    <ul className="list-disc list-inside">
                      {session.notes.map((note, noteIndex) => (
                        <li key={noteIndex} className="text-sm text-gray-600">
                          {typeof note === 'string' ? note : note.content}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <Card className={clsx(
      "w-full p-4 relative border-l-4 transition-all duration-200",
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
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          {isEditing ? (
            <div className="flex items-center gap-2">
              <Input
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                className="text-lg font-semibold border-blue-200 focus:ring-blue-500"
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
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold">{item.title}</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              >
                <Edit2 className="h-4 w-4" />
              </Button>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
            <span className={clsx(
              "px-2 py-1 rounded-full text-xs font-medium",
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
            <span>•</span>
            <span>{item.type}</span>
            {item.category && (
              <>
                <span>•</span>
                <span>{item.category}</span>
              </>
            )}
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleMarkComplete()}
            className={clsx(
              "hover:bg-gray-50",
              {
                'text-green-500 hover:text-green-700': item.status !== 'completed',
                'text-gray-400 hover:text-gray-600': item.status === 'completed'
              }
            )}
          >
            <CheckCircle className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowHistory(true)}
            className="text-red-400 hover:text-red-600 hover:bg-red-50"
          >
            <Trash2 className="h-4 h-4" />
          </Button>
          {item.url && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => window.open(item.url, '_blank')}
              className="text-blue-500 hover:text-blue-700 hover:bg-blue-50"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Progress Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-600">
              {formatDuration(getTotalMinutes(item.progress && item.progress.current))} / 
              {item.progress && item.progress.total ? formatDuration(getTotalMinutes(item.progress.total)) : '∞'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {item.progress && item.progress.lastAccessed ? (
              <span className="text-sm text-gray-600">
                {formatTime(0)}
              </span>
            ) : null}
          </div>
        </div>
        
        {item.progress && item.progress.total && (
          renderProgressBar()
        )}
      </div>

      {/* Session Controls */}
      <div className="mt-4 space-y-4">
        {!activeSession ? (
          <Button
            variant="outline"
            className="w-full bg-green-50 hover:bg-green-100 border-green-200 text-green-700"
            onClick={handleStartTracking}
          >
            <PlayCircle className="w-4 h-4 mr-2" />
            Start Session
          </Button>
        ) : (
          <>
            <Button
              variant="outline"
              className="w-full bg-red-50 hover:bg-red-100 border-red-200 text-red-700"
              onClick={handleStopTracking}
            >
              <StopCircle className="w-4 h-4 mr-2" />
              Stop Session
            </Button>

            {/* Active Session */}
            <div className="p-4 bg-blue-50 rounded-lg space-y-4 border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-blue-800">Active Session</h4>
                  <p className="text-sm text-blue-600">Started at: {new Date(activeSession.startTime).toLocaleTimeString()}</p>
                </div>
                <div className="text-right">
                  <span className="text-lg font-semibold text-blue-600">{formatElapsedTime()}</span>
                  <p className="text-sm text-blue-600">Duration</p>
                </div>
              </div>

              {/* Session Notes Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h5 className="text-sm font-medium text-blue-800">Session Notes</h5>
                  <span className="text-xs text-blue-600">Press Enter to save</span>
                </div>
                <div className="flex gap-2">
                  <Input
                    value={sessionNote}
                    onChange={(e) => setSessionNote(e.target.value)}
                    placeholder="Add a note..."
                    className="flex-1"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && sessionNote.trim()) {
                        e.preventDefault();
                        handleAddNote();
                      }
                    }}
                  />
                  <Button
                    variant="outline"
                    className="bg-blue-100 hover:bg-blue-200 border-blue-200 text-blue-700"
                    onClick={handleAddNote}
                  >
                    Add Note
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Show note input after stopping session */}
      {!activeSession && showNoteInput && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-2 border border-gray-200">
          <div className="flex items-center justify-between">
            <h5 className="text-sm font-medium">Add Session Note</h5>
            <span className="text-xs text-gray-600">Press Enter to save</span>
          </div>
          <div className="flex gap-2">
            <Input
              value={sessionNote}
              onChange={(e) => setSessionNote(e.target.value)}
              placeholder="Add a note for the completed session..."
              className="flex-1"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && sessionNote.trim()) {
                  e.preventDefault();
                  handleAddNote();
                }
              }}
            />
            <Button
              variant="outline"
              onClick={handleAddNote}
            >
              Add Note
            </Button>
          </div>
        </div>
      )}

      {renderSessionHistory()}
    </Card>
  );
};

export default LearningItemCard;