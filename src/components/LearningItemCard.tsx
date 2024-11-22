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
  const [elapsedTime, setElapsedTime] = useState(0);

  // Calculate elapsed time for active session
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (item.progress.sessions.length > 0) {
      const lastSession = item.progress.sessions[item.progress.sessions.length - 1];
      if (lastSession.startTime && !lastSession.endTime) {
        interval = setInterval(() => {
          const startTime = new Date(lastSession.startTime).getTime();
          const currentTime = new Date().getTime();
          const elapsed = Math.floor((currentTime - startTime) / 60000); // Convert to minutes
          setElapsedTime(elapsed);
        }, 1000);
      }
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [item.progress.sessions]);

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
    onStartTracking(item.id);
    setShowNotes(true);
  };

  const handleStopTracking = () => {
    onStopTracking(item.id);
    if (note.trim()) {
      const lastSession = item.progress.sessions[item.progress.sessions.length - 1];
      if (lastSession) {
        const updatedSession = {
          ...lastSession,
          notes: note.trim()
        };
        
        const updatedSessions = [...item.progress.sessions];
        updatedSessions[updatedSessions.length - 1] = updatedSession;
        
        onUpdate(item.id, {
          progress: {
            ...item.progress,
            sessions: updatedSessions
          }
        });
      }
      setNote('');
    }
    setShowNotes(false);
    setElapsedTime(0);
  };

  const progress = Math.min(
    Math.round((getTimeInMinutes(item.progress.current) / getTimeInMinutes(item.progress.total)) * 100),
    100
  );

  return (
    <div className="bg-white rounded-lg shadow-md p-4 relative">
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1">
          <h3 className="text-lg font-semibold mb-1">{item.title}</h3>
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
          
          {!item.completed && (
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
          
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="p-1.5 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
        <div
          className={`h-2 rounded-full ${
            item.completed ? 'bg-green-500' : 'bg-blue-500'
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