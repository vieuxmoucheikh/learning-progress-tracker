import { useState, useEffect } from 'react';
import { LearningItem } from '../types';
import { Play, Pause, ExternalLink, Trash2, Clock, CheckCircle, Edit2, AlertCircle, Target, Archive } from 'lucide-react';

interface Props {
  item: LearningItem;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<LearningItem>) => void;
  onStartTracking: (id: string) => void;
  onStopTracking: (id: string) => void;
}

export function LearningItemCard({ item, onDelete, onUpdate, onStartTracking, onStopTracking }: Props) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [note, setNote] = useState('');
  const [elapsedTime, setElapsedTime] = useState({ hours: 0, minutes: 0 });

  // Calculate elapsed time for active session
  useEffect(() => {
    let intervalId: number | null = null;
    
    if (item.progress.sessions.length > 0) {
      const lastSession = item.progress.sessions[item.progress.sessions.length - 1];
      if (lastSession.startTime && !lastSession.endTime) {
        const startTime = new Date(lastSession.startTime);
        
        intervalId = window.setInterval(() => {
          const now = new Date();
          const elapsedMinutes = Math.floor((now.getTime() - startTime.getTime()) / 60000);
          setElapsedTime({
            hours: Math.floor(elapsedMinutes / 60),
            minutes: elapsedMinutes % 60
          });

          // Check if we've reached the total time
          const currentMinutes = (item.progress.current.hours * 60) + item.progress.current.minutes + elapsedMinutes;
          const totalMinutes = (item.progress.total.hours * 60) + item.progress.total.minutes;
          
          if (currentMinutes >= totalMinutes && !item.completed) {
            handleStopTracking();
          }
        }, 1000);
      } else {
        setElapsedTime({ hours: 0, minutes: 0 });
      }
    }

    return () => {
      if (intervalId !== null) {
        clearInterval(intervalId);
      }
    };
  }, [item.progress.sessions, item.progress.current, item.progress.total, item.completed]);

  const formatTime = (time: number | { hours: number; minutes: number }) => {
    const totalMinutes = typeof time === 'number' 
      ? time 
      : time.hours * 60 + time.minutes;
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return `${hours}h ${mins}m`;
  };

  const getTimeInMinutes = (time: { hours: number; minutes: number }) => {
    return time.hours * 60 + time.minutes;
  };

  const isTracking = item.progress.sessions.length > 0 && 
    !item.progress.sessions[item.progress.sessions.length - 1].endTime;

  const handleStartTracking = () => {
    if (isTracking) return;
    
    const startTime = new Date();
    // First update the sessions
    onUpdate(item.id, {
      progress: {
        ...item.progress,
        lastAccessed: startTime.toISOString(),
        sessions: [
          ...item.progress.sessions,
          {
            startTime: startTime.toISOString(),
            date: startTime.toISOString().split('T')[0]
          }
        ]
      }
    });
    
    // Then start tracking
    onStartTracking(item.id);
    setElapsedTime({ hours: 0, minutes: 0 });
    setShowNotes(true);
  };

  const handleStopTracking = () => {
    if (!isTracking) return;
    
    // First stop tracking to update the UI immediately
    onStopTracking(item.id);
    
    // Then update notes if any
    if (note.trim()) {
      const lastSession = item.progress.sessions[item.progress.sessions.length - 1];
      if (lastSession) {
        const updatedSession = {
          ...lastSession,
          notes: note.trim()
        };
        
        onUpdate(item.id, {
          progress: {
            ...item.progress,
            sessions: [
              ...item.progress.sessions.slice(0, -1),
              updatedSession
            ]
          }
        });
      }
    }
    
    setNote('');
    setShowNotes(false);
  };

  const calculateProgress = () => {
    const currentMinutes = (item.progress.current.hours * 60) + item.progress.current.minutes;
    const totalMinutes = (item.progress.total.hours * 60) + item.progress.total.minutes;
    const elapsedMinutes = isTracking ? (elapsedTime.hours * 60) + elapsedTime.minutes : 0;
    
    const progress = ((currentMinutes + elapsedMinutes) / totalMinutes) * 100;
    return Math.min(Math.max(progress, 0), 100);
  };

  const progress = calculateProgress();

  return (
    <div className={`bg-white rounded-lg shadow-md p-4 relative ${item.status === 'archived' ? 'opacity-75' : ''}`}>
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold mb-1">{item.title}</h3>
            {item.completed && (
              <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                Completed
              </span>
            )}
            {item.status === 'archived' && (
              <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded-full">
                Archived
              </span>
            )}
          </div>
          <div className="flex items-center text-sm text-gray-600 gap-2 mb-2">
            <Clock className="w-4 h-4" />
            <span>
              {formatTime(item.progress.current)} / {formatTime(item.progress.total)}
              {isTracking && ` (+${formatTime(elapsedTime)})`}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {item.url && (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:text-blue-600"
            >
              <ExternalLink className="w-5 h-5" />
            </a>
          )}
          
          {!item.completed && !item.status?.includes('archived') && (
            <button
              onClick={isTracking ? handleStopTracking : handleStartTracking}
              className={`p-1.5 rounded-full ${
                isTracking 
                  ? 'bg-red-100 text-red-600 hover:bg-red-200' 
                  : 'bg-green-100 text-green-600 hover:bg-green-200'
              }`}
            >
              {isTracking ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
          )}

          {!item.status?.includes('archived') && (
            <button
              onClick={() => onUpdate(item.id, { status: 'archived' })}
              className="p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              title="Archive"
            >
              <Archive className="w-4 h-4" />
            </button>
          )}
          
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="p-1.5 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-100 rounded-full h-2 mb-4">
        <div
          className={`h-2 rounded-full transition-all duration-300 ${
            item.completed ? 'bg-green-500' : isTracking ? 'bg-blue-500' : 'bg-blue-400'
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Notes Input */}
      {showNotes && (
        <div className="mt-2">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add session notes..."
            className="w-full p-2 border rounded-md text-sm"
            rows={2}
          />
        </div>
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="absolute inset-0 bg-white bg-opacity-90 rounded-lg flex items-center justify-center">
          <div className="text-center">
            <p className="mb-2">Delete this item?</p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => onDelete(item.id)}
                className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Delete
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}