import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Progress } from '../ui/progress';
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

export function LearningItemCard({
  item,
  onUpdate,
  onDelete,
  onStartTracking,
  onStopTracking,
  onNotesUpdate,
  onSetActiveItem,
  onSessionNoteAdd,
}: Props) {
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editedNotes, setEditedNotes] = useState(item.notes || '');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showSessionDetails, setShowSessionDetails] = useState(false);
  const [editTitle, setEditTitle] = useState(item.title);
  const [showNotes, setShowNotes] = useState(false);
  const [currentSessionTitle, setCurrentSessionTitle] = useState('');
  const [currentSessionDescription, setCurrentSessionDescription] = useState('');
  const [showSessionForm, setShowSessionForm] = useState(false);
  const [sessionNote, setSessionNote] = useState('');
  const [activeSessionIndex, setActiveSessionIndex] = useState<number | null>(null);
  const [sessionStats, setSessionStats] = useState({
    totalTime: 0,
    averageSessionLength: 0,
    bestTimeOfDay: '',
    mostProductiveDay: '',
  });
  const [showStats, setShowStats] = useState(false);

  // Calculate and update session statistics
  useEffect(() => {
    if (item.progress?.sessions) {
      const sessions = item.progress.sessions;
      const totalTime = sessions.reduce((total, session) => {
        if (session.startTime && session.endTime) {
          return total + (new Date(session.endTime).getTime() - new Date(session.startTime).getTime());
        }
        return total;
      }, 0);

      const avgLength = sessions.length ? totalTime / sessions.length : 0;

      // Calculate best time of day
      const hourCounts: { [hour: number]: number } = {};
      sessions.forEach(session => {
        const hour = new Date(session.startTime).getHours();
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      });

      const bestHour = Object.entries(hourCounts)
        .sort(([, a], [, b]) => b - a)[0]?.[0];

      // Calculate most productive day
      const dayCounts: { [day: string]: number } = {};
      sessions.forEach(session => {
        const day = new Date(session.startTime).toLocaleDateString('en-US', { weekday: 'long' });
        dayCounts[day] = (dayCounts[day] || 0) + 1;
      });

      const bestDay = Object.entries(dayCounts)
        .sort(([, a], [, b]) => b - a)[0]?.[0];

      setSessionStats({
        totalTime,
        averageSessionLength: avgLength,
        bestTimeOfDay: bestHour ? `${parseInt(bestHour)}:00` : 'N/A',
        mostProductiveDay: bestDay || 'N/A',
      });
    }
  }, [item.progress?.sessions]);

  // Timer implementation with improved visibility handling
  useEffect(() => {
    let timerInterval: NodeJS.Timeout | null = null;
    
    const updateElapsedTime = () => {
      if (item.progress?.lastAccessed && item.progress.isActive) {
        const startTime = new Date(item.progress.lastAccessed).getTime();
        const currentTime = Date.now();
        const elapsed = Math.floor((currentTime - startTime) / 1000);
        setElapsedTime(elapsed);
      } else {
        setElapsedTime(0);
      }
    };

    if (item.progress?.isActive) {
      updateElapsedTime();
      timerInterval = setInterval(updateElapsedTime, 1000);
    } else {
      setElapsedTime(0);
    }

    return () => {
      if (timerInterval) {
        clearInterval(timerInterval);
      }
    };
  }, [item.progress?.lastAccessed, item.progress?.isActive]);

  // Session management with improved validation
  const handleAddSessionNote = useCallback((note: string) => {
    if (!item.progress?.isActive) {
      console.warn('Cannot add note: No active session');
      return;
    }

    const sessions = item.progress.sessions;
    const lastSession = sessions[sessions.length - 1];

    if (!lastSession) {
      console.warn('No active session found');
      return;
    }

    const updatedSession = {
      ...lastSession,
      notes: [...(lastSession.notes || []), {
        content: note,
        timestamp: new Date().toISOString()
      }]
    };

    const updatedSessions = [
      ...sessions.slice(0, -1),
      updatedSession
    ];

    onUpdate(item.id, {
      progress: {
        ...item.progress,
        sessions: updatedSessions
      }
    });

    onSessionNoteAdd(item.id, note);
    setSessionNote('');
  }, [item.id, item.progress, onUpdate, onSessionNoteAdd]);

  const handleStartSession = useCallback(() => {
    if (!showSessionForm) {
      setShowSessionForm(true);
      return;
    }

    if (item.progress?.isActive) {
      console.warn('A session is already active');
      return;
    }

    const sessionTitle = currentSessionTitle.trim() || `Session ${(item.progress?.sessions?.length || 0) + 1}`;
    const sessionDescription = currentSessionDescription.trim();

    // Create new session with proper initialization
    const newSession: LocalSession = {
      startTime: new Date().toISOString(),
      title: sessionTitle,
      description: sessionDescription,
      date: new Date().toISOString().split('T')[0], // Ensure consistent date format
      notes: [],
      status: 'in_progress',
      duration: { hours: 0, minutes: 0 }, // Initialize duration
      hours: 0, // Add hours
      minutes: 0 // Add minutes
    };

    onUpdate(item.id, {
      status: 'in_progress',
      progress: {
        ...item.progress,
        sessions: [...(item.progress?.sessions || []), newSession],
        lastAccessed: new Date().toISOString(),
        isActive: true
      }
    });

    onStartTracking(item.id);
    onSetActiveItem(item.id);
    setShowSessionForm(false);
    setCurrentSessionTitle('');
    setCurrentSessionDescription('');
  }, [
    item.id,
    item.progress,
    currentSessionTitle,
    currentSessionDescription,
    showSessionForm,
    onUpdate,
    onStartTracking,
    onSetActiveItem
  ]);

  const handleStopSession = useCallback(() => {
    if (!item.progress?.isActive) {
      console.warn('No active session to stop');
      return;
    }

    const currentTime = new Date().toISOString();
    const sessions = item.progress.sessions;
    const lastSession = sessions[sessions.length - 1];

    if (!lastSession || lastSession.endTime) {
      console.warn('No active session found');
      return;
    }

    // Calculate duration accounting for timezone
    const startTime = new Date(lastSession.startTime);
    const endTime = new Date(currentTime);
    const durationInMinutes = Math.round(Math.max(0, endTime.getTime() - startTime.getTime()) / (1000 * 60));

    const updatedSession: LocalSession = {
      ...lastSession,
      endTime: currentTime,
      duration: {
        hours: Math.floor(durationInMinutes / 60),
        minutes: durationInMinutes % 60
      },
      hours: Math.floor(durationInMinutes / 60),
      minutes: durationInMinutes % 60,
      status: 'completed' as const
    };

    const updatedSessions = [
      ...sessions.slice(0, -1),
      updatedSession
    ];

    onUpdate(item.id, {
      status: item.status === 'completed' ? 'completed' : 'not_started',
      progress: {
        ...item.progress,
        sessions: updatedSessions,
        lastAccessed: undefined,
        isActive: false
      }
    });

    onStopTracking(item.id);
    onSetActiveItem(null);
  }, [item, onUpdate, onStopTracking, onSetActiveItem]);

  const handleStartTracking = () => {
    onStartTracking(item.id);
    onSetActiveItem(item.id);
  };

  const handleStopTracking = () => {
    onStopTracking(item.id);
    onSetActiveItem(null);
  };

  const handleSaveNotes = () => {
    onNotesUpdate(item.id, editedNotes);
    setIsEditing(false);
  };

  const handleTitleSave = () => {
    if (editTitle.trim() !== item.title) {
      onUpdate(item.id, { title: editTitle.trim() });
    }
    setIsEditing(false);
  };

  const handleDelete = () => {
    onDelete(item.id);
    setShowDeleteConfirm(false);
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
    if (!item.progress?.total || !item.progress.current) return 0;
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
    if (!item.progress?.sessions || item.progress.sessions.length === 0) {
      return (
        <div className="text-center text-gray-500 py-4">
          <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No learning sessions recorded yet.</p>
          <p className="text-sm">Start a session to begin tracking your progress!</p>
        </div>
      );
    }

    // Sort sessions by start time, most recent first
    const sortedSessions = [...item.progress.sessions].sort(
      (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    );

    return (
      <div className="mt-4 space-y-4">
        {/* Session Statistics */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg border border-blue-100">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-lg text-blue-800">Session Insights</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowStats(!showStats)}
              className="text-blue-600 hover:text-blue-700"
            >
              {showStats ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>
          
          {showStats && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-gray-600">Total Time</p>
                <p className="font-medium">{formatDuration(Math.floor(sessionStats.totalTime / 1000 / 60))}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-gray-600">Avg. Session</p>
                <p className="font-medium">{formatDuration(Math.floor(sessionStats.averageSessionLength / 1000 / 60))}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-gray-600">Best Time</p>
                <p className="font-medium">{sessionStats.bestTimeOfDay || 'N/A'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-gray-600">Most Productive</p>
                <p className="font-medium">{sessionStats.mostProductiveDay || 'N/A'}</p>
              </div>
            </div>
          )}
        </div>

        {/* Session List */}
        <div className="space-y-4">
          {sortedSessions.map((session, index) => {
            const isCurrentSession = !session.endTime;
            const startTime = new Date(session.startTime);
            const endTime = session.endTime ? new Date(session.endTime) : new Date();
            const duration = endTime.getTime() - startTime.getTime();
            const isExpanded = activeSessionIndex === index;
            
            return (
              <div 
                key={session.startTime} 
                className={clsx(
                  "border rounded-lg p-4 space-y-2 transition-all duration-200",
                  isCurrentSession ? "border-blue-200 bg-blue-50" : "border-gray-200 hover:border-blue-200"
                )}
              >
                <div className="flex justify-between items-center">
                  <Button
                    variant="ghost"
                    className="flex items-center gap-2 hover:bg-transparent p-0"
                    onClick={() => setActiveSessionIndex(isExpanded ? null : index)}
                  >
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    <h4 className="font-medium text-base">
                      {session.title || `Session ${sortedSessions.length - index}`}
                    </h4>
                    {isCurrentSession && (
                      <span className="text-sm text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full animate-pulse">
                        Active
                      </span>
                    )}
                  </Button>
                  <span className="text-sm font-medium text-gray-600">
                    {formatDuration(Math.floor(duration / 1000 / 60))}
                  </span>
                </div>
                
                {isExpanded && (
                  <div className="mt-4 space-y-4">
                    <div className="text-sm text-gray-600 grid grid-cols-2 gap-2">
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-2" />
                        <span>{startTime.toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-2" />
                        <span>{startTime.toLocaleTimeString()}</span>
                      </div>
                      {session.endTime && (
                        <>
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 mr-2" />
                            <span>{endTime.toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center">
                            <Clock className="w-4 h-4 mr-2" />
                            <span>{endTime.toLocaleTimeString()}</span>
                          </div>
                        </>
                      )}
                    </div>

                    {session.description && (
                      <div className="text-sm text-gray-600 bg-white bg-opacity-50 p-3 rounded-lg">
                        <p className="font-medium mb-1">Session Description:</p>
                        <p>{session.description}</p>
                      </div>
                    )}

                    {/* Session Notes */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h5 className="font-medium text-sm text-gray-700">Session Notes</h5>
                        {isCurrentSession && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setActiveSessionIndex(index)}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            <MessageSquare className="w-4 h-4 mr-1" />
                            Add Note
                          </Button>
                        )}
                      </div>
                      
                      {session.notes && session.notes.length > 0 ? (
                        <div className="space-y-2">
                          {session.notes.map((note, noteIndex) => (
                            <div key={noteIndex} className="bg-white p-2 rounded border border-gray-100">
                              <p className="text-sm text-gray-600">
                                {typeof note === 'string' 
                                  ? note 
                                  : note.content}
                              </p>
                              {typeof note !== 'string' && (
                                <p className="text-xs text-gray-400 mt-1">
                                  {note.timestamp}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 italic">No notes for this session</p>
                      )}

                      {isCurrentSession && isExpanded && (
                        <div className="flex gap-2 mt-2">
                          <Input
                            value={sessionNote}
                            onChange={(e) => setSessionNote(e.target.value)}
                            placeholder="Add a note..."
                            className="flex-1"
                          />
                          <Button
                            onClick={() => handleAddSessionNote(sessionNote)}
                            disabled={!sessionNote.trim()}
                          >
                            Add
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderSessionForm = () => {
    if (!showSessionForm) return null;

    return (
      <div className="mt-4 space-y-4">
        <Input
          placeholder="Session Title (optional)"
          value={currentSessionTitle}
          onChange={(e) => setCurrentSessionTitle(e.target.value)}
        />
        <Textarea
          placeholder="Session Description (optional)"
          value={currentSessionDescription}
          onChange={(e) => setCurrentSessionDescription(e.target.value)}
        />
        <div className="flex space-x-2">
          <Button 
            onClick={handleStartSession} 
            className="w-full"
          >
            Confirm Session Start
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setShowSessionForm(false)} 
            className="w-full"
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  };

  return (
    <Card className={clsx(
      "w-full p-4 relative border-l-4 transition-all duration-200",
      {
        'border-l-green-500 hover:border-l-green-600': item.status === 'completed',
        'border-l-yellow-500 hover:border-l-yellow-600': item.status === 'in_progress',
        'border-l-gray-400 hover:border-l-gray-500': item.status === 'not_started',
        'border-l-red-400 hover:border-l-red-500': item.status === 'on_hold',
        'border-l-blue-400 hover:border-l-blue-500': item.status === 'archived',
      }
    )}>
      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
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
                onClick={() => setShowDeleteConfirm(false)}
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
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
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
                  setEditTitle(item.title);
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
            onClick={() => setShowDeleteConfirm(true)}
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
              {formatDuration(getTotalMinutes(item.progress?.current))} / 
              {item.progress?.total ? formatDuration(getTotalMinutes(item.progress.total)) : '∞'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {item.progress?.lastAccessed ? (
              <span className="text-sm text-gray-600">
                {formatTime(elapsedTime)}
              </span>
            ) : null}
          </div>
        </div>
        
        {item.progress?.total && (
          <Progress
            value={calculateProgress(item.progress)}
            className="h-2"
          />
        )}
      </div>

      {/* Session Controls */}
      <div className="mt-4 space-y-4">
        {!item.progress?.isActive ? (
          <Button
            variant="outline"
            className="w-full bg-green-50 hover:bg-green-100 border-green-200 text-green-700"
            onClick={() => setShowSessionForm(true)}
          >
            <PlayCircle className="w-4 h-4 mr-2" />
            Start Session
          </Button>
        ) : (
          <Button
            variant="outline"
            className="w-full bg-red-50 hover:bg-red-100 border-red-200 text-red-700"
            onClick={handleStopSession}
          >
            <StopCircle className="w-4 h-4 mr-2" />
            Stop Session
          </Button>
        )}

        {/* Active Session */}
        {item.progress?.isActive && (
          <div className="p-4 bg-blue-50 rounded-lg space-y-4 border border-blue-200">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-blue-800">Current Session</h4>
              <span className="text-sm text-blue-600">{formatTime(elapsedTime)}</span>
            </div>
          </div>
        )}
      </div>

      {showSessionForm ? (
        renderSessionForm()
      ) : (
        !item.progress.sessions?.find(s => !s.endTime) && (
          <Button
            onClick={() => setShowSessionForm(true)}
            className="mt-4"
            variant="outline"
          >
            <PlayCircle className="w-4 h-4 mr-2" />
            Start New Session
          </Button>
        )
      )}
    </Card>
  );
}