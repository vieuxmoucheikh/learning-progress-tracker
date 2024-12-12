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
import { Clock } from 'lucide-react';

interface Task {
  id: string;
  text: string;
  completed: boolean;
  progress: number;
  metrics: {
    totalMinutes: number;
    completedPomodoros: number;
    currentStreak: number;
  };
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
  const [tasks, setTasks] = useState<Task[]>([]);
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

  // Improve sound handling
  const playNotificationSound = useCallback(() => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }

      const oscillator = audioContextRef.current.createOscillator();
      const gainNode = audioContextRef.current.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContextRef.current.destination);

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(440, audioContextRef.current.currentTime);
      gainNode.gain.setValueAtTime(0.1, audioContextRef.current.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + 0.5);

      oscillator.start(audioContextRef.current.currentTime);
      oscillator.stop(audioContextRef.current.currentTime + 0.5);

      // Show notification if enabled
      if (Notification.permission === 'granted' && settings?.notification_enabled) {
        new Notification('Pomodoro Timer', {
          body: isBreak ? 'Break time is over!' : 'Time to take a break!',
          icon: '/favicon.ico'
        });
      }
    } catch (error) {
      console.error('Error playing sound:', error);
    }
  }, [isBreak, settings]);

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

  // Add activeTaskId state
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  const addTask = async (text: string) => {
    const newTaskId = crypto.randomUUID();
    const newTask: Task = {
      id: newTaskId,
      text,
      completed: false,
      progress: 0,
      metrics: {
        totalMinutes: 0,
        completedPomodoros: 0,
        currentStreak: 0
      }
    };

    setTasks(prev => [...prev, newTask]);
    setActiveTaskId(newTaskId); // Set as active task
    
    // Reset timer for new task
    setTime(settings?.work_duration ? settings.work_duration * 60 : 25 * 60);
    setIsActive(false);
    setIsBreak(false);
    
    if (currentPomodoroId) {
      await completePomodoro(currentPomodoroId);
      setCurrentPomodoroId(null);
    }
  };

  const setTaskActive = async (taskId: string) => {
    setActiveTaskId(taskId);
    // Reset timer for selected task
    setTime(settings?.work_duration ? settings.work_duration * 60 : 25 * 60);
    setIsActive(false);
    setIsBreak(false);
    
    if (currentPomodoroId) {
      await completePomodoro(currentPomodoroId);
      setCurrentPomodoroId(null);
    }
  };

  // Add helper function for time formatting
  const formatTotalTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (hours === 0) return `${remainingMinutes}m`;
    if (remainingMinutes === 0) return `${hours}h`;
    return `${hours}h ${remainingMinutes}m`;
  };

  // Update task persistence
  useEffect(() => {
    const loadTasks = async () => {
      try {
        const savedTasks = localStorage.getItem('pomodoroTasks');
        if (savedTasks) {
          const parsedTasks = JSON.parse(savedTasks);
          const tasksWithMetrics = parsedTasks.map((task: any) => ({
            ...task,
            metrics: task.metrics || {
              totalMinutes: 0,
              completedPomodoros: 0,
              currentStreak: 0
            }
          }));
          setTasks(tasksWithMetrics);
        }
      } catch (error) {
        console.error('Error loading tasks:', error);
      }
    };

    loadTasks();
  }, []);

  // Save tasks whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('pomodoroTasks', JSON.stringify(tasks));
    } catch (error) {
      console.error('Error saving tasks:', error);
    }
  }, [tasks]);

  // Add session type indicator component
  const SessionTypeIndicator = ({ isBreak }: { isBreak: boolean }) => (
    <motion.div 
      className={cn(
        "absolute top-0 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full shadow-lg",
        isBreak 
          ? "bg-indigo-500/10 text-indigo-600 border border-indigo-200/20" 
          : "bg-blue-500/10 text-blue-600 border border-blue-200/20"
      )}
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -20, opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center gap-2">
        <div className={cn(
          "w-2 h-2 rounded-full animate-pulse",
          isBreak ? "bg-indigo-500" : "bg-blue-500"
        )} />
        <span className="text-sm font-medium">
          {isBreak ? "Break Time" : "Focus Time"}
        </span>
      </div>
    </motion.div>
  );

  // Add keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      
      switch(e.key.toLowerCase()) {
        case ' ':
          e.preventDefault();
          if (activeTaskId) {
            handleButtonClick(isActive ? 'pause' : 'start');
          }
          break;
        case 's':
          e.preventDefault();
          if (activeTaskId && isActive) {
            handleButtonClick('skip');
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isActive, activeTaskId]);

  // Enhanced TaskListItem component
  const TaskListItem = ({ task }: { task: Task }) => (
    <motion.li 
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={cn(
        "flex items-center gap-3 p-4 rounded-xl transition-all duration-200",
        activeTaskId === task.id 
          ? "bg-blue-600/30 shadow-lg border border-blue-400/30" 
          : "bg-slate-800/80 hover:bg-slate-700/80 border border-slate-600/30",
      )}
    >
      <Checkbox 
        checked={task.completed} 
        onCheckedChange={() => toggleTask(task.id)}
        className="data-[state=checked]:bg-blue-500"
      />
      <div className="flex-1 min-w-0">
        <div className={cn(
          "font-medium truncate",
          task.completed ? "text-slate-400 line-through" : "text-blue-100"
        )}>
          {task.text}
        </div>
        {activeTaskId === task.id && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-xs text-blue-200 mt-1 flex items-center gap-2"
          >
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatTotalTime(task.metrics.totalMinutes)}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Target className="w-3 h-3" />
              {task.metrics.completedPomodoros} pomodoros
            </span>
          </motion.div>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button 
          variant={activeTaskId === task.id ? "default" : "ghost"}
          size="sm"
          onClick={() => setTaskActive(task.id)}
          className={cn(
            "transition-all duration-200",
            activeTaskId === task.id 
              ? "bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/20" 
              : "bg-blue-500/20 text-blue-100 hover:bg-blue-500/30"
          )}
        >
          {activeTaskId === task.id ? "Active" : "Start"}
        </Button>
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => removeTask(task.id)}
          className="bg-red-500/10 text-red-200 hover:bg-red-500/20 hover:text-red-100"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </motion.li>
  );

  // Task input section
  const TaskInput = () => (
    <div className="flex items-center gap-2 mb-4">
      <Input 
        type="text"
        value={currentTask} 
        onChange={(e) => setCurrentTask(e.target.value)} 
        placeholder="Add a new task..."
        className="bg-slate-800/80 border-slate-600/30 focus:border-blue-500/50 text-blue-50 placeholder:text-slate-400"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && currentTask.trim()) {
            addTask(currentTask);
            setCurrentTask('');
          }
        }}
      />
      <Button 
        onClick={() => { 
          if (currentTask.trim()) { 
            addTask(currentTask); 
            setCurrentTask(''); 
          } 
        }}
        className="bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/20"
      >
        Add
      </Button>
    </div>
  );

  // Render task list
  const renderTaskList = () => (
    <AnimatePresence mode="popLayout">
      <motion.ul className="space-y-3">
        {tasks
          .filter(task => showCompletedTasks || !task.completed)
          .map(task => (
            <motion.li 
              key={task.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={cn(
                "flex items-center gap-3 p-4 rounded-xl transition-all duration-200",
                activeTaskId === task.id 
                  ? "bg-blue-600/30 shadow-lg border border-blue-400/30" 
                  : "bg-slate-800/80 hover:bg-slate-700/80 border border-slate-600/30",
              )}
            >
              <Checkbox 
                checked={task.completed} 
                onCheckedChange={() => toggleTask(task.id)}
                className="data-[state=checked]:bg-blue-500"
              />
              <div className="flex-1 min-w-0">
                <div className={cn(
                  "font-medium truncate",
                  task.completed ? "text-slate-400 line-through" : "text-blue-100"
                )}>
                  {task.text}
                </div>
                {activeTaskId === task.id && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-xs text-blue-200 mt-1 flex items-center gap-2"
                  >
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatTotalTime(task.metrics.totalMinutes)}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Target className="w-3 h-3" />
                      {task.metrics.completedPomodoros} pomodoros
                    </span>
                  </motion.div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant={activeTaskId === task.id ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setTaskActive(task.id)}
                  className={cn(
                    "transition-all duration-200",
                    activeTaskId === task.id 
                      ? "bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/20" 
                      : "bg-blue-500/20 text-blue-100 hover:bg-blue-500/30"
                  )}
                >
                  {activeTaskId === task.id ? "Active" : "Start"}
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => removeTask(task.id)}
                  className="bg-red-500/10 text-red-200 hover:bg-red-500/20 hover:text-red-100"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </motion.li>
          ))}
      </motion.ul>
    </AnimatePresence>
  );

  // Get motivational message based on streak
  const getMotivationalMessage = (streak: number) => {
    if (streak === 0) return "Let's get started! 🚀";
    if (streak <= 2) return "Great start! Keep going! 💪";
    if (streak <= 4) return "You're on fire! 🔥";
    return "Incredible streak! You're unstoppable! ⭐";
  };

  // Calculate progress percentages
  const getProgressStats = (task: Task) => {
    const streakPercentage = Math.min((task.metrics.currentStreak / 4) * 100, 100);
    const dailyGoalPercentage = Math.min((task.metrics.completedPomodoros / 8) * 100, 100);
    return { streakPercentage, dailyGoalPercentage };
  };

  // Active Task Progress section
  const TaskProgress = ({ task }: { task: Task }) => {
    const { streakPercentage, dailyGoalPercentage } = getProgressStats(task);
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 rounded-xl bg-blue-600/20 border border-blue-400/30 shadow-lg"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm font-medium">
            <span className="text-blue-300">Current Task:</span>
            <span className="ml-2 text-blue-100">{task.text}</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-blue-500/20 text-blue-200 border-blue-400/30">
              {isBreak ? 'Break Time' : 'Focus Time'}
            </Badge>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-6">
          <div className="text-center p-4 rounded-lg bg-blue-500/10 relative overflow-hidden">
            <div className="relative z-10">
              <div className="text-3xl font-bold text-blue-100 mb-1">
                {task.metrics.currentStreak}
              </div>
              <div className="text-sm text-blue-300 font-medium">Current Streak</div>
            </div>
            <div 
              className="absolute inset-0 bg-gradient-to-t from-blue-500/20 to-transparent" 
              style={{ 
                transform: `translateY(${100 - streakPercentage}%)`,
                transition: 'transform 0.3s ease-out'
              }} 
            />
          </div>
          <div className="text-center p-4 rounded-lg bg-blue-500/10 relative overflow-hidden">
            <div className="relative z-10">
              <div className="text-3xl font-bold text-blue-100 mb-1">
                {Math.round(dailyGoalPercentage)}%
              </div>
              <div className="text-sm text-blue-300 font-medium">Daily Goal Progress</div>
            </div>
            <div 
              className="absolute inset-0 bg-gradient-to-t from-green-500/20 to-transparent" 
              style={{ 
                transform: `translateY(${100 - dailyGoalPercentage}%)`,
                transition: 'transform 0.3s ease-out'
              }} 
            />
          </div>
        </div>
        <div className="mt-4 text-center">
          <p className="text-sm text-blue-200">
            {getMotivationalMessage(task.metrics.currentStreak)}
          </p>
        </div>
      </motion.div>
    );
  };

  // Enhanced TimerDisplay with better styling
  const TimerDisplay = ({ time, isActive, totalTime }: { time: number; isActive: boolean; totalTime: number }) => {
    const minutes = Math.floor(time / 60);
    const seconds = time % 60;
    const progress = ((totalTime - time) / totalTime) * 100;
    const circumference = 2 * Math.PI * 120;

    return (
      <motion.div 
        className="relative flex justify-center items-center my-12 md:my-8"
        initial={false}
        animate={isActive ? { scale: [1, 1.03, 1] } : { scale: 1 }}
        transition={{ 
          duration: 3,
          repeat: isActive ? Infinity : 0,
          ease: "easeInOut"
        }}
      >
        {/* Animated Background Rings */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <motion.div
            className={cn(
              "absolute w-[280px] md:w-[320px] h-[280px] md:h-[320px] rounded-full opacity-20 blur-xl",
              isBreak ? "bg-blue-400" : "bg-blue-500"
            )}
            animate={{
              scale: isActive ? [1, 1.1, 1] : 1,
              opacity: isActive ? [0.2, 0.15, 0.2] : 0.2,
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          <motion.div
            className={cn(
              "absolute w-[240px] md:w-[280px] h-[240px] md:h-[280px] rounded-full blur-xl",
              isBreak ? "bg-indigo-400" : "bg-indigo-500"
            )}
            animate={{
              scale: isActive ? [1.1, 1, 1.1] : 1,
              opacity: isActive ? [0.15, 0.1, 0.15] : 0.15,
            }}
            transition={{
              duration: 5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.5
            }}
          />
        </div>

        {/* Progress Ring */}
        <svg className="absolute w-[260px] md:w-[300px] h-[260px] md:h-[300px] -rotate-90 pointer-events-none">
          {/* Background Ring */}
          <circle
            cx="130"
            cy="130"
            r="100"
            className="stroke-white/10 fill-none"
            strokeWidth="12"
          />
          {/* Progress Ring with Gradient */}
          <circle
            cx="130"
            cy="130"
            r="100"
            className="fill-none transition-all duration-500"
            stroke={isBreak ? "url(#gradientBreak)" : "url(#gradientFocus)"}
            strokeWidth="12"
            strokeDasharray={circumference}
            strokeDashoffset={circumference - (progress / 100) * circumference}
            strokeLinecap="round"
          />
          {/* Gradient Definitions */}
          <defs>
            <linearGradient id="gradientFocus" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3B82F6" />
              <stop offset="100%" stopColor="#60A5FA" />
            </linearGradient>
            <linearGradient id="gradientBreak" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#818CF8" />
              <stop offset="100%" stopColor="#A5B4FC" />
            </linearGradient>
          </defs>
        </svg>

        {/* Timer Display */}
        <div className="relative flex flex-col items-center z-10">
          <motion.div 
            className="text-6xl md:text-8xl font-mono font-bold tracking-tight flex items-center"
            animate={isActive ? {
              filter: ["brightness(1)", "brightness(1.2)", "brightness(1)"],
            } : {}}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <motion.span
              key={minutes}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className={cn(
                "transition-colors duration-300",
                isActive 
                  ? isBreak ? "text-indigo-500" : "text-blue-500" 
                  : "text-slate-600"
              )}
            >
              {String(minutes).padStart(2, '0')}
            </motion.span>
            <motion.span 
              className={cn(
                "mx-2 transition-colors duration-300",
                isActive 
                  ? isBreak ? "text-indigo-400" : "text-blue-400"
                  : "text-slate-400"
              )}
              animate={isActive ? { opacity: [1, 0.5, 1] } : {}}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >:</motion.span>
            <motion.span
              key={seconds}
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className={cn(
                "transition-colors duration-300",
                isActive 
                  ? time <= 60 ? "text-red-500" 
                  : isBreak ? "text-indigo-500" : "text-blue-500"
                  : "text-slate-600"
              )}
            >
              {String(seconds).padStart(2, '0')}
            </motion.span>
          </motion.div>
          <motion.span 
            className={cn(
              "text-sm font-medium mt-4 px-4 py-1 rounded-full transition-colors duration-300",
              isActive 
                ? isBreak 
                  ? "bg-indigo-100 text-indigo-600" 
                  : "bg-blue-100 text-blue-600"
                : "bg-slate-100 text-slate-600"
            )}
            animate={isActive ? {
              scale: [1, 1.05, 1],
            } : {}}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            {isBreak ? "Break Time" : "Focus Time"}
          </motion.span>
        </div>
      </motion.div>
    );
  };

  // Enhanced PomodoroProgress with better styling
  const PomodoroProgress = ({ task, settings }: { task: Task, settings: PomodoroSettings }) => {
    const dailyGoal = settings?.daily_goal || 4;
    const completed = Math.min(task.metrics.completedPomodoros, dailyGoal);
    const remaining = Math.max(0, dailyGoal - completed);
    const percentage = Math.min(100, (completed / dailyGoal) * 100);

    return (
      <div className="p-6 rounded-xl bg-white dark:bg-slate-900 shadow-lg border border-slate-200 dark:border-slate-800">
        <div className="flex justify-between items-center mb-4">
          <span className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Daily Progress
          </span>
          <div className="flex items-center gap-2">
            <span className={cn(
              "text-xl font-bold",
              percentage === 100 ? "text-blue-500" : "text-slate-900 dark:text-slate-100"
            )}>
              {completed}
            </span>
            <span className="text-slate-500">/</span>
            <span className="text-slate-700 dark:text-slate-300 font-medium">{dailyGoal}</span>
            {remaining > 0 && (
              <span className="text-xs text-slate-500 ml-1">
                ({remaining} to go)
              </span>
            )}
          </div>
        </div>
        <div className="relative h-4">
          <div className="absolute w-full h-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div 
              className={cn(
                "h-full transition-all duration-300 rounded-full",
                percentage === 100 
                  ? "bg-gradient-to-r from-blue-500 to-blue-400" 
                  : "bg-gradient-to-r from-blue-500/90 to-blue-400/90"
              )}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      </div>
    );
  };

  // Fix handleTimerComplete function
  const handleTimerComplete = async () => {
    if (!settings || !activeTaskId) return;

    try {
      const activeTask = tasks.find(t => t.id === activeTaskId);
      if (!activeTask) return;

      // Handle focus session completion and metrics update
      if (!isBreak) {
        if (currentPomodoroId) {
          await completePomodoro(currentPomodoroId);
          setCurrentPomodoroId(null);
        }

        const updatedTasks = tasks.map(task => {
          if (task.id === activeTaskId) {
            const newCompletedPomodoros = task.metrics.completedPomodoros + 1;
            
            if (newCompletedPomodoros >= (settings.daily_goal || 4)) {
              playNotificationSound();
              toast({
                title: "🎉 Daily Goal Achieved! 🌟",
                description: "Incredible work! You've crushed your daily goal. This task is now complete!",
                duration: 6000,
              });

              setIsActive(false);
              setIsBreak(false);
              setTime(settings.work_duration * 60);

              return {
                ...task,
                completed: true,
                metrics: {
                  ...task.metrics,
                  totalMinutes: task.metrics.totalMinutes + settings.work_duration,
                  completedPomodoros: newCompletedPomodoros
                }
              };
            }

            return {
              ...task,
              metrics: {
                ...task.metrics,
                totalMinutes: task.metrics.totalMinutes + settings.work_duration,
                completedPomodoros: newCompletedPomodoros
              }
            };
          }
          return task;
        });

        setTasks(updatedTasks);
        
        const updatedTask = updatedTasks.find(t => t.id === activeTaskId);
        if (updatedTask?.completed) {
          return;
        }
      }

      // Complete current session if exists
      if (currentPomodoroId) {
        await completePomodoro(currentPomodoroId);
        setCurrentPomodoroId(null);
      }

      // Switch between break and focus
      const newIsBreak = !isBreak;
      setIsBreak(newIsBreak);
      
      // Set new time based on session type
      const newTime = newIsBreak
        ? (settings.break_duration * 60)
        : (settings.work_duration * 60);
      setTime(newTime);

      // Play sound and show notification
      playNotificationSound();
      toast({
        title: newIsBreak ? 'Time for a break! 🌟' : 'Break complete! 💪',
        description: newIsBreak 
          ? 'Great work! Take a moment to recharge.' 
          : 'Ready for another focused session? You\'re doing great!',
      });

      // Start new session
      const newPomodoro = await startPomodoro(newIsBreak ? 'break' : 'work');
      setCurrentPomodoroId(newPomodoro.id);

      // Auto-start based on settings
      const shouldAutoStart = newIsBreak ? settings.auto_start_breaks : settings.auto_start_pomodoros;
      setIsActive(shouldAutoStart);

      localStorage.setItem('pomodoroTasks', JSON.stringify(tasks));
    } catch (error) {
      console.error('Error completing timer:', error);
      toast({
        title: 'Error',
        description: 'Failed to complete timer session',
        variant: 'destructive'
      });
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

  const toggleTask = (id: string) => {
    setTasks(prev => prev.map(task => 
      task.id === id ? { ...task, completed: !task.completed } : task
    ));
  };

  const removeTask = (id: string) => {
    setTasks(prev => prev.filter(task => task.id !== id));
  };

  // Task list header
  const TaskListHeader = () => (
    <div className="flex justify-between items-center px-1 mb-3">
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="bg-blue-500/20 text-blue-200 border-blue-400/30">
          {tasks.filter(t => !t.completed).length} active
        </Badge>
        <Badge variant="outline" className="bg-slate-700/50 text-slate-200 border-slate-500/30">
          {tasks.filter(t => t.completed).length} completed
        </Badge>
      </div>
      <Button 
        variant="ghost" 
        size="sm"
        onClick={() => setShowCompletedTasks(prev => !prev)}
        className="bg-slate-700/50 text-slate-200 hover:bg-slate-600/50 hover:text-white"
      >
        {showCompletedTasks ? 'Hide Completed' : 'Show Completed'}
      </Button>
    </div>
  );

  // Update active task stats display
  return (
    <Card className="p-4 md:p-6 max-w-md mx-auto backdrop-blur-sm bg-slate-900/90 border-slate-700/30 shadow-2xl">
      <div className="pomodoro-timer space-y-6 md:space-y-8">
        {/* Session Type Indicator */}
        <SessionTypeIndicator isBreak={isBreak} />

        {/* Task Management */}
        <div className="w-full">
          <TaskInput />
          <TaskListHeader />
          {renderTaskList()}
        </div>

        {/* Timer Display */}
        <div className="relative mb-8" ref={timerRef}>
          <TimerDisplay 
            time={time} 
            isActive={isActive} 
            totalTime={isBreak ? (settings?.break_duration || 5) * 60 : (settings?.work_duration || 25) * 60} 
          />
        </div>

        {/* Timer Controls */}
        <div className="flex justify-center gap-4">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => handleButtonClick(isActive ? 'pause' : 'start')}
                  disabled={!activeTaskId}
                  size="lg"
                  className={cn(
                    "w-24 transition-all duration-300 shadow-lg",
                    isActive 
                      ? "bg-blue-500/80 hover:bg-blue-600/80 shadow-blue-500/20" 
                      : "bg-blue-500/60 hover:bg-blue-500/80 shadow-blue-500/10",
                    !activeTaskId && "opacity-50"
                  )}
                >
                  {isActive ? <PauseIcon className="h-6 w-6" /> : <PlayIcon className="h-6 w-6" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {!activeTaskId ? 'Select a task first' : `Space to ${isActive ? 'Pause' : 'Start'}`}
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => handleButtonClick('skip')}
                  disabled={!activeTaskId || !isActive}
                  variant="outline"
                  size="lg"
                  className="border-white/10 hover:border-white/20 hover:bg-white/5"
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
                  className="border-white/10 hover:border-white/20 hover:bg-white/5"
                >
                  <Settings2Icon className="h-6 w-6" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Settings
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Active Task Progress */}
        {activeTaskId && (
          <TaskProgress task={tasks.find(t => t.id === activeTaskId)!} />
        )}

        {/* Settings Dialog */}
        <PomodoroSettingsDialog
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          onSettingsUpdate={async (newSettings) => {
            try {
              await updatePomodoroSettings(newSettings);
              const updatedSettings = await getPomodoroSettings();
              setSettings(updatedSettings);
              if (updatedSettings.work_duration && !isActive) {
                setTime(updatedSettings.work_duration * 60);
              }
              toast({
                title: "Settings Updated",
                description: "Your pomodoro settings have been saved.",
              });
            } catch (error) {
              toast({
                title: "Error",
                description: "Failed to update settings",
                variant: "destructive",
              });
            }
          }}
          initialSettings={settings}
        />
      </div>
    </Card>
  );
}
 