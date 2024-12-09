import GoalManager from './GoalManager';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import Progress from '@/components/ui/progress';
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import Label from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  startPomodoro, 
  completePomodoro,
  getPomodoroSettings,
  getPomodoroStats,
  updatePomodoroSettings
} from '@/lib/database';
import { PomodoroSettings, PomodoroStats } from '@/types';
import { PomodoroSettingsDialog } from './PomodoroSettingsDialog';
import { PomodoroStats as PomodoroStatsComponent } from './PomodoroStats';
import { PlayIcon, PauseIcon, SkipForwardIcon, Settings2Icon, Brain, Target, Trophy } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { X } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

interface Task {
  id: string;
  text: string;
  completed: boolean;
  progress: number;
}

interface PomodoroTimerProps {
  onSessionComplete?: (sessionData: { duration: number; label: string; type: 'work' | 'break' }) => void;
  sessionId?: string;
}

interface PomodoroState {
  last_update: string;
  time: number;
  is_active: boolean;
  is_break: boolean;
  current_pomodoro_id: string;
}

export function PomodoroTimer({  }: PomodoroTimerProps) {
  let lastTimestamp = 0; // Initialize lastTimestamp to store the last recorded timestamp
  const [time, setTime] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [settings, setSettings] = useState<PomodoroSettings | null>(null);
  const [stats, setStats] = useState<PomodoroStats | null>(null);
  const [currentPomodoroId, setCurrentPomodoroId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [focusLabel, setFocusLabel] = useState<string>('');
  const [dailyGoal, setDailyGoal] = useState<number>(8);
  const [tasks, setTasks] = useState<Array<{ 
    id: string; 
    text: string; 
    completed: boolean;
    progress: number; 
  }>>([]);
  const [showCompletedTasks, setShowCompletedTasks] = useState(false);
  const [currentTask, setCurrentTask] = useState<string>('');
  const timerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  // Add streak tracking
  const [streak, setStreak] = useState(0);
  
  useEffect(() => {
    const lastActive = localStorage.getItem('lastActiveDate');
    const today = new Date().toDateString();
    
    if (lastActive === today) {
      const savedStreak = parseInt(localStorage.getItem('pomodoroStreak') || '0');
      setStreak(savedStreak);
    } else if (lastActive === new Date(Date.now() - 86400000).toDateString()) {
      // If last active yesterday, continue streak
      const savedStreak = parseInt(localStorage.getItem('pomodoroStreak') || '0');
      setStreak(savedStreak);
    } else {
      // Reset streak if more than a day has passed
      setStreak(0);
    }
  }, []);

  // Update streak when completing a pomodoro
  const updateStreak = useCallback(() => {
    if (!isBreak) {
      const today = new Date().toDateString();
      localStorage.setItem('lastActiveDate', today);
      const newStreak = streak + 1;
      setStreak(newStreak);
      localStorage.setItem('pomodoroStreak', newStreak.toString());
    }
  }, [isBreak, streak]);

  // Keep audio context reference
  const audioContextRef = useRef<AudioContext | null>(null);

  // Initialize audio context
  useEffect(() => {
    // Create audio context only when needed
    const initAudioContext = () => {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }
    };

    // Handle user interaction to initialize audio
    const handleInteraction = () => {
      initAudioContext();
      document.removeEventListener('click', handleInteraction);
    };

    document.addEventListener('click', handleInteraction);
    
    return () => {
      document.removeEventListener('click', handleInteraction);
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Synchronize timer state with server
  const syncWithSupabase = useCallback(async () => {
    try {
      // Try to sync any failed completions first
      const failedCompletions = JSON.parse(localStorage.getItem('failedPomodoroCompletions') || '[]');
      if (failedCompletions.length > 0) {
        for (const session of failedCompletions) {
          try {
            await completePomodoro(session.pomodoroId);
          } catch (error) {
            console.error('Error syncing failed completion:', error);
            // Stop trying to sync if we still have connection issues
            return;
          }
        }
        // Clear failed completions after successful sync
        localStorage.removeItem('failedPomodoroCompletions');
        // Refresh stats after syncing
        const newStats = await getPomodoroStats();
        setStats(newStats);
      }
      
      if (!isActive) return;

      const response = await fetch('/api/pomodoro/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          time,
          isActive,
          isBreak,
          currentPomodoroId,
          lastUpdate: Date.now(),
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // If server has newer state, update local state
      if (!data.sync && data.state) {
        setTime(data.state.time);
        setIsActive(data.state.isActive);
        setIsBreak(data.state.isBreak);
        setCurrentPomodoroId(data.state.currentPomodoroId);
      }
    } catch (error) {
      console.error('Error syncing with server:', error);
    }
  }, [time, isActive, isBreak, currentPomodoroId]);

  // Play notification sound
  const playNotificationSound = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
    const oscillator = audioContextRef.current.createOscillator();
    const gainNode = audioContextRef.current.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContextRef.current.destination);
    oscillator.frequency.setValueAtTime(440, audioContextRef.current.currentTime);
    gainNode.gain.setValueAtTime(0.1, audioContextRef.current.currentTime);
    oscillator.start();
    oscillator.stop(audioContextRef.current.currentTime + 0.5);

    // Show notification if permission is granted
    if (Notification.permission === 'granted') {
      new Notification('Pomodoro Timer', {
        body: isBreak ? 'Break time is over!' : 'Time to take a break!',
        icon: '/favicon.ico'
      });
    }
  }, [isBreak]);

  // Timer logic with Web Worker
  useEffect(() => {
    const worker = new Worker(new URL('./timerWorker.js', import.meta.url));
    worker.onmessage = (e) => {
      if (e.data.type === 'tick') {
        setTime(prevTime => {
          const newTime = Math.max(0, prevTime - 1);
          if (newTime === 0) {
            handleTimerComplete();
          }
          return newTime;
        });
      }
    };

    if (isActive) {
      worker.postMessage({ command: 'start' });
    } else {
      worker.postMessage({ command: 'stop' });
    }

    return () => {
      worker.terminate();
    };
  }, [isActive]);

  // Handle visibility change
  const handleVisibilityChange = useCallback(() => {
    if (document.visibilityState === 'hidden') {
      lastTimestamp = Date.now();
      localStorage.setItem('pomodoroLastTimestamp', lastTimestamp.toString());
      
      // Save current timer state
      localStorage.setItem('pomodoroTimerState', JSON.stringify({
        time,
        isActive,
        isBreak,
        currentPomodoroId
      }));
    } else {
      try {
        // Restore timer state
        const savedState = localStorage.getItem('pomodoroTimerState');
        if (savedState) {
          const parsedState = JSON.parse(savedState);
          const storedTimestamp = parseInt(localStorage.getItem('pomodoroLastTimestamp') || lastTimestamp.toString());
          const elapsedSeconds = Math.floor((Date.now() - storedTimestamp) / 1000);

          if (parsedState.isActive && elapsedSeconds > 0) {
            const adjustedTime = Math.max(0, parsedState.time - elapsedSeconds);
            setTime(adjustedTime);
            
            // If timer would have completed while in background, handle completion
            if (adjustedTime === 0) {
              handleTimerComplete();
            }
          }
        }
      } catch (error) {
        console.error('Error handling visibility change:', error);
        // Continue with normal operation even if state restoration fails
      }
    }
  }, [time, isActive, isBreak, currentPomodoroId]);

  // Persist timer state to localStorage
  useEffect(() => {
    const timerState = {
      time,
      isActive,
      isBreak,
      currentPomodoroId,
      lastUpdate: new Date().toISOString()
    };
    localStorage.setItem('pomodoroState', JSON.stringify(timerState));
  }, [time, isActive, isBreak, currentPomodoroId]);

  // Load persisted state on mount
  useEffect(() => {
    const savedState = localStorage.getItem('pomodoroState');
    if (savedState) {
      const parsedState = JSON.parse(savedState);
      const elapsedSeconds = Math.floor((Date.now() - new Date(parsedState.lastUpdate).getTime()) / 1000);
      
      if (parsedState.isActive) {
        setTime(Math.max(0, parsedState.time - elapsedSeconds));
      } else {
        setTime(parsedState.time);
      }
      setIsActive(parsedState.isActive);
      setIsBreak(parsedState.isBreak);
      setCurrentPomodoroId(parsedState.currentPomodoroId);
    }
  }, []);

  // Sync periodically
  useEffect(() => {
    const syncInterval = setInterval(syncWithSupabase, 5000);
    return () => clearInterval(syncInterval);
  }, [syncWithSupabase]);

  const handleTimerComplete = async () => {
    console.log('Timer completed, updating stats and resetting timer.');
    if (!settings) return;

    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount < maxRetries) {
      try {
        // Stop the timer first
        setIsActive(false);

        // Complete current pomodoro if it exists
        if (currentPomodoroId) {
          await completePomodoro(currentPomodoroId);
          setCurrentPomodoroId(null);
        }

        // Play notification
        playNotificationSound();

        // Toggle break state
        const newIsBreak = !isBreak;
        setIsBreak(newIsBreak);

        // Calculate new time based on type
        const newTime = newIsBreak
          ? (settings.break_duration * 60)
          : (settings.work_duration * 60);
        setTime(newTime);

        // Refresh stats
        const newStats = await getPomodoroStats();
        setStats(newStats);

        // Show notification
        toast({
          title: newIsBreak ? 'Time for a break! 🎉' : 'Break complete!',
          description: newIsBreak ? 'Great work! Take some time to rest.' : 'Ready to focus again?',
        });

        // Auto-start if enabled
        if ((newIsBreak && settings.auto_start_breaks) || (!newIsBreak && settings.auto_start_pomodoros)) {
          const newPomodoro = await startPomodoro(newIsBreak ? 'break' : 'work');
          setCurrentPomodoroId(newPomodoro.id);
          setIsActive(true);
        }

        // Update streak
        updateStreak();

        // If we reach here, everything succeeded
        break;
      } catch (error) {
        console.error(`Error completing timer (attempt ${retryCount + 1}):`, error);
        retryCount++;
        
        // Save progress locally even if network operations fail
        const sessionData = {
          pomodoroId: currentPomodoroId,
          timestamp: new Date().toISOString(),
          duration: settings.work_duration * 60,
          type: isBreak ? 'break' : 'work'
        };
        
        try {
          // Store failed completion data locally
          const failedCompletions = JSON.parse(localStorage.getItem('failedPomodoroCompletions') || '[]');
          failedCompletions.push(sessionData);
          localStorage.setItem('failedPomodoroCompletions', JSON.stringify(failedCompletions));
          
          // Show more helpful error message
          toast({
            title: 'Session saved locally',
            description: 'Your progress has been saved and will sync when connection is restored.',
            variant: 'default'
          });
          
          // Continue with timer state updates even if network operations failed
          setIsActive(false);
          setIsBreak(!isBreak);
          setTime((!isBreak ? settings.break_duration : settings.work_duration) * 60);
          return;
        } catch (localError) {
          console.error('Error saving progress locally:', localError);
        }
        
        // Only show error toast on final retry
        if (retryCount === maxRetries) {
          toast({
            title: 'Connection Error',
            description: 'Unable to save your progress. Please check your connection.',
            variant: 'destructive'
          });
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
      }
    }
  };

  const startNewPomodoro = async (type: 'work' | 'break' = 'work') => {
    try {
      const pomodoro = await startPomodoro(type);
      setCurrentPomodoroId(pomodoro.id);
      setIsActive(true);
    } catch (error) {
      console.error('Error starting Pomodoro:', error);
      toast({
        title: 'Error',
        description: 'Failed to start Pomodoro session',
        variant: 'destructive',
      });
    }
  };

  const toggleTimer = async () => {
    if (!isActive) {
      await startNewPomodoro(isBreak ? 'break' : 'work');
    } else {
      setIsActive(false);
    }
  };

  const skipCurrentInterval = () => {
    setTime(0); // Set to 0 instead of just decrementing
    handleTimerComplete();
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleButtonClick = useCallback(async (action: 'start' | 'pause' | 'skip') => {
    switch (action) {
      case 'start':
        if (!isActive) {
          await startNewPomodoro(isBreak ? 'break' : 'work');
        }
        break;
      case 'pause':
        setIsActive(false);
        break;
      case 'skip':
        skipCurrentInterval();
        break;
    }
  }, [isActive, isBreak]);

  const calculateProgress = useCallback(() => {
    if (!settings) return 0;
    const totalTime = isBreak ? settings.break_duration * 60 : settings.work_duration * 60;
    return ((totalTime - time) / totalTime) * 100;
  }, [time, isBreak, settings]);

  const getBreakSuggestion = useCallback(() => {
    if (!stats || !settings) return null;
    
    const completedToday = stats.completedPomodoros;
    if (completedToday >= 4) {
      return "Consider taking a longer break to maintain productivity";
    } else if (completedToday === 2) {
      return "Quick stretching exercises can help maintain focus";
    }
    return "Stay hydrated during your break";
  }, [stats]);

  const addTask = (text: string) => {
    setTasks(prev => [...prev, { 
      id: crypto.randomUUID(), 
      text, 
      completed: false,
      progress: 0
    }]);
  };

  const toggleTask = (id: string) => {
    setTasks(prev => prev.map(task => 
      task.id === id ? { ...task, completed: !task.completed } : task
    ));
  };

  const removeTask = (id: string) => {
    setTasks(prev => prev.filter(task => task.id !== id));
  };

  useEffect(() => {
    const savedTasks = localStorage.getItem('pomodoroTasks');
    if (savedTasks) {
      setTasks(JSON.parse(savedTasks));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('pomodoroTasks', JSON.stringify(tasks));
  }, [tasks]);

  // Update this useEffect to check for task completion when stats change
  useEffect(() => {
    if (stats && settings) {
      const dailyGoal = settings.daily_goal || 4; // Default to 4 if not set
      const completedCount = stats.daily_completed;
      
      if (completedCount >= dailyGoal) {
        // Mark all tasks as complete when daily goal is reached
        setTasks(prev => prev.map(task => ({
          ...task,
          completed: true,
          progress: 100
        })));
      } else {
        // Update progress for all tasks
        const progressPercentage = (completedCount / dailyGoal) * 100;
        setTasks(prev => prev.map(task => ({
          ...task,
          progress: progressPercentage,
          completed: false // Reset completion if goal is no longer met
        })));
      }
    }
  }, [stats, settings]);

  return (
    <Card className="p-6 max-w-md mx-auto">
      <div className="pomodoro-timer space-y-6 p-6">
        <GoalManager />
        {stats && (
          <div className="flex justify-between items-center">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-2"
            >
              <Badge variant={isBreak ? "secondary" : "default"} className="text-sm">
                {isBreak ? "Break Time" : "Focus Time"}
              </Badge>
              <Badge variant="outline" className="text-sm">
                {stats.daily_completed} / {settings?.daily_goal || 0} Today
              </Badge>
            </motion.div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <div className="flex items-center gap-2">
                    <motion.div
                      className={cn(
                        "w-3 h-3 rounded-full",
                        isActive ? "bg-green-500" : "bg-gray-300"
                      )}
                      animate={{
                        scale: isActive ? [1, 1.2, 1] : 1,
                        opacity: isActive ? 1 : 0.5,
                      }}
                      transition={{
                        duration: 2,
                        repeat: isActive ? Infinity : 0,
                      }}
                    />
                    <span className="text-sm text-muted-foreground">
                      {isActive ? "Recording" : "Paused"}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>Timer Status</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}
        
        {!isBreak && !isActive && (
          <div className="w-full space-y-4">
            <div className="flex items-center gap-2">
              <Input value={currentTask} onChange={(e) => setCurrentTask(e.target.value)} placeholder="Add a new task" />
              <Button onClick={() => { if (currentTask) { addTask(currentTask); setCurrentTask(''); } }}>Add Task</Button>
              <Button onClick={() => setShowCompletedTasks(prev => !prev)}>{showCompletedTasks ? 'Hide Completed' : 'Show Completed'}</Button>
            </div>
            
            <ul>
              {tasks.filter(task => showCompletedTasks || !task.completed).map(task => (
                <li key={task.id} className={task.completed ? 'line-through' : ''}>
                  <Checkbox checked={task.completed} onChange={() => toggleTask(task.id)} />
                  {task.text}
                  <Button onClick={() => removeTask(task.id)}>Remove</Button>
                </li>
              ))}
            </ul>
          </div>
        )}
        
        <div className="relative" ref={timerRef}>
          <motion.div 
            className="text-7xl font-mono z-10 relative text-center font-bold"
            animate={{
              scale: time <= 60 && isActive ? [1, 1.05, 1] : 1,
            }}
            transition={{
              duration: 1,
              repeat: time <= 60 && isActive ? Infinity : 0,
            }}
          >
            {formatTime(time)}
          </motion.div>
          <motion.div 
            className="absolute inset-0 -m-4"
            initial={false}
            animate={{
              rotate: isActive ? 360 : 0,
            }}
            transition={{
              duration: 60,
              repeat: Infinity,
              ease: "linear",
            }}
          >
            <div className={cn(
              "h-2 transition-colors",
              isBreak ? "bg-secondary" : "bg-primary",
              time <= 60 && isActive && "bg-red-500"
            )}>
              <Progress 
                value={calculateProgress()} 
              />
            </div>
          </motion.div>
        </div>

        <div className="flex space-x-4">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => handleButtonClick(isActive ? 'pause' : 'start')}
                  variant="default"
                  size="lg"
                  className="w-24"
                >
                  {isActive ? <PauseIcon className="h-6 w-6" /> : <PlayIcon className="h-6 w-6" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Space to {isActive ? 'Pause' : 'Start'}
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => handleButtonClick('skip')}
                  variant="outline"
                  size="lg"
                >
                  <SkipForwardIcon className="h-6 w-6" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Press 'S' to Skip
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => setSettingsOpen(true)}
                  variant="outline"
                  size="lg"
                >
                  <Settings2Icon className="h-6 w-6" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Press 'L' for Settings
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {isBreak && (
          <div className="text-center text-sm text-muted-foreground">
            <p>{getBreakSuggestion()}</p>
          </div>
        )}

        {stats && (
          <div className="grid grid-cols-3 gap-4 mt-6">
            <motion.div
              className="flex flex-col items-center p-4 rounded-lg bg-muted/50"
              whileHover={{ scale: 1.05 }}
            >
              <Brain className="h-6 w-6 mb-2 text-primary" />
              <div className="text-2xl font-bold">{stats.totalWorkMinutes}</div>
              <div className="text-xs text-muted-foreground">Focus Hours</div>
            </motion.div>
            
            <motion.div
              className="flex flex-col items-center p-4 rounded-lg bg-muted/50"
              whileHover={{ scale: 1.05 }}
            >
              <Target className="h-6 w-6 mb-2 text-primary" />
              <div className="text-2xl font-bold">{stats.daily_completed} / {settings?.daily_goal || 0}</div>
              <div className="text-xs text-muted-foreground">Daily Goal</div>
            </motion.div>
            
            <motion.div
              className="flex flex-col items-center p-4 rounded-lg bg-muted/50"
              whileHover={{ scale: 1.05 }}
            >
              <Trophy className="h-6 w-6 mb-2 text-primary" />
              <div className="text-2xl font-bold">{streak}</div>
              <div className="text-xs text-muted-foreground">Day Streak</div>
            </motion.div>
          </div>
        )}

        {isActive && currentTask && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-4 rounded-lg bg-muted/30"
          >
            <div className="text-sm text-muted-foreground">Currently focusing on:</div>
            <div className="font-medium">{tasks.find(t => t.id === currentTask)?.text}</div>
          </motion.div>
        )}
        
        {stats && <PomodoroStatsComponent stats={stats} />}
      </div>

      <PomodoroSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        onSettingsUpdate={async (newSettings) => {
          try {
            // Update local state immediately
            setSettings(prev => {
              if (!prev) return prev;
              return {
                ...prev,
                work_duration: newSettings.work_duration ?? prev.work_duration,
                break_duration: newSettings.break_duration ?? prev.break_duration,
                long_break_duration: newSettings.long_break_duration ?? prev.long_break_duration,
                pomodoros_until_long_break: newSettings.pomodoros_until_long_break ?? prev.pomodoros_until_long_break,
                auto_start_pomodoros: newSettings.auto_start_pomodoros ?? prev.auto_start_pomodoros,
                auto_start_breaks: newSettings.auto_start_breaks ?? prev.auto_start_breaks,
                sound_enabled: newSettings.sound_enabled ?? prev.sound_enabled,
                notification_enabled: newSettings.notification_enabled ?? prev.notification_enabled,
                vibration_enabled: newSettings.vibration_enabled ?? prev.vibration_enabled,
                theme: newSettings.theme ?? prev.theme
              };
            });
            if (newSettings.daily_goal) {
              setDailyGoal(newSettings.daily_goal);
            }
            if (newSettings.work_duration && !isActive) {
              setTime(newSettings.work_duration * 60);
            }
            
            // Save to database
            await updatePomodoroSettings(newSettings);
            
            // Refresh from database to ensure consistency
            const updatedSettings = await getPomodoroSettings();
            setSettings(updatedSettings);
            setDailyGoal(updatedSettings.daily_goal || 8);
            
            toast({
              title: "Settings Updated",
              description: "Your pomodoro settings have been saved.",
            });
          } catch (error) {
            // Revert local changes on error
            const currentSettings = await getPomodoroSettings();
            setSettings(currentSettings);
            setDailyGoal(currentSettings.daily_goal || 8);
            
            toast({
              title: "Error",
              description: "Failed to update settings",
              variant: "destructive",
            });
          }
        }}
        initialSettings={settings}
      >
        <DialogContent 
          className="sm:max-w-[425px]"
          aria-describedby="timer-settings-description"
        >
          <DialogHeader>
            <DialogTitle>Timer Settings</DialogTitle>
            <p id="timer-settings-description" className="text-sm text-muted-foreground">
              Customize your timer preferences and notifications.
            </p>
          </DialogHeader>
        </DialogContent>
      </PomodoroSettingsDialog>
    </Card>
  );
}
