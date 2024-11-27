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
  const [showNotes, setShowNotes] = useState(false);
  const [showSessionNotes, setShowSessionNotes] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    setEditedNotes(item.notes || '');
    setEditTitle(item.title);
  }, [item.notes, item.title]);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    if (item.lastTimestamp) {
      const updateElapsedTime = () => {
        const elapsed = Math.floor((Date.now() - item.lastTimestamp!) / 1000);
        setElapsedTime(elapsed);
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
  }, [item.lastTimestamp]);

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

  const handleAddSessionNote = () => {
    if (newSessionNote.trim()) {
      onSessionNoteAdd(item.id, newSessionNote);
      setNewSessionNote('');
    }
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
      completedAt: item.status === 'completed' ? null : new Date().toISOString()
    });
  };

  const toggleSessionNotes = (sessionId: string) => {
    setShowSessionNotes(prev => ({
      ...prev,
      [sessionId]: !prev[sessionId]
    }));
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

  return (
    <Card className={clsx(
      'p-4 relative transition-all duration-200',
      item.status === 'completed' && 'bg-green-50',
      item.lastTimestamp && 'border-blue-500 border-2'
    )}>
      <div className="flex items-center justify-between mb-4">
        {isEditing ? (
          <Input
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className="flex-1 mr-2"
            onKeyDown={(e) => e.key === 'Enter' && handleTitleSave()}
          />
        ) : (
          <h3 className={clsx(
            'text-lg font-semibold flex-1',
            item.status === 'completed' && 'line-through text-gray-500'
          )}>
            {item.title}
          </h3>
        )}
        
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleMarkComplete}
            className={clsx(
              'flex items-center',
              item.status === 'completed' ? 'text-green-600' : 'text-gray-600'
            )}
          >
            {item.status === 'completed' ? (
              <>
                <CheckCircle className="w-4 h-4 mr-1" />
                Completed
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-1" />
                Mark Complete
              </>
            )}
          </Button>
          
          {!item.lastTimestamp ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleStartTracking}
              className="text-blue-600"
            >
              <PlayCircle className="w-4 h-4 mr-1" />
              Start Session
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleStopTracking}
              className="text-red-600"
            >
              <StopCircle className="w-4 h-4 mr-1" />
              Stop Session
            </Button>
          )}
        </div>
      </div>

      {/* Progress tracking */}
      <div className="mt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span className="text-sm">
              {formatTime(elapsedTime)}
            </span>
          </div>
          <div>
            {item.lastTimestamp ? (
              <Button
                size="sm"
                variant="outline"
                onClick={handleStopTracking}
                className="gap-2"
              >
                <StopCircle className="h-4 w-4" />
                Stop
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={handleStartTracking}
                className="gap-2"
              >
                <PlayCircle className="h-4 w-4" />
                Start
              </Button>
            )}
          </div>
        </div>
        {renderProgressBar()}
      </div>

      {/* Notes section */}
      <div className="mt-4">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setShowNotes(!showNotes)}
          className="mb-2"
        >
          {showNotes ? 'Hide Notes' : 'Show Notes'}
        </Button>
        
        {showNotes && (
          <>
            {isEditing ? (
              <div className="space-y-2">
                <Textarea
                  value={editedNotes}
                  onChange={(e) => setEditedNotes(e.target.value)}
                  className="w-full"
                  rows={3}
                />
                <Button
                  size="sm"
                  onClick={handleSaveNotes}
                  className="gap-2"
                >
                  <Save className="h-4 w-4" />
                  Save Notes
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  {item.notes || 'No notes yet.'}
                </p>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsEditing(true)}
                  className="gap-2"
                >
                  <Edit2 className="h-4 w-4" />
                  Edit Notes
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Session notes */}
      <div className="mt-4">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setShowSessionDetails(!showSessionDetails)}
          className="mb-2"
        >
          {showSessionDetails ? 'Hide Sessions' : 'Show Sessions'}
        </Button>
        
        {showSessionDetails && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Input
                value={newSessionNote}
                onChange={(e) => setNewSessionNote(e.target.value)}
                placeholder="Add a session note..."
                className="flex-1"
              />
              <Button
                size="sm"
                onClick={handleAddSessionNote}
                disabled={!newSessionNote.trim()}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            
            {item.progress?.sessions.map((session, index) => (
              <div
                key={index}
                className="text-sm text-gray-600 border-l-2 border-gray-200 pl-2"
              >
                <div className="font-medium">
                  {formatDate(session.date)} • {session.duration ? formatDuration(getTotalMinutes(session.duration)) : '0h 0m'}
                </div>
                {session.notes && session.notes.length > 0 && (
                  <div className="mt-1 text-xs text-gray-500">
                    {session.notes.map((note, i) => (
                      <p key={i}>{note}</p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Session Notes Section */}
      {item.progress?.sessions && item.progress.sessions.length > 0 && (
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-gray-700">Session History</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSessionDetails(!showSessionDetails)}
            >
              {showSessionDetails ? 'Hide Details' : 'Show Details'}
            </Button>
          </div>

          {showSessionDetails && (
            <div className="space-y-3">
              {item.progress.sessions.map((session, index) => (
                <div
                  key={index}
                  className="p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                      {new Date(session.date).toLocaleDateString()} - {formatDuration(getTotalMinutes(session))}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleSessionNotes(`${index}`)}
                    >
                      {showSessionNotes[`${index}`] ? 'Hide Notes' : 'Show Notes'}
                    </Button>
                  </div>

                  {showSessionNotes[`${index}`] && (
                    <div className="mt-2 space-y-2">
                      {session.notes && session.notes.length > 0 ? (
                        session.notes.map((note, noteIndex) => (
                          <div key={noteIndex} className="text-sm bg-white p-2 rounded border border-gray-200">
                            {note}
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500 italic">No notes for this session</p>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {/* Add New Session Note */}
              <div className="mt-3 space-y-2">
                <Textarea
                  value={newSessionNote}
                  onChange={(e) => setNewSessionNote(e.target.value)}
                  placeholder="Add a note for the current session..."
                  className="w-full"
                />
                <Button
                  onClick={handleAddSessionNote}
                  disabled={!newSessionNote.trim()}
                  className="w-full"
                >
                  Add Note
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}