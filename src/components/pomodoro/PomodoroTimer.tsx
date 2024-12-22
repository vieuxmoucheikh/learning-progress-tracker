import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import Progress from '@/components/ui/progress';
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import Label from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogTitle, DialogContent } from '@radix-ui/react-dialog';
import {
    startPomodoro,
    completePomodoro,
    getPomodoroSettings,
    getPomodoroStats,
    updatePomodoroSettings
} from '@/lib/database';
import { PomodoroSettings, PomodoroStats } from '@/types';
import { PomodoroSettingsDialog } from './PomodoroSettingsDialog';
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

interface PomodoroSettingsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    setTime: (time: number) => void;
    onSettingsUpdate: (newSettings: PomodoroSettings) => void;
    initialSettings: PomodoroSettings | null;
    isActive: boolean;
}

interface PomodoroTimerProps {
    onSessionComplete?: (sessionData: { duration: number; label: string; type: 'work' | 'break' }) => void;
    sessionId?: string;
}

export function PomodoroTimer({ }: PomodoroTimerProps) {
    const [time, setTime] = useState(25 * 60);
    const [isActive, setIsActive] = useState(false);
    const [isBreak, setIsBreak] = useState(false);
    const [settings, setSettings] = useState<PomodoroSettings | null>({
        work_duration: 25,
        break_duration: 5,
        daily_goal: 8,
        auto_start_pomodoros: false,
        auto_start_breaks: true,
        sound_enabled: true,
        notification_enabled: true,
        long_break_duration: 15,
        pomodoros_until_long_break: 4,
    });
    const [stats, setStats] = useState<PomodoroStats | null>(null);
    const [currentPomodoroId, setCurrentPomodoroId] = useState<string | null>(null);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [focusLabel, setFocusLabel] = useState<string>("");
    const [dailyGoal, setDailyGoal] = useState<number>(8);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [showCompletedTasks, setShowCompletedTasks] = useState(false);
    const [currentTask, setCurrentTask] = useState<string>("");
    const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
    const timerRef = useRef<HTMLDivElement>(null);
    const { toast } = useToast();
    const { user } = useAuth();
    const [streak, setStreak] = useState(0);
    const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
    const [oscillator, setOscillator] = useState<OscillatorNode | null>(null);
    const [isCompleted, setIsCompleted] = useState(false);

    // Add streak tracking
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

    // Synchronize timer state with server
    const syncWithSupabase = useCallback(async () => {
        try {
            const failedCompletions = JSON.parse(localStorage.getItem('failedPomodoroCompletions') || '[]');
            if (failedCompletions.length > 0) {
                for (const session of failedCompletions) {
                    try {
                        await completePomodoro(session.pomodoroId);
                    } catch (error) {
                        console.error('Error syncing failed completion:', error);
                        return;
                    }
                }
                localStorage.removeItem('failedPomodoroCompletions');
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
            localStorage.setItem('pomodoroLastTimestamp', Date.now().toString());
            localStorage.setItem('pomodoroTimerState', JSON.stringify({
                time,
                isActive,
                isBreak,
                currentPomodoroId
            }));
        } else {
            try {
                const savedState = localStorage.getItem('pomodoroTimerState');
                if (savedState) {
                    const parsedState = JSON.parse(savedState);
                    const storedTimestamp = parseInt(localStorage.getItem('pomodoroLastTimestamp') || Date.now().toString());
                    const elapsedSeconds = Math.floor((Date.now() - storedTimestamp) / 1000);
                    if (parsedState.isActive && elapsedSeconds > 0) {
                        const adjustedTime = Math.max(0, parsedState.time - elapsedSeconds);
                        setTime(adjustedTime);
                        if (adjustedTime === 0) {
                            handleTimerComplete();
                        }
                    }
                }
            } catch (error) {
                console.error('Error handling visibility change:', error);
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
        setActiveTaskId(newTaskId);
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
        setTime(settings?.work_duration ? settings.work_duration * 60 : 25 * 60);
        setIsActive(false);
        setIsBreak(false);
        if (currentPomodoroId) {
            await completePomodoro(currentPomodoroId);
            setCurrentPomodoroId(null);
        }
    };

    const toggleTask = (id: string) => {
        setTasks(prevTasks =>
            prevTasks.map(task =>
                task.id === id ? { ...task, completed: !task.completed } : task
            )
        );
    };

    const removeTask = (taskId: string) => {
        setTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));
    };

    const formatTotalTime = (minutes: number) => {
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        if (hours === 0) return `${remainingMinutes}m`;
        if (remainingMinutes === 0) return `${hours}h`;
        return `${hours}h ${remainingMinutes}m`;
    };

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

    useEffect(() => {
        try {
            localStorage.setItem('pomodoroTasks', JSON.stringify(tasks));
        } catch (error) {
            console.error('Error saving tasks:', error);
        }
    }, [tasks]);

    // Ajouter un effet pour charger les paramètres au démarrage
    useEffect(() => {
        const loadSettings = async () => {
            try {
                const userSettings = await getPomodoroSettings();
                setSettings(userSettings);
                // Initialiser le timer avec la bonne durée
                if (!isActive) {
                    setTime(userSettings.work_duration * 60);
                }
            } catch (error) {
                console.error('Error loading settings:', error);
            }
        };
        loadSettings();
    }, []);

    // Modifier handleTimerComplete pour mieux gérer les paramètres
    const handleTimerComplete = useCallback(async () => {
        if (!settings) return;

        // Arrêter le timer actif et le son
        setIsActive(false);
        if (oscillator) {
            oscillator.stop();
        }
        
        // Compléter le pomodoro actuel
        if (currentPomodoroId) {
            await completePomodoro(currentPomodoroId);
            setCurrentPomodoroId(null);
        }

        // Mettre à jour les métriques pour le focus time uniquement
        if (!isBreak && activeTaskId) {
            setTasks(prev => prev.map(task => {
                if (task.id === activeTaskId) {
                    const newCompletedPomodoros = task.metrics.completedPomodoros + 1;
                    if (newCompletedPomodoros >= (settings?.daily_goal ?? 8) && !task.completed) {
                        toast({
                            title: "Daily Goal Achieved!",
                            description: "Great job! You've reached your daily pomodoro goal!",
                            duration: 5000,
                        });
                    }
                    return {
                        ...task,
                        metrics: {
                            ...task.metrics,
                            currentStreak: task.metrics.currentStreak + 1,
                            completedPomodoros: newCompletedPomodoros,
                            totalMinutes: task.metrics.totalMinutes + settings.work_duration
                        }
                    };
                }
                return task;
            }));
            updateStreak();
            localStorage.setItem('pomodoroTasks', JSON.stringify(tasks));
        }

        // Jouer le son si activé
        if (settings.sound_enabled) {
            await playNotificationSound();
        }

        // Basculer entre focus et pause
        const newIsBreak = !isBreak;
        setIsBreak(newIsBreak);

        // Calculer la durée suivante selon le type et les paramètres
        let newDuration;
        if (newIsBreak) {
            // Vérifier si c'est l'heure d'une longue pause
            const completedPomodoros = tasks.find(t => t.id === activeTaskId)?.metrics.completedPomodoros || 0;
            const isLongBreak = completedPomodoros % settings.pomodoros_until_long_break === 0;
            newDuration = isLongBreak ? settings.long_break_duration : settings.break_duration;
        } else {
            newDuration = settings.work_duration;
        }
        setTime(newDuration * 60);

        // Notification
        toast({
            title: newIsBreak ? "Time for a break!" : "Break complete!",
            description: newIsBreak
                ? `Taking a ${newDuration}-minute break. ${newIsBreak && newDuration === settings.long_break_duration ? "It's a long break!" : ''}`
                : "Ready for another focused session?",
            duration: 3000,
        });

        // Démarrer automatiquement selon les paramètres
        const shouldAutoStart = newIsBreak ? settings.auto_start_breaks : settings.auto_start_pomodoros;
        if (shouldAutoStart) {
            setTimeout(async () => {
                await startNewPomodoro(newIsBreak ? 'break' : 'work');
            }, 300);
        }
    }, [settings, isBreak, activeTaskId, currentPomodoroId, tasks, oscillator]);

    const playNotificationSound = useCallback(async () => {
        try {
            if (!audioContext) {
                const newAudioContext = new AudioContext();
                setAudioContext(newAudioContext);
            }
            
            if (audioContext) {
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);
                
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
                
                gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
                
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.5);
                
                // Ne pas stocker l'oscillateur dans l'état pour éviter la double lecture
                if (settings?.notification_enabled) {
                    if (Notification.permission === 'granted') {
                        new Notification('Pomodoro Timer', {
                            body: isBreak ? 'Break time is over!' : 'Time to take a break!',
                            icon: 'favicon.ico'
                        });
                    }
                }
                
                // Retourner une promesse qui se résout quand le son est terminé
                return new Promise(resolve => setTimeout(resolve, 500));
            }
        } catch (error) {
            console.error('Error playing sound:', error);
        }
    }, [isBreak, settings, audioContext]);

    // Modifier startNewPomodoro pour inclure le type de pause
    const startNewPomodoro = async (type: 'work' | 'break' | 'long_break' = 'work') => {
        try {
            if (!settings) return;

            if (currentPomodoroId) {
                await completePomodoro(currentPomodoroId);
            }

            // Vérifier si c'est une longue pause
            if (type === 'break') {
                const completedPomodoros = tasks.find(t => t.id === activeTaskId)?.metrics.completedPomodoros || 0;
                const isLongBreak = completedPomodoros % settings.pomodoros_until_long_break === 0;
                type = isLongBreak ? 'long_break' : 'break';
            }

            const pomodoro = await startPomodoro(type);
            setCurrentPomodoroId(pomodoro.id);
            setIsActive(true);

            // Mettre à jour le temps en fonction du type
            const duration = type === 'long_break' 
                ? settings.long_break_duration 
                : type === 'break' 
                    ? settings.break_duration 
                    : settings.work_duration;
            setTime(duration * 60);
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
        setTime(0);
        handleTimerComplete();
    };

    const handleButtonClick = (event: React.FormEvent<HTMLButtonElement>) => {
        const action = event.currentTarget.name;
        switch (action) {
            case 'start':
                if (!isActive) {
                    startNewPomodoro(isBreak ? 'break' : 'work');
                }
                break;
            case 'pause':
                setIsActive(false);
                break;
            case 'skip':
                skipCurrentInterval();
                break;
        }
    };

    return (
        <Card className="p-4 md:p-6 max-w-md mx-auto backdrop-blur-sm bg-slate-900/90 border-slate700/30 shadow-2xl">
            <div className="pomodoro-timer space-y-6 md:space-y-8">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full shadow-lg">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full animate-pulse bg-blue-500" />
                        <span className="text-sm font-medium text-blue-100">
                            {isBreak ? "Break Time" : "Focus Time"}
                        </span>
                    </div>
                </div>
                <div className="w-full">
                    <div className="flex items-center gap-2 mb-4">
                        <Input
                            type="text"
                            value={currentTask}
                            onChange={(e) => setCurrentTask(e.target.value)}
                            placeholder="Add a new task..."
                            className="flex h-10 w-full rounded-md border border-slate-600/30 bg-slate-800/80 px-3 py-2
                            text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium
                            placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 text-blue-50"
                        />
                        <Button
                            onClick={() => {
                                if (currentTask.trim()) {
                                    addTask(currentTask);
                                    setCurrentTask("");
                                }
                            }}
                            className="bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                        >
                            Add
                        </Button>
                    </div>
                    <div className="flex justify-between items-center">
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
                    <ul>
                        {tasks
                            .filter(task => showCompletedTasks || !task.completed)
                            .map(task => (
                                <li key={task.id} className="flex items-center gap-3 p-4 rounded-xl transition-all duration-200">
                                    <Checkbox
                                        checked={task.completed}
                                        onChange={() => toggleTask(task.id)}
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
                                            <div className="text-xs text-blue-200 mt-1 flex items-center gap-2">
                                                <span className="flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {formatTotalTime(task.metrics.totalMinutes)}
                                                </span>
                                                <span>*</span>
                                                <span className="flex items-center gap-1">
                                                    <Target className="w-3 h-3" />
                                                    {task.metrics.completedPomodoros} pomodoros
                                                </span>
                                            </div>
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
                                </li>
                            ))}
                    </ul>
                </div>
                <div className="relative mb-8" ref={timerRef}>
                    <TimerDisplay
                        time={time}
                        isActive={isActive}
                        totalTime={isBreak ? (settings?.break_duration || 5) * 60 : (settings?.work_duration || 25) * 60}
                    />
                </div>
                <div className="flex justify-center gap-4">
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    name="start"
                                    onClick={handleButtonClick}
                                    disabled={!activeTaskId}
                                    size="lg"
                                    className={cn(
                                        "w-24 transition-all duration-300 shadow-lg",
                                        isActive
                                            ? "bg-blue-500/80 hover:bg-blue-600/80 shadow-blue-500/20"
                                            : "bg-blue-500/60 hover:bg-blue-500/80 shadow-blue-500/10",
                                        activeTaskId && "opacity-50"
                                    )}
                                >
                                    {isActive ? <PauseIcon className="h-6 w-6" /> : <PlayIcon className="h-6 w-6" />}
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                {activeTaskId ? 'Select a task first' : `Space to ${isActive ? 'Pause' : 'Start'}`}
                            </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    name="skip"
                                    onClick={handleButtonClick}
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
                                    name="settings"
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
                {activeTaskId && (
                    <TaskProgress task={tasks.find(t => t.id === activeTaskId)!} />
                )}
                <PomodoroSettingsDialog
                open={settingsOpen}
                onOpenChange={setSettingsOpen}
                isActive={isActive}
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

function TimerDisplay({ time, isActive, totalTime }: { time: number; isActive: boolean; totalTime: number }) {
    const minutes = Math.floor(time / 60);
    const seconds = time % 60;
    const progress = ((totalTime - time) / totalTime) * 100;
    const circumference = 2 * Math.PI * 120;
    return (
        <div className="relative flex justify-center items-center my-12 md:my-8">
            {/* Animated Background Rings */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div
                    className={cn(
                        "absolute w-[280px] md:w-[320px] h-[280px] md:h-[320px] rounded-full opacity-20 blur-xl",
                        isActive ? "bg-blue-400" : "bg-blue-500"
                    )}
                />
                <div
                    className={cn(
                        "absolute w-[240px] md:w-[280px] h-[240px] md:h-[280px] rounded-full blur-xl",
                        isActive ? "bg-indigo-400" : "bg-indigo-500"
                    )}
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
                    stroke={isActive ? "url(#gradientFocus)" : "url(#gradientBreak)"}
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
                <div className="text-6xl md:text-8xl font-mono font-bold tracking-tight flex items-center">
                    <span className="text-blue-100">{String(minutes).padStart(2, '0')}</span>
                    <span className="mx-2 text-blue-200">:</span>
                    <span className="text-blue-100">{String(seconds).padStart(2, '0')}</span>
                </div>
                <span className="text-sm font-medium mt-4">{isActive ? "Focus Time" : "Break Time"}</span>
            </div>
        </div>
    );
}

function TaskProgress({ task }: { task: Task }) {
    const { streakPercentage, dailyGoalPercentage } = getProgressStats(task);
    return (
        <div className="p-6 rounded-xl bg-blue-600/20 border border-blue-400/30 shadow-lg">
            <div className="flex items-center justify-between mb-4">
                <div className="text-sm font-medium">
                    <span className="text-blue-300">Current Task:</span>
                    <span className="ml-2 text-blue-100">{task.text}</span>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-blue-500/20 text-blue-200 border-blue-400/30">
                        {task.metrics.currentStreak}
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
        </div>
    );
}

function getProgressStats(task: Task) {
    const dailyGoal = 4; // default daily goal
    const streakPercentage = Math.min((task.metrics.currentStreak / 4) * 100, 100);
    const dailyGoalPercentage = Math.min((task.metrics.completedPomodoros / dailyGoal) * 100, 100);
    return { streakPercentage, dailyGoalPercentage };
}

function getMotivationalMessage(streak: number) {
    if (streak === 0) return "Let's get started!";
    if (streak <= 2) return "Great start! Keep going!";
    if (streak <= 4) return "You're on fire!";
    return "Incredible streak! You're unstoppable!";
}

function PomodoroSettingsDialogComponent({
    open,
    onOpenChange,
    onSettingsUpdate,
    initialSettings,
    isActive,
    setTime,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSettingsUpdate: (newSettings: PomodoroSettings) => void;
    initialSettings: PomodoroSettings | null;
    isActive: boolean;
    setTime: (time: number) => void;
}): JSX.Element {
    const [workDuration, setWorkDuration] = useState(initialSettings?.work_duration || 25);
    const [breakDuration, setBreakDuration] = useState(initialSettings?.break_duration || 5);
    const [dailyGoal, setDailyGoal] = useState(initialSettings?.daily_goal || 4);
    const [autoStartPomodoros, setAutoStartPomodoros] = useState<boolean>(initialSettings?.auto_start_pomodoros ?? false);
    const [autoStartBreaks, setAutoStartBreaks] = useState<boolean>(initialSettings?.auto_start_breaks ?? false);
    const [soundEnabled, setSoundEnabled] = useState<boolean>(initialSettings?.sound_enabled ?? true);
    const [notificationEnabled, setNotificationEnabled] = useState<boolean>(initialSettings?.notification_enabled ?? true);
    const [longBreakDuration, setLongBreakDuration] = useState(initialSettings?.long_break_duration || 15);
    const [pomodorosUntilLongBreak, setPomodorosUntilLongBreak] = useState(initialSettings?.pomodoros_until_long_break || 4);

    const handleWorkDurationChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setWorkDuration(parseInt(event.target.value));
    };

    const handleBreakDurationChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setBreakDuration(parseInt(event.target.value)); 
    };

    const handleDailyGoalChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setDailyGoal(parseInt(event.target.value));
    };

    const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, checked } = e.target;
        switch (name) {
            case "autoStartPomodoros":
                setAutoStartPomodoros(checked);
                break;
            case "autoStartBreaks":
                setAutoStartBreaks(checked);
                break;
            case "soundEnabled":
                setSoundEnabled(checked);
                break;
            case "notificationEnabled":
                setNotificationEnabled(checked);
                break;
            default:
                break;
        }
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const newSettings: PomodoroSettings = {
            work_duration: workDuration,
            break_duration: breakDuration,
            daily_goal: dailyGoal,
            auto_start_pomodoros: autoStartPomodoros,
            auto_start_breaks: autoStartBreaks,
            sound_enabled: soundEnabled,
            notification_enabled: notificationEnabled,
            long_break_duration: longBreakDuration,
            pomodoros_until_long_break: pomodorosUntilLongBreak,
        };
        await onSettingsUpdate(newSettings);
        
        // Mettre à jour immédiatement le timer si inactif
        if (!isActive) {
            setTime(newSettings.work_duration * 60);
        }
        
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogTitle>Pomodoro Settings</DialogTitle>
            <DialogContent>
                <form onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        <div>
                            <Label>Work Duration (minutes)</Label>
                            <Input
                                type="number"
                                value={workDuration}
                                onChange={(e) => setWorkDuration(parseInt(e.target.value))}
                            />
                        </div>
                        <div>
                            <Label>Break Duration (minutes)</Label>
                            <Input
                                type="number"
                                value={breakDuration}
                                onChange={(e) => setBreakDuration(parseInt(e.target.value))}
                            />
                        </div>
                        <div>
                            <Label>Daily Goal (pomodoros)</Label>
                            <Input
                                type="number"
                                value={dailyGoal}
                                onChange={(e) => setDailyGoal(parseInt(e.target.value))}
                            />
                        </div>
                        <div>
                            <Label>Auto-Start Pomodoros</Label>
                            <Checkbox
                                checked={autoStartPomodoros}
                                onChange={(e) => setAutoStartPomodoros((e.target as HTMLInputElement).checked)}
                            />
                        </div>
                        <div>
                            <Label>Auto-Start Breaks</Label>
                            <Checkbox
                                checked={autoStartBreaks}
                                onChange={(e) => setAutoStartBreaks((e.target as HTMLInputElement).checked)}
                            />
                        </div>
                        <div>
                            <Label>Sound Enabled</Label>
                            <Checkbox
                                checked={soundEnabled}
                                onChange={(e) => setSoundEnabled((e.target as HTMLInputElement).checked)}
                            />
                        </div>
                        <div>
                            <Label>Notification Enabled</Label>
                            <Checkbox
                                checked={notificationEnabled}
                                onChange={(e) => setNotificationEnabled((e.target as HTMLInputElement).checked)}
                            />
                        </div>
                        <div>
                            <Label>Long Break Duration (minutes)</Label>
                            <Input
                                type="number"
                                value={longBreakDuration}
                                onChange={(e) => setLongBreakDuration(parseInt(e.target.value))}
                            />
                        </div>
                        <div>
                            <Label>Pomodoros Until Long Break</Label>
                            <Input
                                type="number"
                                value={pomodorosUntilLongBreak}
                                onChange={(e) => setPomodorosUntilLongBreak(parseInt(e.target.value))}
                            />
                        </div>
                    </div>
                    <Button type="submit" className="mt-4">Update Settings</Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}

export default PomodoroTimer;
