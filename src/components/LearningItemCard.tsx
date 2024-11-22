import { useState } from 'react';
import { LearningItem } from '../types';
import { Play, Pause, ExternalLink, Trash2, Clock, CheckCircle, Edit2, AlertCircle, Target, Archive } from 'lucide-react';

interface Props {
  item: LearningItem;
  onDelete: (id: string) => void;
  onUpdate: (updates: Partial<LearningItem>) => void;
  onStartTracking: (id: string) => void;
  onStopTracking: (id: string) => void;
}

export function LearningItemCard({ item, onDelete, onUpdate, onStartTracking, onStopTracking }: Props) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [showSessionNotes, setShowSessionNotes] = useState(false);
  const [note, setNote] = useState('');

  const handleStartTracking = () => {
    onStartTracking(item.id);
    setShowNotes(true);
  };

  const handleStopTracking = () => {
    onStopTracking(item.id);
    if (note.trim()) {
      const updatedSessions = [
        ...(item.progress.sessions || []),
        {
          date: new Date().toISOString(),
          duration: {
            hours: item.progress.current.hours,
            minutes: item.progress.current.minutes
          },
          notes: note.trim()
        }
      ];
      onUpdate({
        progress: {
          ...item.progress,
          sessions: updatedSessions
        }
      });
      setNote('');
    }
    setShowNotes(false);
  };

  const handleSaveNote = () => {
    if (note.trim()) {
      const updatedSessions = [
        ...(item.progress.sessions || []),
        {
          date: new Date().toISOString(),
          duration: { hours: 0, minutes: 0 },
          notes: note.trim()
        }
      ];
      onUpdate({
        progress: {
          ...item.progress,
          sessions: updatedSessions
        }
      });
      setNote('');
      setShowNotes(false);
    }
  };

  const handleComplete = () => {
    if (!item.completed) {
      onUpdate({
        completed: true,
        completedAt: item.date,
        status: 'completed'
      });
    } else {
      onUpdate({
        completed: false,
        completedAt: null,
        status: 'in_progress'
      });
    }
  };

  const handleArchive = () => {
    onUpdate({
      status: 'archived',
      completed: true,
      completedAt: new Date().toISOString()
    });
  };

  const calculateProgress = () => {
    if (!item.progress.total) return 0;
    const currentMinutes = item.progress.current.hours * 60 + item.progress.current.minutes;
    const totalMinutes = item.progress.total.hours * 60 + item.progress.total.minutes;
    return Math.min((currentMinutes / totalMinutes) * 100, 100);
  };

  const getDifficultyColor = () => {
    switch (item.difficulty) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = () => {
    switch (item.status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'on_hold': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getProgressColor = () => {
    const progress = calculateProgress();
    if (progress >= 100) return 'bg-gradient-to-r from-green-500 to-green-600';
    if (progress >= 75) return 'bg-gradient-to-r from-blue-500 to-blue-600';
    if (progress >= 50) return 'bg-gradient-to-r from-yellow-500 to-yellow-600';
    return 'bg-gradient-to-r from-gray-500 to-gray-600';
  };

  const formatTime = (hours: number, minutes: number) => {
    if (hours === 0) return `${minutes}m`;
    return `${hours}h ${minutes}m`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isTracking = item.lastTimestamp !== undefined;

  return (
    <div 
      className={`bg-white rounded-xl shadow-sm border-2 p-5 transition-all duration-200 hover:shadow-md
        ${item.completed ? 'border-green-200 bg-green-50/30' : 'border-gray-200'}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-xl font-bold text-gray-800">{item.title}</h3>
            {item.url && (
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:text-blue-600 transition-colors"
              >
                <ExternalLink size={18} />
              </a>
            )}
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            <span className={`px-3 py-1.5 rounded-full text-sm font-semibold ${getDifficultyColor()}`}>
              {item.difficulty}
            </span>
            <span className={`px-3 py-1.5 rounded-full text-sm font-semibold ${getStatusColor()}`}>
              {item.status.replace('_', ' ')}
            </span>
            {item.category && (
              <span className="px-3 py-1.5 bg-purple-100 text-purple-800 rounded-full text-sm font-semibold">
                {item.category}
              </span>
            )}
          </div>

          {item.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {item.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Progress bar */}
          {item.progress.total && (
            <div className="mt-4">
              <div className="flex justify-between text-sm font-medium mb-2">
                <span className="flex items-center gap-2 text-gray-700">
                  <Clock className="w-4 h-4 text-blue-500" />
                  <span className="font-semibold">
                    {formatTime(item.progress.current.hours, item.progress.current.minutes)}
                    {item.lastTimestamp && (
                      <span className="text-green-600 animate-pulse ml-2">(Active)</span>
                    )}
                  </span>
                </span>
                <span className="flex items-center gap-2 text-gray-700">
                  <Target className="w-4 h-4 text-purple-500" />
                  <span className="font-semibold">
                    {formatTime(item.progress.total.hours, item.progress.total.minutes)}
                  </span>
                </span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${getProgressColor()}`}
                  style={{ width: `${calculateProgress()}%` }}
                />
              </div>
            </div>
          )}

          {/* Notes Section */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <button
                onClick={() => setShowSessionNotes(!showSessionNotes)}
                className="text-gray-600 hover:text-gray-800 text-sm font-medium flex items-center gap-2"
              >
                <Edit2 size={16} />
                {item.progress.sessions?.filter(s => s.notes).length || 0} Session Notes
              </button>
              {!item.completed && (
                <button
                  onClick={() => setShowNotes(!showNotes)}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  {showNotes ? 'Cancel' : 'Add Note'}
                </button>
              )}
            </div>

            {/* Note Input */}
            {showNotes && (
              <div className="space-y-2">
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Write your notes here..."
                  className="w-full p-3 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows={3}
                />
                {!item.lastTimestamp && (
                  <button
                    onClick={handleSaveNote}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                  >
                    Save Note
                  </button>
                )}
              </div>
            )}

            {/* Session Notes Display */}
            {showSessionNotes && item.progress.sessions?.some(s => s.notes) && (
              <div className="mt-2 space-y-3">
                {item.progress.sessions
                  .filter(session => session.notes)
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map((session, index) => (
                    <div key={index} className="bg-gray-50 p-3 rounded-lg">
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-xs text-gray-500">{formatDate(session.date)}</span>
                        {session.duration.hours > 0 || session.duration.minutes > 0 ? (
                          <span className="text-xs font-medium text-blue-600">
                            {session.duration.hours}h {session.duration.minutes}m
                          </span>
                        ) : null}
                      </div>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{session.notes}</p>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Notes */}
          {item.notes && (
            <div className="mt-4 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
              <strong className="text-gray-700">Notes:</strong> {item.notes}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3">
          {!item.completed && (
            <>
              {item.lastTimestamp ? (
                <button
                  onClick={handleStopTracking}
                  className="p-2.5 text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 hover:shadow-sm"
                  title="Stop tracking"
                >
                  <Pause size={22} />
                </button>
              ) : (
                <button
                  onClick={handleStartTracking}
                  className="p-2.5 text-green-600 hover:bg-green-50 rounded-lg transition-all duration-200 hover:shadow-sm"
                  title="Start tracking"
                >
                  <Play size={22} />
                </button>
              )}
            </>
          )}

          <button
            onClick={handleComplete}
            className={`p-2.5 rounded-lg transition-all duration-200 hover:shadow-sm ${
              item.completed
                ? 'text-gray-600 hover:bg-gray-50'
                : 'text-green-600 hover:bg-green-50'
            }`}
            title={item.completed ? 'Mark as incomplete' : 'Mark as complete'}
          >
            <CheckCircle size={22} />
          </button>

          {item.completed && (
            <button
              onClick={handleArchive}
              className="p-2.5 text-purple-600 hover:bg-purple-50 rounded-lg transition-all duration-200 hover:shadow-sm"
              title="Archive task"
            >
              <Archive size={22} />
            </button>
          )}

          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="p-2.5 text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 hover:shadow-sm"
            title="Delete"
          >
            <Trash2 size={22} />
          </button>
        </div>
      </div>

      {/* Delete confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-xl max-w-sm mx-4 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="w-6 h-6 text-red-500" />
              <h3 className="text-xl font-bold text-gray-800">Delete Item</h3>
            </div>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this item? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onDelete(item.id);
                  setShowDeleteConfirm(false);
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}