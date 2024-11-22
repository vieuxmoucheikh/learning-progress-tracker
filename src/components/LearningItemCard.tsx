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
import type { LearningItem } from '../types';
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

  const handleStopTracking = useCallback(() => {
    if (!item.lastTimestamp) return;

    // Calculate final progress including the current session
    const sessionDuration = Math.floor((Date.now() - item.lastTimestamp) / 1000);
    const additionalMinutes = Math.floor(sessionDuration / 60);
    const totalMinutes = additionalMinutes + 
      (item.progress.current.hours * 60) + 
      item.progress.current.minutes;

    onUpdate(item.id, {
      progress: {
        ...item.progress,
        current: {
          hours: Math.floor(totalMinutes / 60),
          minutes: totalMinutes % 60
        }
      }
    });
    onStopTracking(item.id);
    onSetActiveItem(null);
  }, [item.id, item.lastTimestamp, item.progress, onStopTracking, onSetActiveItem, onUpdate]);

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

  return (
    <div
      id={`item-${item.id}`}
      className={`bg-white rounded-lg shadow-sm border ${
        item.status === 'archived' ? 'border-gray-200' :
        item.status === 'completed' ? 'border-green-200' : 'border-indigo-200'
      } p-4 transition-all duration-200`}
    >
      {showDeleteConfirm && (
        <div className="absolute inset-0 bg-white bg-opacity-95 rounded-lg flex items-center justify-center z-10">
          <div className="text-center p-4">
            <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <h3 className="font-medium mb-2">Delete this item?</h3>
            <p className="text-sm text-gray-500 mb-4">This action cannot be undone.</p>
            <div className="flex gap-2 justify-center">
              <Button variant="destructive" size="sm" onClick={handleDelete}>
                Delete
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {/* Title and basic info */}
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-medium">{item.title}</h3>
            <p className="text-sm text-gray-500">{item.category}</p>
          </div>
          <div className="flex items-center space-x-2">
            {item.status === 'completed' && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                <CheckCircle className="w-3 h-3 mr-1" />
                Completed
              </span>
            )}
            {item.status === 'archived' && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                <Archive className="w-3 h-3 mr-1" />
                Archived
              </span>
            )}
          </div>
        </div>

        {/* Progress section */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm text-gray-500">
            <span>Progress</span>
            <span>{progressText}</span>
          </div>
          <Progress value={progress} />
        </div>

        {/* Session tracking controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Button
              variant={item.lastTimestamp ? "destructive" : "default"}
              size="sm"
              onClick={() => item.lastTimestamp ? handleStopTracking() : handleStartTracking()}
            >
              {item.lastTimestamp ? (
                <>
                  <StopCircle className="w-4 h-4 mr-1" />
                  Stop
                </>
              ) : (
                <>
                  <PlayCircle className="w-4 h-4 mr-1" />
                  Start
                </>
              )}
            </Button>
            {item.lastTimestamp && (
              <span className="text-sm text-gray-500">
                {formatDuration(elapsedTime)}
              </span>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSessionDetails(!showSessionDetails)}
          >
            {showSessionDetails ? 'Hide Details' : 'Show Details'}
          </Button>
        </div>

        {/* Session details and notes */}
        {showSessionDetails && (
          <div className="space-y-4 mt-4 bg-gray-50 p-4 rounded-lg">
            <div>
              <h4 className="font-medium mb-2">Session History</h4>
              {item.progress.sessions.map((session, index) => (
                <div key={index} className="mb-3 p-2 bg-white rounded border">
                  <div className="flex justify-between text-sm">
                    <span>{new Date(session.date).toLocaleDateString()}</span>
                    <span>{new Date(session.startTime).toLocaleTimeString()}</span>
                  </div>
                  {(session.notes?.length ?? 0) > 0 && (
                    <div className="mt-2">
                      <p className="text-sm font-medium">Session Notes:</p>
                      <ul className="list-disc list-inside text-sm text-gray-600">
                        {session.notes?.map((note, noteIndex) => (
                          <li key={noteIndex}>{note}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div>
              <h4 className="font-medium mb-2">Notes</h4>
              {isEditing ? (
                <div className="space-y-2">
                  <Textarea
                    value={editedNotes}
                    onChange={(e) => setEditedNotes(e.target.value)}
                    className="w-full"
                    rows={4}
                  />
                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIsEditing(false);
                        setEditedNotes(item.notes || '');
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        onNotesUpdate(item.id, editedNotes);
                        setIsEditing(false);
                      }}
                    >
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">
                    {item.notes || 'No notes added yet.'}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-0 right-0"
                    onClick={() => setIsEditing(true)}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* Add session note */}
            <div>
              <h4 className="font-medium mb-2">Add Session Note</h4>
              <div className="flex space-x-2">
                <Input
                  value={newSessionNote}
                  onChange={(e) => setNewSessionNote(e.target.value)}
                  placeholder="Add a note for this session..."
                  className="flex-1"
                />
                <Button
                  onClick={() => {
                    if (newSessionNote.trim()) {
                      onSessionNoteAdd(item.id, newSessionNote);
                      setNewSessionNote('');
                    }
                  }}
                  disabled={!newSessionNote.trim()}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex justify-end space-x-2 mt-4">
          {item.url && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(item.url, '_blank')}
            >
              <ExternalLink className="w-4 h-4 mr-1" />
              Open Link
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDeleteConfirm(true)}
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}