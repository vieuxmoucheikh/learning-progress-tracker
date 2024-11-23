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
  X
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
  onSessionNoteAdd: (id: string, note: string) => void;
  onSetActiveItem: (id: string | null) => void;
}

export function LearningItemCard({
  item,
  onUpdate,
  onDelete,
  onStartTracking,
  onStopTracking,
  onNotesUpdate,
  onSessionNoteAdd,
  onSetActiveItem,
}: Props) {
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editedNotes, setEditedNotes] = useState(item.notes || '');
  const [newSessionNote, setNewSessionNote] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showSessionDetails, setShowSessionDetails] = useState(false);
  const [editTitle, setEditTitle] = useState(item.title);

  const calculateTotalTimeFromSessions = useCallback((sessions: Session[]) => {
    return sessions.reduce((total, session) => {
      if (session.duration) {
        const sessionMinutes = (session.duration.hours * 60) + session.duration.minutes;
        return total + sessionMinutes;
      }
      return total;
    }, 0);
  }, []);

  const handleStopTracking = useCallback(() => {
    if (!item.lastTimestamp) return;

    // Calculate current session duration
    const sessionDuration = Math.floor((Date.now() - item.lastTimestamp) / 1000);
    const sessionMinutes = Math.floor(sessionDuration / 60);
    
    // Create new session entry
    const newSession: Session = {
      startTime: new Date(item.lastTimestamp).toISOString(),
      endTime: new Date().toISOString(),
      duration: {
        hours: Math.floor(sessionMinutes / 60),
        minutes: sessionMinutes % 60
      },
      date: new Date().toISOString().split('T')[0],
      notes: []
    };

    // Calculate total time including all sessions
    const allSessions = [...item.progress.sessions, newSession];
    const totalMinutes = calculateTotalTimeFromSessions(allSessions);

    onUpdate(item.id, {
      progress: {
        ...item.progress,
        sessions: allSessions,
        current: {
          hours: Math.floor(totalMinutes / 60),
          minutes: totalMinutes % 60
        }
      }
    });
    onStopTracking(item.id);
    onSetActiveItem(null);
  }, [item.id, item.lastTimestamp, item.progress, onStopTracking, onSetActiveItem, onUpdate, calculateTotalTimeFromSessions]);

  const handleStartTracking = () => {
    if (item.completed) return;
    
    // Calculate current progress before starting new session
    const currentProgress = {
      ...item.progress.current,
      // Keep existing progress
    };
    
    onUpdate(item.id, {
      progress: {
        ...item.progress,
        current: currentProgress,
      }
    });
    onStartTracking(item.id);
    onSetActiveItem(item.id);
  };

  const handleSaveNotes = () => {
    const trimmedNotes = editedNotes.trim();
    onNotesUpdate(item.id, trimmedNotes);
    setIsEditing(false);
    setEditedNotes(trimmedNotes);
  };

  const handleAddSessionNote = () => {
    const trimmedNote = newSessionNote.trim();
    if (trimmedNote) {
      const currentSession = item.progress.sessions[item.progress.sessions.length - 1];
      if (currentSession) {
        onUpdate(item.id, {
          progress: {
            ...item.progress,
            sessions: [
              ...item.progress.sessions.slice(0, -1),
              {
                ...currentSession,
                notes: [...(currentSession.notes || []), trimmedNote]
              }
            ]
          }
        });
        onSessionNoteAdd(item.id, trimmedNote);
        setNewSessionNote('');
      }
    }
  };

  const handleMarkAsComplete = () => {
    if (isTracking) {
      handleStopTracking();
    }
    
    onUpdate(item.id, {
      completed: !item.completed,
      completed_at: !item.completed ? new Date().toISOString() : null,
      status: !item.completed ? 'completed' : 'not_started'
    });
  };

  const handleDelete = () => {
    if (isTracking) {
      handleStopTracking();
    }
    setShowDeleteConfirm(false);
    onDelete(item.id);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddSessionNote();
    }
  };

  const progress = calculateProgress(item.progress);
  const isTracking = Boolean(item.lastTimestamp);
  const currentMinutes = (item.progress.current.hours * 60) + item.progress.current.minutes;
  const totalMinutes = item.progress.total ? 
    (item.progress.total.hours * 60) + 
    item.progress.total.minutes : 
    null;
  
  const progressText = totalMinutes ? 
    `${formatDuration(currentMinutes)} / ${formatDuration(totalMinutes)}` :
    formatDuration(currentMinutes);

  const isDisabled = item.completed;

  // Timer effect
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (item.lastTimestamp) {
      const updateElapsedTime = () => {
        const elapsed = Math.floor((Date.now() - item.lastTimestamp!) / 1000);
        setElapsedTime(elapsed);

        // Calculate current progress including the current session time
        const currentSessionMinutes = Math.floor(elapsed / 60);
        const totalCurrentMinutes = currentSessionMinutes + 
          (item.progress.current.hours * 60) + 
          item.progress.current.minutes;

        // Check if we've reached the total time
        if (item.progress.total) {
          const totalMinutes = (item.progress.total.hours * 60) + 
            item.progress.total.minutes;

          if (totalCurrentMinutes >= totalMinutes && !item.completed) {
            handleStopTracking();
            onUpdate(item.id, {
              completed: true,
              completed_at: new Date().toISOString(),
              status: 'completed',
              progress: {
                ...item.progress,
                current: {
                  hours: Math.floor(totalMinutes / 60),
                  minutes: totalMinutes % 60
                }
              }
            });
          }
        }
      };

      updateElapsedTime();
      intervalId = setInterval(updateElapsedTime, 1000);
    } else {
      setElapsedTime(0);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [item.lastTimestamp, item.progress, item.completed, item.id, handleStopTracking, onUpdate]);

  return (
    <Card className={clsx(
      "p-4 transition-all duration-200",
      item.status === 'completed' && "bg-green-50 border-green-200",
      item.status === 'in_progress' && "bg-blue-50 border-blue-200",
      item.status === 'on_hold' && "bg-yellow-50 border-yellow-200",
      item.status === 'archived' && "bg-gray-50 border-gray-200",
      item.status === 'not_started' && "bg-white border-gray-200",
      isEditing && "ring-2 ring-blue-500"
    )}>
      <div className="flex flex-col space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {isEditing ? (
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="text-lg font-semibold"
              />
            ) : (
              <h3 className="text-lg font-semibold">{item.title}</h3>
            )}
            <div className="flex items-center mt-1 space-x-2 text-sm text-gray-600">
              <span className={clsx(
                "px-2 py-0.5 rounded-full text-xs font-medium",
                item.status === 'completed' && "bg-green-100 text-green-800",
                item.status === 'in_progress' && "bg-blue-100 text-blue-800",
                item.status === 'on_hold' && "bg-yellow-100 text-yellow-800",
                item.status === 'archived' && "bg-gray-100 text-gray-800",
                item.status === 'not_started' && "bg-gray-100 text-gray-800"
              )}>
                {item.status.replace('_', ' ')}
              </span>
              <span>•</span>
              <span className={clsx(
                "px-2 py-0.5 rounded-full text-xs font-medium",
                item.priority === 'high' && "bg-red-100 text-red-800",
                item.priority === 'medium' && "bg-yellow-100 text-yellow-800",
                item.priority === 'low' && "bg-green-100 text-green-800"
              )}>
                {item.priority} priority
              </span>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {item.url && (
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
            {isEditing ? (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleSaveNotes}
                  className="text-green-600 hover:text-green-700"
                >
                  <Save className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsEditing(false)}
                  className="text-gray-600 hover:text-gray-700"
                >
                  <X className="w-4 h-4" />
                </Button>
              </>
            ) : (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsEditing(true)}
                  className="text-gray-600 hover:text-gray-700"
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleDelete}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Progress Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600">
                {formatTime(getTotalMinutes(item.progress?.current || { hours: 0, minutes: 0 }) * 60)} / 
                {item.progress?.total ? formatTime(getTotalMinutes(item.progress.total) * 60) : 'No goal set'}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              {isTracking ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleStopTracking}
                  className="text-red-600 hover:text-red-700"
                >
                  <StopCircle className="w-4 h-4 mr-1" />
                  Stop
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleStartTracking}
                  className="text-green-600 hover:text-green-700"
                  disabled={item.status === 'completed' || item.status === 'archived'}
                >
                  <PlayCircle className="w-4 h-4 mr-1" />
                  Start
                </Button>
              )}
            </div>
          </div>
          
          {item.progress?.total && (
            <div className="space-y-1">
              <Progress 
                value={calculateProgress(item.progress)} 
                className={clsx(
                  "h-2",
                  item.status === 'completed' && "bg-green-100",
                  item.status === 'in_progress' && "bg-blue-100",
                  item.status === 'on_hold' && "bg-yellow-100",
                  item.status === 'archived' && "bg-gray-100",
                  item.status === 'not_started' && "bg-gray-100"
                )}
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>{Math.round(calculateProgress(item.progress))}% complete</span>
                <span>{formatDuration(item.progress?.current || { hours: 0, minutes: 0 })}</span>
              </div>
            </div>
          )}
        </div>

        {/* Notes Section */}
        {(item.notes || isEditing) && (
          <div className="mt-2">
            {isEditing ? (
              <Textarea
                value={editedNotes}
                onChange={(e) => setEditedNotes(e.target.value)}
                placeholder="Add notes..."
                className="mt-2"
                rows={3}
              />
            ) : (
              item.notes && (
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{item.notes}</p>
              )
            )}
          </div>
        )}

        {/* Session Notes */}
        {item.progress?.sessions?.length > 0 && (
          <div className="mt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Recent Sessions</h4>
            <div className="space-y-2">
              {item.progress.sessions.slice(-3).reverse().map((session, index) => (
                <div key={index} className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                  <div className="flex justify-between items-center">
                    <span>{new Date(session.date).toLocaleDateString()}</span>
                    <span>{formatDuration(session.duration || { hours: 0, minutes: 0 })}</span>
                  </div>
                  {(session.notes ?? []).length > 0 && (
                    <div className="mt-1 text-xs text-gray-500">
                      {(session.notes ?? []).map((note, i) => (
                        <p key={i}>{note}</p>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}