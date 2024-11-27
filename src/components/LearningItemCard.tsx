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
  const [currentSessionTitle, setCurrentSessionTitle] = useState('');
  const [currentSessionDescription, setCurrentSessionDescription] = useState('');
  const [showSessionForm, setShowSessionForm] = useState(false);

  // Session management
  const handleStartSession = () => {
    if (currentSessionTitle.trim() === '') {
      setCurrentSessionTitle(`Session ${item.progress.sessions.length + 1}`);
    }
    onStartTracking(item.id);
    setShowSessionForm(false);
  };

  const handleStopSession = () => {
    onStopTracking(item.id);
    setCurrentSessionTitle('');
    setCurrentSessionDescription('');
    setShowSessionForm(false);
  };

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
      completed: item.status === 'completed' ? false : true
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
    <Card className="w-full p-4 relative">
      {/* Header Section */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          {isEditing ? (
            <div className="flex items-center gap-2">
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="text-lg font-semibold"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={handleTitleSave}
                className="text-green-600"
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
                className="text-red-600"
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
                className="text-gray-500 hover:text-gray-700"
              >
                <Edit2 className="h-4 w-4" />
              </Button>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
            <span className={clsx(
              "px-2 py-1 rounded-full text-xs",
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
            onClick={() => setShowDeleteConfirm(true)}
            className="text-red-500 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          {item.url && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => window.open(item.url, '_blank')}
              className="text-blue-500 hover:text-blue-700"
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
              {formatDuration(getTotalMinutes(item.progress.current))} / 
              {item.progress.total ? formatDuration(getTotalMinutes(item.progress.total)) : '∞'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {item.lastTimestamp ? (
              <span className="text-sm text-gray-600">
                {formatTime(elapsedTime)}
              </span>
            ) : null}
          </div>
        </div>
        
        {item.progress.total && (
          <Progress
            value={calculateProgress(item.progress)}
            className="h-2"
          />
        )}
      </div>

      {/* Session Controls */}
      <div className="mt-4 space-y-4">
        {!item.lastTimestamp ? (
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

        {/* Session Form */}
        {showSessionForm && !item.lastTimestamp && (
          <div className="p-4 bg-green-50 rounded-lg space-y-4 border border-green-200">
            <Input
              placeholder="Session Title (optional)"
              value={currentSessionTitle}
              onChange={(e) => setCurrentSessionTitle(e.target.value)}
              className="mb-2 border-green-200 focus:ring-green-500"
            />
            <Textarea
              placeholder="Session Description (optional)"
              value={currentSessionDescription}
              onChange={(e) => setCurrentSessionDescription(e.target.value)}
              className="mb-2 border-green-200 focus:ring-green-500"
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => setShowSessionForm(false)}
                className="text-gray-600 hover:text-gray-800"
              >
                Cancel
              </Button>
              <Button
                onClick={handleStartSession}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                Start Session
              </Button>
            </div>
          </div>
        )}

        {/* Active Session Notes */}
        {item.lastTimestamp && (
          <div className="p-4 bg-blue-50 rounded-lg space-y-4 border border-blue-200">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-blue-800">Current Session Notes</h4>
              <span className="text-sm text-blue-600">{formatTime(elapsedTime)}</span>
            </div>
            <Textarea
              placeholder="Add a note about your current session..."
              value={newSessionNote}
              onChange={(e) => setNewSessionNote(e.target.value)}
              className="border-blue-200 focus:ring-blue-500"
            />
            <Button
              onClick={() => {
                if (newSessionNote.trim()) {
                  onSessionNoteAdd(item.id, newSessionNote);
                  setNewSessionNote('');
                }
              }}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              disabled={!newSessionNote.trim()}
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Add Note
            </Button>
          </div>
        )}

        {/* Session History */}
        {item.progress.sessions.length > 0 && (
          <div className="mt-4">
            <Button
              variant="ghost"
              className="w-full flex justify-between items-center hover:bg-gray-100"
              onClick={() => setShowSessionDetails(!showSessionDetails)}
            >
              <span className="flex items-center">
                <BookOpen className="w-4 h-4 mr-2" />
                Session History ({item.progress.sessions.length})
              </span>
              {showSessionDetails ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </Button>
            
            {showSessionDetails && (
              <div className="mt-2 space-y-3">
                {item.progress.sessions.map((session, index) => (
                  <div
                    key={index}
                    className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">
                          {session.title || `Session ${index + 1}`}
                        </h4>
                        <div className="text-sm text-gray-500 space-x-2 mt-1">
                          <Calendar className="w-4 h-4 inline-block mr-1" />
                          <span>{new Date(session.date).toLocaleDateString()}</span>
                          <span>•</span>
                          <Clock className="w-4 h-4 inline-block mx-1" />
                          <span>
                            {new Date(session.startTime).toLocaleTimeString()} - 
                            {session.endTime ? new Date(session.endTime).toLocaleTimeString() : 'In Progress'}
                          </span>
                          {session.duration && (
                            <>
                              <span>•</span>
                              <span className="font-medium text-gray-700">{formatDuration(getTotalMinutes(session.duration))}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {session.description && (
                      <p className="mt-2 text-sm text-gray-600 bg-white p-2 rounded border border-gray-100">
                        {session.description}
                      </p>
                    )}
                    
                    {/* Session Notes */}
                    {session.notes && session.notes.length > 0 && (
                      <div className="mt-3 space-y-2">
                        <h5 className="text-sm font-medium text-gray-700 flex items-center">
                          <MessageSquare className="w-4 h-4 mr-1" />
                          Session Notes
                        </h5>
                        {session.notes.map((note, noteIndex) => (
                          <div key={noteIndex} className="text-sm bg-white p-2 rounded border border-gray-100">
                            {note}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="absolute right-0 top-0 bg-white p-4 rounded-lg shadow-lg border z-10">
          <p className="text-sm mb-2">Are you sure you want to delete this item?</p>
          <div className="flex justify-end space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDeleteConfirm(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                onDelete(item.id);
                setShowDeleteConfirm(false);
              }}
            >
              Delete
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}