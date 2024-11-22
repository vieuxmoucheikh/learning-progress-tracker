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
    <Card className={`p-4 space-y-4 relative ${isDisabled ? 'opacity-75' : ''}`}>
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

      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold">{item.title}</h3>
            {item.completed && (
              <CheckCircle className="w-4 h-4 text-green-500" />
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Clock className="w-4 h-4" />
            <span>{progressText}</span>
            {isTracking && (
              <span className="text-blue-500">
                (+{formatTime(elapsedTime)})
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {item.url && (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:text-blue-600"
              title="Open URL"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          )}

          {!isDisabled && (
            isTracking ? (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleStopTracking}
                title="Stop tracking"
              >
                <StopCircle className="w-4 h-4 mr-1" />
                Stop
              </Button>
            ) : (
              <Button
                variant="default"
                size="sm"
                onClick={handleStartTracking}
                title="Start tracking"
              >
                <PlayCircle className="w-4 h-4 mr-1" />
                Start
              </Button>
            )
          )}

          {!item.status?.includes('archived') && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleArchive}
              title="Archive item"
            >
              <Archive className="w-4 h-4" />
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDeleteConfirm(true)}
            title="Delete item"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Progress 
          value={progress} 
          className={`h-2 ${
            item.completed ? 'bg-green-100' : 
            isTracking ? 'bg-blue-100' : 'bg-gray-100'
          }`}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Notes</span>
          {!isEditing ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(true)}
              title="Edit notes"
            >
              <Edit2 className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSaveNotes}
              title="Save notes"
            >
              <Save className="w-4 h-4" />
            </Button>
          )}
        </div>
        {isEditing ? (
          <Textarea
            value={editedNotes}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEditedNotes(e.target.value)}
            className="min-h-[100px] resize-none"
            placeholder="Add your notes here..."
          />
        ) : (
          <p className="text-sm text-gray-600 whitespace-pre-wrap min-h-[2.5rem]">
            {item.notes || 'No notes yet'}
          </p>
        )}
      </div>

      {isTracking && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Input
              placeholder="Add session note... (Press Enter to add)"
              value={newSessionNote}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewSessionNote(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddSessionNote}
              title="Add session note"
              disabled={!newSessionNote.trim()}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {item.progress.sessions[item.progress.sessions.length - 1]?.notes?.map((note, index) => (
              <p key={index} className="text-sm text-gray-600 pl-4 relative before:content-['•'] before:absolute before:left-1">
                {note}
              </p>
            ))}
          </div>
        </div>
      )}

      {item.completed && (
        <div className="mt-2 py-1 px-2 bg-green-50 text-green-600 text-sm rounded flex items-center gap-1">
          <CheckCircle className="w-4 h-4" />
          <span>Completed</span>
        </div>
      )}
    </Card>
  );
}