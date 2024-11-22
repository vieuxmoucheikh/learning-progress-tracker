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
  Archive, 
  Edit2, 
  Save, 
  Plus, 
  Trash2, 
  ExternalLink,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import type { LearningItem, Session } from '../types';
import { formatTime, calculateProgress, formatDuration } from '../lib/utils';

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
    if (item.completed || item.status === 'archived') return;
    
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

  const handleArchive = async () => {
    try {
      if (isTracking) {
        await handleStopTracking();
      }
      
      // First update local state
      const updates: Partial<LearningItem> = {
        status: 'archived' as const,
        completed: true,
        completed_at: new Date().toISOString()
      };
      
      await onUpdate(item.id, updates);
    } catch (error) {
      console.error('Error archiving item:', error);
      throw error;
    }
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

  const handleMarkAsComplete = () => {
    if (isTracking) {
      handleStopTracking();
    }
    
    onUpdate(item.id, {
      completed: true,
      completed_at: new Date().toISOString(),
      status: 'completed'
    });
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

  const isDisabled = item.completed || item.status === 'archived';

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
    <Card className="overflow-hidden hover:shadow-md transition-shadow duration-200">
      <div className="p-6">
        {/* Header with title and type */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">{item.title}</h3>
            <div className="flex flex-wrap gap-2">
              <span className="px-2 py-1 bg-gray-100 rounded-full text-sm text-gray-700">
                {item.type}
              </span>
              {item.category && (
                <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
                  {item.category}
                </span>
              )}
              {item.completed && (
                <span className="px-2 py-1 bg-green-50 text-green-700 rounded-full text-sm flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  Completed
                </span>
              )}
              {item.status === 'archived' && (
                <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-sm flex items-center gap-1">
                  <Archive className="w-3 h-3" />
                  Archived
                </span>
              )}
            </div>
          </div>

          {/* URL link if available */}
          {item.url && (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-4 p-2 hover:bg-gray-50 rounded-full transition-colors"
            >
              <ExternalLink className="w-5 h-5 text-gray-400 hover:text-gray-600" />
            </a>
          )}
        </div>

        {/* Progress section */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">Progress</span>
            <span className="text-sm text-gray-600">
              {formatTime((item.progress?.current?.hours ?? 0) * 60 + (item.progress?.current?.minutes ?? 0))} / 
              {formatTime((item.progress?.total?.hours ?? 0) * 60 + (item.progress?.total?.minutes ?? 0))}
            </span>
          </div>
          <Progress value={calculateProgress(item.progress)} className="h-2" />
        </div>

        {/* Active session timer */}
        {item.lastTimestamp && (
          <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-green-600" />
                <span className="font-medium text-green-700">Current Session</span>
              </div>
              <span className="text-2xl font-bold text-green-700 tabular-nums">
                {formatDuration(elapsedTime)}
              </span>
            </div>
            
            {/* Add note input for active session */}
            <div className="mt-4">
              <div className="flex gap-2">
                <Input
                  value={newSessionNote}
                  onChange={(e) => setNewSessionNote(e.target.value)}
                  placeholder="Add a note for this session..."
                  onKeyDown={handleKeyDown}
                  className="flex-1 bg-white"
                />
                <Button
                  onClick={handleAddSessionNote}
                  disabled={!newSessionNote.trim()}
                  className="bg-green-100 hover:bg-green-200 text-green-700"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-green-600 mt-1">
                Press Enter to add a note
              </p>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2 mb-6">
          {!item.completed && !item.lastTimestamp && (
            <Button
              onClick={handleStartTracking}
              className="bg-green-50 hover:bg-green-100 text-green-700"
              size="sm"
            >
              <PlayCircle className="w-4 h-4 mr-1" />
              Start Session
            </Button>
          )}
          {item.lastTimestamp && (
            <Button
              onClick={handleStopTracking}
              className="bg-red-50 hover:bg-red-100 text-red-700"
              size="sm"
            >
              <StopCircle className="w-4 h-4 mr-1" />
              End Session
            </Button>
          )}
          <Button
            onClick={() => setShowSessionDetails(!showSessionDetails)}
            className="bg-gray-50 hover:bg-gray-100 text-gray-700"
            size="sm"
          >
            <Clock className="w-4 h-4 mr-1" />
            {showSessionDetails ? 'Hide History' : 'Show History'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAsComplete}
            disabled={item.status === 'archived' || isTracking}
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Mark Complete
          </Button>
        </div>

        {/* Notes section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-gray-700 flex items-center gap-2">
              <Edit2 className="w-4 h-4" />
              General Notes
            </h4>
            {!isEditing && (
              <Button
                onClick={() => setIsEditing(true)}
                className="text-blue-600 hover:text-blue-700"
                variant="ghost"
                size="sm"
              >
                <Edit2 className="w-4 h-4" />
              </Button>
            )}
          </div>
          
          {isEditing ? (
            <div className="space-y-3">
              <Textarea
                value={editedNotes}
                onChange={(e) => setEditedNotes(e.target.value)}
                placeholder="Add your notes here..."
                className="min-h-[100px]"
              />
              <div className="flex justify-end gap-2">
                <Button
                  onClick={() => {
                    setIsEditing(false);
                    setEditedNotes(item.notes || '');
                  }}
                  className="bg-gray-50 hover:bg-gray-100"
                  size="sm"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveNotes}
                  className="bg-blue-50 hover:bg-blue-100 text-blue-700"
                  size="sm"
                >
                  <Save className="w-4 h-4 mr-1" />
                  Save
                </Button>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-lg p-4 min-h-[100px]">
              {item.notes ? (
                <div className="prose prose-sm max-w-none text-gray-600">
                  {item.notes}
                </div>
              ) : (
                <p className="text-gray-400 italic">No notes added yet</p>
              )}
            </div>
          )}
        </div>

        {/* Session details section */}
        {showSessionDetails && (
          <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
            <div>
              <h4 className="font-medium mb-2 text-gray-700 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Session History ({item.progress.sessions.length})
              </h4>
              {item.progress.sessions.map((session, index) => (
                <div key={index} className="mb-4 bg-white rounded-lg shadow-sm p-4 border border-gray-100">
                  {/* Session header */}
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm font-medium text-gray-700">
                      Session #{item.progress.sessions.length - index}
                    </span>
                    <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full">
                      {new Date(session.date).toLocaleDateString(undefined, { 
                        weekday: 'short',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </span>
                  </div>

                  {/* Session times */}
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="bg-gray-50 p-2 rounded">
                      <div className="text-xs text-gray-500 mb-1">Started</div>
                      <div className="text-sm font-medium">
                        {new Date(session.startTime).toLocaleTimeString()}
                      </div>
                    </div>
                    {session.endTime && (
                      <div className="bg-gray-50 p-2 rounded">
                        <div className="text-xs text-gray-500 mb-1">Ended</div>
                        <div className="text-sm font-medium">
                          {new Date(session.endTime).toLocaleTimeString()}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Duration if available */}
                  {session.duration && (
                    <div className="flex items-center gap-2 mb-3 text-sm text-gray-600 bg-green-50 p-2 rounded">
                      <Clock className="w-4 h-4 text-green-600" />
                      <span className="font-medium text-green-700">
                        Duration: {session.duration.hours}h {session.duration.minutes}m
                      </span>
                    </div>
                  )}

                  {/* Session notes */}
                  {(session.notes?.length ?? 0) > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                        <Edit2 className="w-4 h-4" />
                        Session Notes
                      </p>
                      <ul className="space-y-2">
                        {session.notes?.map((note, noteIndex) => (
                          <li 
                            key={noteIndex}
                            className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-100"
                          >
                            {note}
                          </li>
                        ))}
                      </ul>
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