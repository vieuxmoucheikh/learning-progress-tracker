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
      setCurrentSessionTitle(`Session ${item.progress?.sessions?.length + 1}`);
    }
    onStartTracking(item.id);
    // Update the item with session title and description
    onUpdate(item.id, {
      progress: {
        ...item.progress,
        sessions: [
          ...(item.progress?.sessions || []),
          {
            startTime: new Date().toISOString(),
            date: new Date().toISOString().split('T')[0],
            title: currentSessionTitle,
            description: currentSessionDescription,
            notes: [] as string[],
            endTime: undefined
          }
        ]
      }
    });
    setShowSessionForm(false);
  };

  const handleStopSession = () => {
    onStopTracking(item.id);
    
    // Update the current session with an end time
    const updatedSessions = (item.progress?.sessions || []).map(session => 
      !session.endTime 
        ? { 
            ...session, 
            endTime: new Date().toISOString(), 
            status: 'completed' as const 
          } 
        : session
    );

    onUpdate(item.id, {
      progress: {
        ...item.progress,
        sessions: updatedSessions
      }
    });

    setCurrentSessionTitle('');
    setCurrentSessionDescription('');
    setShowSessionForm(false);
  };

  useEffect(() => {
    setEditedNotes(item.notes || '');
    setEditTitle(item.title);
  }, [item.notes, item.title]);

  // Timer implementation with visibility change handling
  useEffect(() => {
    let startTime = performance.now();
    let animationFrameId: number;
    
    const updateElapsedTime = () => {
      if (item.lastTimestamp) {
        const currentTime = performance.now();
        const elapsed = Math.floor((currentTime - startTime + (item.lastTimestamp - Date.now())) / 1000);
        setElapsedTime(elapsed);
        animationFrameId = requestAnimationFrame(updateElapsedTime);
      } else {
        setElapsedTime(0);
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        cancelAnimationFrame(animationFrameId);
      } else {
        startTime = performance.now() - (elapsedTime * 1000);
        updateElapsedTime();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    updateElapsedTime();

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      cancelAnimationFrame(animationFrameId);
    };
  }, [item.lastTimestamp, elapsedTime]);

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
      // Find the current active session
      const currentSession = item.progress?.sessions?.find(s => !s.endTime);
      if (currentSession) {
        // Update the session with the new note
        onUpdate(item.id, {
          progress: {
            ...item.progress,
            sessions: item.progress.sessions.map(session =>
              session.startTime === currentSession.startTime
                ? {
                    ...session,
                    notes: [...(session.notes || []), newSessionNote]
                  }
                : session
            )
          }
        });
      }
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

  const renderSessionHistory = () => {
    if (!item.progress?.sessions || item.progress.sessions.length === 0) {
      return null;
    }

    return (
      <div className="mt-4 space-y-4">
        <h3 className="font-semibold text-lg">Session History</h3>
        {item.progress.sessions.map((session, index) => {
          const sessionNotes = Array.isArray(session.notes) ? session.notes : [];
          
          return (
            <div key={session.startTime} className="border rounded-lg p-4 space-y-2">
              <div className="flex justify-between items-center">
                <h4 className="font-medium text-base">
                  {session.title || `Session ${index + 1}`}
                </h4>
                <button
                  onClick={() => toggleSessionNotes(session.startTime)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  {showSessionNotes[session.startTime] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>
              
              <div className="text-sm text-gray-600">
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-2" />
                  <span>Start: {new Date(session.startTime).toLocaleString()}</span>
                </div>
                {session.endTime && (
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-2" />
                    <span>End: {new Date(session.endTime).toLocaleString()}</span>
                  </div>
                )}
                <div className="flex items-center">
                  <Clock className="w-4 h-4 mr-2" />
                  <span>Duration: {formatTime(Math.floor((session.endTime ? new Date(session.endTime).getTime() : Date.now()) - new Date(session.startTime).getTime()) / 1000)}</span>
                </div>
              </div>

              {session.description && (
                <div className="text-sm text-gray-600 mt-2">
                  <p className="font-medium">Description:</p>
                  <p>{session.description}</p>
                </div>
              )}

              <div className="mt-3">
                <div className="flex justify-between items-center mb-2">
                  <h5 className="font-medium text-sm">Session Notes</h5>
                  {!showSessionNotes[session.startTime] && sessionNotes.length > 0 && (
                    <span className="text-xs text-gray-500">{sessionNotes.length} note{sessionNotes.length !== 1 ? 's' : ''}</span>
                  )}
                </div>
                
                {showSessionNotes[session.startTime] && (
                  <div className="space-y-2">
                    {sessionNotes.length > 0 ? (
                      sessionNotes.map((note, noteIndex) => (
                        <div key={noteIndex} className="bg-gray-50 p-2 rounded text-sm">
                          {note}
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 italic text-sm">No notes for this session</p>
                    )}
                    
                    {!session.endTime && (
                      <div className="mt-3 flex gap-2">
                        <Input
                          value={newSessionNote}
                          onChange={(e) => setNewSessionNote(e.target.value)}
                          placeholder="Add a note to this session..."
                          className="flex-1"
                        />
                        <Button 
                          onClick={handleAddSessionNote}
                          disabled={!newSessionNote.trim()}
                          size="sm"
                        >
                          Add Note
                        </Button>
                      </div>
                    )}
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
            <Trash2 className="h-4 w-4" />
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
            {item.lastTimestamp ? (
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
        {item.progress?.sessions?.length > 0 && (
          <div className="mt-4">
            <Button
              variant="ghost"
              className="w-full flex justify-between items-center hover:bg-gray-100 text-gray-700"
              onClick={() => setShowSessionDetails(!showSessionDetails)}
            >
              <span className="flex items-center">
                <BookOpen className="w-4 h-4 mr-2" />
                Session History ({item.progress?.sessions?.length})
              </span>
              {showSessionDetails ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </Button>
            
            {showSessionDetails && (
              <div className="mt-2 space-y-3">
                {/* Current Session */}
                {item.lastTimestamp && (
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-blue-900">
                          Current Session
                          <span className="ml-2 text-sm text-blue-600">
                            (In Progress)
                          </span>
                        </h4>
                        <div className="text-sm text-blue-700 space-x-2 mt-1">
                          <Calendar className="w-4 h-4 inline-block mr-1" />
                          <span>{new Date().toLocaleDateString()}</span>
                          <span>•</span>
                          <Clock className="w-4 h-4 inline-block mx-1" />
                          <span>
                            {new Date(item.lastTimestamp).toLocaleTimeString()} - Now
                          </span>
                          <span>•</span>
                          <span className="font-medium">{formatTime(elapsedTime)}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Current Session Notes */}
                    {(() => {
                      const lastSession = item.progress?.sessions?.[item.progress?.sessions?.length - 1];
                      return lastSession && (
                        <div className="mt-3 space-y-2">
                          <h5 className="text-sm font-medium text-blue-800 flex items-center">
                            <MessageSquare className="w-4 h-4 mr-1" />
                            Session Details
                          </h5>
                          <div className="text-sm bg-white p-3 rounded border border-blue-100">
                            <div className="flex flex-col space-y-2">
                              <div className="flex items-center text-gray-600">
                                <Calendar className="w-4 h-4 mr-2" />
                                <span>Start: {new Date(lastSession.startTime).toLocaleString()}</span>
                              </div>
                              {lastSession.endTime && (
                                <div className="flex items-center text-gray-600">
                                  <Calendar className="w-4 h-4 mr-2" />
                                  <span>End: {new Date(lastSession.endTime).toLocaleString()}</span>
                                </div>
                              )}
                              <div className="flex items-center text-gray-600">
                                <Clock className="w-4 h-4 mr-2" />
                                <span>Duration: {formatTime(Math.floor((lastSession.endTime ? new Date(lastSession.endTime).getTime() : Date.now()) - new Date(lastSession.startTime).getTime()) / 1000)}</span>
                              </div>
                            </div>
                            {lastSession.notes && lastSession.notes.length > 0 && (
                              <div className="mt-3">
                                <h6 className="font-medium mb-2">Notes:</h6>
                                {lastSession.notes.map((note, noteIndex) => (
                                  <div key={noteIndex} className="pl-2 border-l-2 border-blue-200 mb-2">
                                    {note}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Past Sessions */}
                {item.progress?.sessions
                  .slice(0, -1)
                  .reverse()
                  .map((session, index) => (
                  <div
                    key={index}
                    className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">
                          {session.title || `Session ${item.progress.sessions?.length - index - 1}`}
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
                              <span className="font-medium">{formatDuration(getTotalMinutes(session.duration))}</span>
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
                          Session Notes ({session.notes.length})
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

      {showSessionForm ? (
        <div className="mt-4 space-y-4">
          <Input
            value={currentSessionTitle}
            onChange={(e) => setCurrentSessionTitle(e.target.value)}
            placeholder="Session Title (optional)"
          />
          <Textarea
            value={currentSessionDescription}
            onChange={(e) => setCurrentSessionDescription(e.target.value)}
            placeholder="Session Description (optional)"
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowSessionForm(false)}>
              Cancel
            </Button>
            <Button onClick={handleStartSession}>
              Start Session
            </Button>
          </div>
        </div>
      ) : (
        !item.progress?.sessions?.find(s => !s.endTime) && (
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
      
      {renderSessionHistory()}
    </Card>
  );
}