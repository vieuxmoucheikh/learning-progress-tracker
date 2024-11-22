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

  // Delete Confirmation Dialog Component
  const DeleteConfirmDialog = ({ 
    isOpen, 
    onClose, 
    onConfirm 
  }: { 
    isOpen: boolean; 
    onClose: () => void; 
    onConfirm: () => void; 
  }) => {
    if (!isOpen) return null;
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Learning Item</h3>
          <p className="text-gray-600 mb-6">
            Are you sure you want to delete this item? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="hover:bg-gray-100"
            >
              Cancel
            </Button>
            <Button
              onClick={onConfirm}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </Button>
          </div>
        </div>
      </div>
    );
  };

  // Session Summary Component
  const SessionSummary = ({ sessions }: { sessions: Session[] }) => {
    const totalTime = sessions.reduce((acc, session) => {
      if (!session.duration) return acc;
      return acc + (session.duration.hours * 60 + session.duration.minutes);
    }, 0);
    
    const totalHours = Math.floor(totalTime / 60);
    const totalMinutes = totalTime % 60;
    
    const completedSessions = sessions.filter(session => session.duration).length;
    
    return (
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-lg mb-4 border border-blue-100">
        <h4 className="text-sm font-semibold text-blue-800 mb-2">Session Summary</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-medium text-blue-600">Total Time</p>
            <p className="font-semibold text-blue-900">{totalHours}h {totalMinutes}m</p>
          </div>
          <div>
            <p className="text-xs font-medium text-blue-600">Completed Sessions</p>
            <p className="font-semibold text-blue-900">{completedSessions} / {sessions.length}</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card className={`overflow-hidden transition-all duration-200 ${
      item.completed ? 'bg-green-50/50' : 
      'hover:shadow-md bg-white'
    }`}>
      <div className="p-6">
        {/* Header with title and type */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className={`text-lg font-semibold ${
                item.completed ? 'text-green-800' : 
                'text-gray-900'
              }`}>
                {item.title}
              </h3>
              {item.url && (
                <a 
                  href={item.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-700"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm flex-wrap">
              <span className={`px-2 py-1 rounded-full ${
                item.type === 'video' ? 'bg-purple-100 text-purple-700' :
                item.type === 'book' ? 'bg-amber-100 text-amber-700' :
                item.type === 'course' ? 'bg-blue-100 text-blue-700' :
                item.type === 'article' ? 'bg-emerald-100 text-emerald-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {item.type}
              </span>
              {item.category && (
                <span className="px-2 py-1 rounded-full bg-indigo-100 text-indigo-700 flex items-center gap-1">
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    className="w-3 h-3"
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                  >
                    <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
                  </svg>
                  {item.category}
                </span>
              )}
              <span className={`px-2 py-1 rounded-full ${
                item.priority === 'high' ? 'bg-red-100 text-red-700' :
                item.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                'bg-green-100 text-green-700'
              }`}>
                {item.priority}
              </span>
              <span className={`px-2 py-1 rounded-full ${
                item.status === 'completed' ? 'bg-green-100 text-green-700' :
                item.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                item.status === 'on_hold' ? 'bg-yellow-100 text-yellow-700' :
                'bg-red-100 text-red-700'
              }`}>
                {item.status.replace('_', ' ')}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDeleteConfirm(true)}
              className="text-gray-500 hover:text-red-600 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Delete Confirmation Dialog */}
        <DeleteConfirmDialog
          isOpen={showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(false)}
          onConfirm={() => {
            onDelete(item.id);
            setShowDeleteConfirm(false);
          }}
        />

        {/* Progress section */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">Progress</span>
            <span className="text-sm text-gray-600">
              {formatTime((item.progress?.current?.hours ?? 0) * 60 + (item.progress?.current?.minutes ?? 0))} / 
              {formatTime((item.progress?.total?.hours ?? 0) * 60 + (item.progress?.total?.minutes ?? 0))}
            </span>
          </div>
          <Progress 
            value={calculateProgress(item.progress)} 
            className={`h-2 ${
              item.completed ? 'bg-green-200' : 
              'bg-gray-200'
            }`}
          />
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
        <div className="flex flex-col gap-3 mb-6">
          {/* Primary Actions */}
          <div className="flex items-center gap-2">
            {!item.completed && (
              <Button
                onClick={item.lastTimestamp ? handleStopTracking : handleStartTracking}
                className={`flex-1 transition-all duration-200 ${
                  item.lastTimestamp
                    ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-100'
                    : 'bg-green-500 hover:bg-green-600 text-white shadow-green-100'
                } shadow-lg`}
              >
                <div className="flex items-center justify-center gap-2">
                  {item.lastTimestamp ? (
                    <>
                      <StopCircle className="w-4 h-4" />
                      Stop Session
                    </>
                  ) : (
                    <>
                      <PlayCircle className="w-4 h-4" />
                      Start Session
                    </>
                  )}
                </div>
              </Button>
            )}
            
            <Button
              onClick={handleMarkAsComplete}
              disabled={Boolean(item.lastTimestamp)}
              className={`flex-1 transition-all duration-200 ${
                item.completed
                  ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-orange-100'
                  : 'bg-blue-500 hover:bg-blue-600 text-white shadow-blue-100'
              } shadow-lg`}
            >
              <div className="flex items-center justify-center gap-2">
                {item.completed ? (
                  <>
                    <AlertCircle className="w-4 h-4" />
                    Mark Incomplete
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Mark Complete
                  </>
                )}
              </div>
            </Button>
          </div>

          {/* Secondary Actions */}
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setShowSessionDetails(!showSessionDetails)}
              variant="outline"
              className={`flex-1 border-2 transition-all duration-200 ${
                showSessionDetails
                  ? 'border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100'
                  : 'border-gray-200 hover:border-purple-200 hover:bg-purple-50 hover:text-purple-700'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Clock className="w-4 h-4" />
                {showSessionDetails ? 'Hide History' : 'Show History'}
              </div>
            </Button>
          </div>
        </div>

        {/* Session details section with improved styling */}
        {showSessionDetails && (
          <div className="space-y-4 bg-gradient-to-br from-purple-50 to-indigo-50 p-4 rounded-lg border border-purple-100">
            <SessionSummary sessions={item.progress.sessions} />
            <div className="space-y-4">
              {item.progress.sessions.map((session, index) => (
                <div 
                  key={index} 
                  className="bg-white rounded-lg shadow-sm p-4 border border-purple-100 hover:shadow-md transition-shadow duration-200"
                >
                  {/* Session header */}
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm font-medium text-purple-700">
                      Session #{item.progress.sessions.length - index}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(session.date).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Session time */}
                  {session.duration && (
                    <div className="flex items-center gap-2 text-sm mb-3">
                      <Clock className="w-4 h-4 text-green-600" />
                      <span className="font-medium text-green-700">
                        Duration: {session.duration.hours}h {session.duration.minutes}m
                      </span>
                    </div>
                  )}

                  {/* Session notes with improved styling */}
                  {(session.notes?.length ?? 0) > 0 && (
                    <div className="mt-3 pt-3 border-t border-purple-100">
                      <p className="text-sm font-medium text-purple-700 mb-2 flex items-center gap-2">
                        <Edit2 className="w-4 h-4" />
                        Session Notes
                      </p>
                      <ul className="space-y-2">
                        {session.notes?.map((note, noteIndex) => (
                          <li 
                            key={noteIndex}
                            className="text-sm text-gray-600 bg-purple-50/50 p-3 rounded-lg border border-purple-100"
                          >
                            <div className="flex items-start justify-between">
                              <span>{note}</span>
                              <span className="text-xs text-purple-400 ml-2">
                                {new Date(session.startTime).toLocaleTimeString()}
                              </span>
                            </div>
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
      </div>
    </Card>
  );
}