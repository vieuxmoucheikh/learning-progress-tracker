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
    <Card className="w-full max-w-[800px] mx-auto mb-4 p-4 sm:p-6 relative hover:shadow-lg transition-shadow">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-xl font-semibold truncate mb-1">{item.title}</h3>
          <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
            <span className="inline-flex items-center">
              <Clock className="w-4 h-4 mr-1" />
              {formatTime((item.progress?.current?.hours ?? 0) * 60 + (item.progress?.current?.minutes ?? 0))}
            </span>
            {item.url && (
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center hover:text-primary transition-colors"
              >
                <ExternalLink className="w-4 h-4 mr-1" />
                Resource
              </a>
            )}
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          {!item.completed && (
            <Button
              variant={isTracking ? "destructive" : "default"}
              size="sm"
              className="flex-1 sm:flex-none"
              onClick={isTracking ? handleStopTracking : handleStartTracking}
            >
              {isTracking ? (
                <>
                  <StopCircle className="w-4 h-4 mr-2" />
                  Stop ({formatDuration(elapsedTime)})
                </>
              ) : (
                <>
                  <PlayCircle className="w-4 h-4 mr-2" />
                  Start
                </>
              )}
            </Button>
          )}
          
          <Button
            variant="outline"
            size="sm"
            className="flex-1 sm:flex-none"
            onClick={handleMarkAsComplete}
          >
            {item.completed ? (
              <>
                <AlertCircle className="w-4 h-4 mr-2" />
                Unmark
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Complete
              </>
            )}
          </Button>
        </div>
      </div>

      <Progress 
        value={calculateProgress(item.progress)} 
        className="h-2 mb-4"
      />

      <div className="space-y-4">
        {/* Notes Section */}
        <div className="bg-muted/50 rounded-lg p-4">
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-medium">Notes</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(!isEditing)}
            >
              {isEditing ? (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save
                </>
              ) : (
                <>
                  <Edit2 className="w-4 h-4 mr-2" />
                  Edit
                </>
              )}
            </Button>
          </div>
          
          {isEditing ? (
            <Textarea
              value={editedNotes}
              onChange={(e) => setEditedNotes(e.target.value)}
              className="min-h-[100px]"
              placeholder="Add your notes here..."
            />
          ) : (
            <div className="whitespace-pre-wrap">
              {item.notes || "No notes yet"}
            </div>
          )}
        </div>

        {/* Session Notes Section */}
        <div className="bg-muted/50 rounded-lg p-4">
          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <Input
              value={newSessionNote}
              onChange={(e) => setNewSessionNote(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Add a session note..."
              className="flex-1"
            />
            <Button
              onClick={handleAddSessionNote}
              disabled={!newSessionNote.trim()}
              className="w-full sm:w-auto"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Note
            </Button>
          </div>

          {item.progress.sessions && item.progress.sessions.length > 0 && (
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {item.progress.sessions.map((session, index) => (
                <div
                  key={index}
                  className="bg-background p-2 rounded text-sm"
                >
                  {session.notes && session.notes.length > 0 && (
                    <div className="space-y-2">
                      {session.notes.map((note, noteIndex) => (
                        <div key={noteIndex} className="flex items-start justify-between">
                          <span>{note}</span>
                          <span className="text-xs text-purple-400 ml-2">
                            {new Date(session.startTime).toLocaleTimeString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="absolute top-4 right-4">
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={() => setShowDeleteConfirm(true)}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Delete Item</h3>
            <p className="mb-6">Are you sure you want to delete this learning item? This action cannot be undone.</p>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
              >
                Delete
              </Button>
            </div>
          </Card>
        </div>
      )}
    </Card>
  );
}