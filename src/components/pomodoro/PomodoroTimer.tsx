// Global type declaration for WebKit Audio Context
declare global {
    interface Window {
        webkitAudioContext: typeof AudioContext;
    }
}

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
import { supabase } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/database';

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

export function PomodoroTimer({ onSessionComplete }: PomodoroTimerProps) {
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
    const [pomodoroCount, setPomodoroCount] = useState(0);
    const [lastSoundTime, setLastSoundTime] = useState<number>(0);

    // Initialize audio context
    useEffect(() => {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            setAudioContext(new AudioContext());
        } catch (error) {
            console.error('Web Audio API is not supported in this browser');
        }
    }, []);

    // Load settings on mount
    useEffect(() => {
        const loadSettings = async () => {
            try {
                if (user) {
                    const userSettings = await getPomodoroSettings();
                    if (userSettings) {
                        setSettings(userSettings);
                        setTime(userSettings.work_duration * 60);
                    }
                } else {
                    const savedSettings = localStorage.getItem('pomodoroSettings');
                    if (savedSettings) {
                        const parsedSettings = JSON.parse(savedSettings);
                        setSettings(parsedSettings);
                        setTime(parsedSettings.work_duration * 60);
                    }
                }
            } catch (error) {
                console.error('Error loading settings:', error);
            }
        };
        loadSettings();
    }, [user]);

    // Load tasks on mount
    useEffect(() => {
        const loadTasks = async () => {
            try {
                const savedTasks = localStorage.getItem('pomodoroTasks');
                if (savedTasks) {
                    const parsedTasks = JSON.parse(savedTasks);
                    const tasksWithMetrics = parsedTasks.map((task: any) => ({
                        id: task.id || crypto.randomUUID(),
                        text: task.text || '',
                        completed: task.completed || false,
                        progress: task.progress || 0,
                        metrics: {
                            totalMinutes: task.metrics?.totalMinutes || 0,
                            completedPomodoros: task.metrics?.completedPomodoros || 0,
                            currentStreak: task.metrics?.currentStreak || 0
                        }
                    }));
                    setTasks(tasksWithMetrics);
                }
            } catch (error) {
                console.error('Error loading tasks:', error);
                setTasks([]);
            }
        };
        loadTasks();
    }, []);

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

    const handleTimerComplete = useCallback(async () => {
        setIsActive(false);
        
        // Play completion sound if enabled in settings
        if (settings?.sound_enabled && audioContext && Date.now() - lastSoundTime > 500) {
            await playGoalAchievedSound(audioContext);
            setLastSoundTime(Date.now());
        }

        if (!isBreak) {
            // Handle work session completion
            updateStreak();
            setPomodoroCount(prev => prev + 1);
            
            // Update task metrics and mark as complete
            if (activeTaskId) {
                setTasks(prevTasks =>
                    prevTasks.map(task => {
                        if (task.id === activeTaskId) {
                            const workDuration = settings?.work_duration || 25;
                            const updatedTask = {
                                ...task,
                                completed: true,
                                metrics: {
                                    totalMinutes: task.metrics.totalMinutes + workDuration,
                                    completedPomodoros: task.metrics.completedPomodoros + 1,
                                    currentStreak: task.metrics.currentStreak + 1
                                }
                            };
                            // Save to localStorage immediately
                            const updatedTasks = prevTasks.map(t => t.id === activeTaskId ? updatedTask : t);
                            localStorage.setItem('pomodoroTasks', JSON.stringify(updatedTasks));
                            return updatedTask;
                        }
                        return task;
                    })
                );
            }
            
            if (currentPomodoroId) {
                try {
                    await completePomodoro(currentPomodoroId);
                    const newStats = await getPomodoroStats();
                    setStats(newStats);
                } catch (error) {
                    console.error('Error completing pomodoro:', error);
                    const failedCompletions = JSON.parse(localStorage.getItem('failedPomodoroCompletions') || '[]');
                    failedCompletions.push({ pomodoroId: currentPomodoroId });
                    localStorage.setItem('failedPomodoroCompletions', JSON.stringify(failedCompletions));
                }
            }
            
            toast({
                title: "Pomodoro completed!",
                description: "Time for a break!",
            });
        } else {
            toast({
                title: "Break completed!",
                description: "Ready to focus again?",
            });
        }
        
        // Toggle between work and break
        setIsBreak(!isBreak);
        
        // Determine next session duration
        const nextIsBreak = !isBreak;
        const isLongBreak = nextIsBreak && settings?.pomodoros_until_long_break && 
                           pomodoroCount > 0 && pomodoroCount % settings.pomodoros_until_long_break === 0;
        
        if (nextIsBreak) {
            const breakDuration = isLongBreak ? settings?.long_break_duration : settings?.break_duration;
            setTime((breakDuration ?? 5) * 60);
            // Auto-start break if enabled
            if (settings?.auto_start_breaks) {
                setIsActive(true);
            }
        } else {
            setTime((settings?.work_duration ?? 25) * 60);
            // Auto-start work session if enabled
            if (settings?.auto_start_pomodoros) {
                setIsActive(true);
            }
            startNewPomodoro();
        }
        
    }, [isBreak, currentPomodoroId, audioContext, lastSoundTime, settings, updateStreak, pomodoroCount]);

    // Sync with Supabase periodically
    useEffect(() => {
        const syncWithServer = async () => {
            if (!user) return;
            
            try {
                // Only sync if we have an active pomodoro
                if (currentPomodoroId && isActive) {
                    const { error } = await supabase
                        .from('pomodoros')
                        .update({
                            current_time: time,
                            is_active: isActive,
                            is_break: isBreak,
                            last_update: new Date().toISOString()
                        })
                        .eq('id', currentPomodoroId);

                    if (error) {
                        console.error('Error syncing with Supabase:', error);
                    }
                }
            } catch (error) {
                console.error('Error in sync operation:', error);
            }
        };

        const syncInterval = setInterval(syncWithServer, 10000); // Sync every 10 seconds
        return () => clearInterval(syncInterval);
    }, [user, currentPomodoroId, time, isActive, isBreak]);

    // Load initial state from Supabase
    useEffect(() => {
        const loadFromServer = async () => {
            if (!user) return;

            try {
                const { data: activePomodoro, error } = await supabase
                    .from('pomodoros')
                    .select('*')
                    .eq('user_id', user.id)
                    .eq('completed', false)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single();

                if (error) {
                    if (error.code !== 'PGRST116') { // No rows returned
                        console.error('Error loading from Supabase:', error);
                    }
                    return;
                }

                if (activePomodoro) {
                    setCurrentPomodoroId(activePomodoro.id);
                    setIsBreak(activePomodoro.is_break);
                    // Don't auto-start, just set the remaining time
                    setTime(activePomodoro.current_time);
                }
            } catch (error) {
                console.error('Error in initial load:', error);
            }
        };

        loadFromServer();
    }, [user]);

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
                    if (newTime === 0 && isActive) {
                        worker.postMessage({ command: 'stop' });
                        handleTimerComplete();
                    }
                    return newTime;
                });
            }
        };
        
        if (isActive && time > 0) {
            worker.postMessage({ command: 'start' });
        } else if (time === 0 || !isActive) {
            worker.postMessage({ command: 'stop' });
        }
        
        return () => {
            worker.terminate();
        };
    }, [isActive, handleTimerComplete, time]);

    // Handle visibility change and page refresh
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                // Store the current state and timestamp when tab becomes hidden
                const stateToStore = {
                    time,
                    isActive,
                    isBreak,
                    currentPomodoroId,
                    activeTaskId,
                    timestamp: Date.now(),
                    settings
                };
                localStorage.setItem('pomodoroBackgroundState', JSON.stringify(stateToStore));
            } else if (document.visibilityState === 'visible') {
                // Restore state and calculate elapsed time when tab becomes visible
                const storedState = localStorage.getItem('pomodoroBackgroundState');
                if (storedState) {
                    const parsedState = JSON.parse(storedState);
                    if (parsedState.isActive) {
                        const elapsedSeconds = Math.floor((Date.now() - parsedState.timestamp) / 1000);
                        const newTime = Math.max(0, parsedState.time - elapsedSeconds);
                        
                        setTime(newTime);
                        // Only set active if there's still time remaining
                        setIsActive(newTime > 0);
                        setIsBreak(parsedState.isBreak);
                        setCurrentPomodoroId(parsedState.currentPomodoroId);
                        setActiveTaskId(parsedState.activeTaskId);
                        
                        // Only handle timer complete if we just reached zero
                        if (newTime === 0 && parsedState.time > 0) {
                            handleTimerComplete();
                        }
                    }
                }
            }
        };

        // Handle initial page load
        const loadInitialState = () => {
            const storedState = localStorage.getItem('pomodoroBackgroundState');
            if (storedState) {
                const parsedState = JSON.parse(storedState);
                if (parsedState.isActive) {
                    const elapsedSeconds = Math.floor((Date.now() - parsedState.timestamp) / 1000);
                    const newTime = Math.max(0, parsedState.time - elapsedSeconds);
                    
                    setTime(newTime);
                    // Only set active if there's still time remaining
                    setIsActive(newTime > 0);
                    setIsBreak(parsedState.isBreak);
                    setCurrentPomodoroId(parsedState.currentPomodoroId);
                    setActiveTaskId(parsedState.activeTaskId);
                    
                    // Only handle timer complete if we just reached zero
                    if (newTime === 0 && parsedState.time > 0) {
                        handleTimerComplete();
                    }
                }
            }
        };

        // Load state on mount
        loadInitialState();

        // Add visibility change listener
        document.addEventListener('visibilitychange', handleVisibilityChange);
        
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [time, isActive, isBreak, currentPomodoroId, activeTaskId, settings, handleTimerComplete]);

    // Load persisted state function
    const loadPersistedState = useCallback(() => {
        const persistedState = localStorage.getItem(`pomodoroState-${currentPomodoroId}`);
        if (persistedState) {
            const parsedState = JSON.parse(persistedState);
            const currentTime = new Date().getTime();
            const timeDiff = Math.floor((currentTime - parsedState.timestamp) / 1000);
            const newTime = Math.max(0, parsedState.time - timeDiff);
            
            setTime(newTime);
            setIsActive(parsedState.isActive);
            setIsBreak(parsedState.isBreak);
            setCurrentPomodoroId(parsedState.currentPomodoroId);
            setActiveTaskId(parsedState.activeTaskId);
            
            // Only handle timer complete if we just reached zero
            if (newTime === 0 && parsedState.time > 0) {
                handleTimerComplete();
            }
        }
    }, [currentPomodoroId, handleTimerComplete, setTime, setIsActive, setIsBreak, setCurrentPomodoroId, setActiveTaskId]);

    // Load persisted state on mount
    useEffect(() => {
        loadPersistedState();
    }, [currentPomodoroId, handleTimerComplete, setTime]);

    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && isActive) {
                // Refresh the timer state when tab becomes visible
                loadPersistedState();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [isActive, loadPersistedState]);

    useEffect(() => {
        const loadTasks = async () => {
            try {
                const savedTasks = localStorage.getItem('pomodoroTasks');
                if (savedTasks) {
                    const parsedTasks = JSON.parse(savedTasks);
                    const tasksWithMetrics = parsedTasks.map((task: any) => ({
                        id: task.id || crypto.randomUUID(),
                        text: task.text || '',
                        completed: task.completed || false,
                        progress: task.progress || 0,
                        metrics: {
                            totalMinutes: task.metrics?.totalMinutes || 0,
                            completedPomodoros: task.metrics?.completedPomodoros || 0,
                            currentStreak: task.metrics?.currentStreak || 0
                        }
                    }));
                    setTasks(tasksWithMetrics);
                }
            } catch (error) {
                console.error('Error loading tasks:', error);
                // Initialize with empty array if there's an error
                setTasks([]);
            }
        };
        
        loadTasks();
    }, []);

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
        setTasks(prev => {
            const updatedTasks = [...prev, newTask];
            localStorage.setItem('pomodoroTasks', JSON.stringify(updatedTasks));
            return updatedTasks;
        });
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
            prevTasks.map(task => {
                if (task.id === id) {
                    // Only update metrics when manually completing a task
                    const updatedTask = { 
                        ...task, 
                        completed: !task.completed 
                    };
                    // Save to localStorage immediately after update
                    const updatedTasks = prevTasks.map(t => t.id === id ? updatedTask : t);
                    localStorage.setItem('pomodoroTasks', JSON.stringify(updatedTasks));
                    return updatedTask;
                }
                return task;
            })
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

    const playTimerSound = useCallback(() => {
        if (!settings?.sound_enabled) return;
        
        const now = Date.now();
        if (now - lastSoundTime < 1000) return;
        setLastSoundTime(now);
        
        const audio = new Audio('/notification.mp3');
        audio.play().catch(console.error);
        
        if (settings?.notification_enabled && Notification.permission === 'granted') {
            new Notification('Pomodoro Timer', {
                body: isBreak ? 'Break time is over!' : 'Time to take a break!',
                icon: '/favicon.ico'
            });
        }
    }, [settings, isBreak, lastSoundTime]);

    const playSound = useCallback(async (frequency: number = 440, duration: number = 0.5) => {
        if (!settings?.sound_enabled) return;
        
        try {
            const context = new (window.AudioContext || (window as any).webkitAudioContext)();
            const oscillator = context.createOscillator();
            const gainNode = context.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(context.destination);
            
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(frequency, context.currentTime);
            
            gainNode.gain.setValueAtTime(0.1, context.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + duration);
            
            oscillator.start(context.currentTime);
            oscillator.stop(context.currentTime + duration);
            
            // Clean up
            setTimeout(() => {
                context.close();
            }, duration * 1000 + 500);
            
        } catch (error) {
            console.error('Error playing sound:', error);
        }
    }, [settings]);

    const playGoalAchievedSound = async (context: AudioContext) => {
        if (!settings?.sound_enabled) return;
        
        try {
            const oscillator = context.createOscillator();
            const gainNode = context.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(context.destination);
            
            // Configure sound
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(880, context.currentTime); // A5 note
            
            // Configure volume envelope
            gainNode.gain.setValueAtTime(0, context.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.5, context.currentTime + 0.1);
            gainNode.gain.linearRampToValueAtTime(0, context.currentTime + 0.5);
            
            // Play sound
            oscillator.start();
            oscillator.stop(context.currentTime + 0.5);
        } catch (error) {
            console.error('Error playing sound:', error);
        }
    };

    const playSessionEndSound = useCallback(() => {
        // Different sounds for focus and break
        if (isBreak) {
            playSound(392, 0.3); // G4 - gentler sound for break end
        } else {
            playSound(523.25, 0.3); // C5 - brighter sound for focus end
        }
    }, [isBreak, playSound]);

    useEffect(() => {
        if (time === 0 && isActive) {
            playSessionEndSound();
            if (settings?.notification_enabled) {
                if (Notification.permission === 'granted') {
                    new Notification('Pomodoro Timer', {
                        body: isBreak ? 'Break time is over!' : 'Time to take a break!',
                        icon: 'favicon.ico'
                    });
                }
            }
        }
    }, [time, isActive, isBreak, settings, playSessionEndSound]);

    const skipCurrentInterval = () => {
        if (!isActive) return;
        
        // Complete current pomodoro if it exists
        if (currentPomodoroId) {
            completePomodoro(currentPomodoroId);
            setCurrentPomodoroId(null);
        }
        
        // Toggle break state and start new session
        setIsBreak(!isBreak);
        setTime(0);
        startNewPomodoro(!isBreak ? 'break' : 'work');
    };

    const handleButtonClick = (event: React.FormEvent<HTMLButtonElement>) => {
        const action = event.currentTarget.name;
        switch (action) {
            case 'start':
                toggleTimer();
                break;
            case 'pause':
                setIsActive(false);
                break;
            case 'skip':
                skipCurrentInterval();
                break;
        }
    };

    // Ajouter useEffect pour réinitialiser le compteur quotidien
    useEffect(() => {
        const checkNewDay = () => {
            const lastPomodoro = localStorage.getItem('lastPomodoroDate');
            const today = new Date().toDateString();
            
            if (lastPomodoro !== today) {
                setPomodoroCount(0);
                localStorage.setItem('lastPomodoroDate', today);
            }
        };
        
        checkNewDay();
        const interval = setInterval(checkNewDay, 60000); // Vérifier toutes les minutes
        
        return () => clearInterval(interval);
    }, []);

    const startNewPomodoro = async (type: 'work' | 'break' | 'long_break' = 'work') => {
        try {
            if (!settings || !activeTaskId) {
                toast({
                    title: 'Error',
                    description: 'Please select a task first',
                    variant: 'destructive',
                });
                return;
            }
    
            // Nettoyer d'abord tout pomodoro actif
            if (currentPomodoroId) {
                try {
                    await completePomodoro(currentPomodoroId);
                    setCurrentPomodoroId(null);
                } catch (error) {
                    console.error('Error completing previous pomodoro:', error);
                }
            }
    
            // Vérifier et ajuster le type de pause
            let pomodoroType = type;
            if (type === 'break') {
                const completedPomodoros = tasks.find(t => t.id === activeTaskId)?.metrics.completedPomodoros || 0;
                // Corriger la condition pour la pause longue (maintenant correctement à partir du nombre défini)
                const shouldBeLongBreak = completedPomodoros > 0 && 
                    completedPomodoros % settings.pomodoros_until_long_break === 0;
                pomodoroType = shouldBeLongBreak ? 'long_break' : 'break';
            }
    
            // S'assurer que le type est valide pour la base de données
            const validType = pomodoroType === 'long_break' ? 'break' : pomodoroType;
    
            const pomodoro = await startPomodoro(validType);
            setCurrentPomodoroId(pomodoro.id);
            setIsActive(true);
    
            // Mettre à jour le temps en fonction du type réel
            const duration = pomodoroType === 'long_break' 
                ? settings.long_break_duration 
                : pomodoroType === 'break' 
                    ? settings.break_duration 
                    : settings.work_duration;
            setTime(duration * 60);
    
        } catch (error) {
            console.error('Error starting Pomodoro:', error);
            toast({
                title: 'Error',
                description: 'Failed to start Pomodoro session. Please try again.',
                variant: 'destructive',
            });
            // Réinitialiser l'état en cas d'erreur
            setIsActive(false);
            setCurrentPomodoroId(null);
        }
    };

    const toggleTimer = async () => {
        if (!isActive) {
            await startNewPomodoro(isBreak ? 'break' : 'work');
        } else {
            setIsActive(false);
        }
    };

    // Save state whenever important values change
    useEffect(() => {
        const state = {
            time,
            isActive,
            isBreak,
            currentPomodoroId,
            lastUpdate: new Date('2024-12-28T19:17:20+01:00').toISOString()
        };
        localStorage.setItem('pomodoroState', JSON.stringify(state));
    }, [time, isActive, isBreak, currentPomodoroId]);

    // Save tasks whenever they change
    useEffect(() => {
        localStorage.setItem('pomodoroTasks', JSON.stringify(tasks));
    }, [tasks]);

    return (
        <div className="pomodoro-container">
            <Card className="p-4 md:p-6 max-w-md mx-auto backdrop-blur-sm bg-slate-900/90 border-slate700/30 shadow-2xl">
                <div className="pomodoro-timer space-y-6 md:space-y-8">
                    <div className="relative">
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full shadow-lg">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full animate-pulse bg-blue-500" />
                                <span className="text-sm font-medium text-blue-100">
                                    {isBreak ? "Break Time" : "Focus Time"}
                                </span>
                            </div>
                        </div>
                        
                        <TimerDisplay 
                            time={time}
                            isActive={isActive}
                            totalTime={settings ? (isBreak ? settings.break_duration * 60 : settings.work_duration * 60) : 25 * 60}
                            isBreak={isBreak}
                        />

                        <div className="flex justify-center gap-4 mt-6">
                            <Button
                                onClick={() => {
                                    if (isActive) {
                                        setIsActive(false);
                                    } else {
                                        setIsActive(true);
                                        if (!currentPomodoroId) {
                                            startNewPomodoro();
                                        }
                                    }
                                }}
                                className={cn(
                                    "bg-blue-500 hover:bg-blue-600 text-white shadow-lg",
                                    isActive ? "bg-red-500 hover:bg-red-600" : ""
                                )}
                            >
                                {isActive ? <PauseIcon /> : <PlayIcon />}
                            </Button>
                            
                            <Button
                                onClick={() => {
                                    if (window.confirm('Are you sure you want to skip the current session?')) {
                                        handleTimerComplete();
                                    }
                                }}
                                className="bg-slate-700 hover:bg-slate-600 text-white"
                                disabled={!isActive}
                            >
                                <SkipForwardIcon />
                            </Button>
                            
                            <Button
                                onClick={() => setSettingsOpen(true)}
                                className="bg-slate-700 hover:bg-slate-600 text-white"
                            >
                                <Settings2Icon />
                            </Button>
                        </div>
                    </div>

                    <div className="task-section mt-8">
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

                        {tasks.length > 0 ? (
                            <>
                                <div className="flex justify-between items-center mb-4">
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

                                <ul className="space-y-2">
                                    {tasks
                                        .filter(task => showCompletedTasks || !task.completed)
                                        .map(task => (
                                            <li key={task.id} className="flex items-center gap-3 p-4 rounded-xl transition-all duration-200">
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
                                                    {task.metrics && (
                                                        <div className="text-xs text-blue-200 mt-1">
                                                            {formatTotalTime(task.metrics.totalMinutes)} · {task.metrics.completedPomodoros} pomodoros
                                                        </div>
                                                    )}
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => removeTask(task.id)}
                                                    className="text-slate-400 hover:text-red-400"
                                                >
                                                    <X className="w-4 h-4" />
                                                </Button>
                                            </li>
                                        ))}
                                </ul>
                            </>
                        ) : (
                            <div className="text-center text-slate-400 py-8">
                                No tasks yet. Add your first task to get started!
                            </div>
                        )}
                    </div>
                </div>
            </Card>

            <PomodoroSettingsDialog
                open={settingsOpen}
                onOpenChange={setSettingsOpen}
                initialSettings={settings}
                onSettingsUpdate={async (newSettings) => {
                    setSettings(newSettings);
                    setTime(newSettings.work_duration * 60);
                    if (user) {
                        await updatePomodoroSettings(newSettings);
                    } else {
                        localStorage.setItem('pomodoroSettings', JSON.stringify(newSettings));
                    }
                }}
                isActive={isActive}
                setTime={setTime}
            />
        </div>
    );
}

function TimerDisplay({ time, isActive, totalTime, isBreak }: { time: number; isActive: boolean; totalTime: number; isBreak: boolean }) {
    const minutes = Math.floor(time / 60) || 0;
    const seconds = time % 60 || 0;
    const progress = totalTime > 0 ? ((totalTime - time) / totalTime) * 100 : 0;
    const circumference = 2 * Math.PI * 120;
    
    // État local pour suivre le type de période
    const [periodType, setPeriodType] = useState<'Focus' | 'Break'>('Focus');

    // Effet pour mettre à jour le type de période quand isBreak change
    useEffect(() => {
        setPeriodType(isBreak ? 'Break' : 'Focus');
    }, [isBreak]);

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
                <AnimatePresence mode="wait">
                    <motion.span
                        key={periodType} // Utiliser periodType comme clé pour l'animation
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        transition={{ duration: 0.2 }}
                        className="text-sm font-medium mt-4"
                    >
                        {`${periodType} Time`}
                    </motion.span>
                </AnimatePresence>
            </div>
        </div>
    );
}

// Modifier la fonction getProgressStats pour utiliser le daily_goal des settings
function getProgressStats(task: Task, settings?: PomodoroSettings | null) {
    const dailyGoal = settings?.daily_goal || 8; // Utiliser la valeur des settings ou 8 par défaut
    const streakPercentage = Math.min((task.metrics.currentStreak / 4) * 100, 100);
    const dailyGoalPercentage = Math.min((task.metrics.completedPomodoros / dailyGoal) * 100, 100);
    return { streakPercentage, dailyGoalPercentage };
}

// Modifier le composant TaskProgress pour recevoir les settings
function TaskProgress({ task, settings }: { task: Task; settings: PomodoroSettings | null }) {
    const { streakPercentage, dailyGoalPercentage } = getProgressStats(task, settings);
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
            <DialogContent aria-describedby="settings-description">
                <div id="settings-description" className="sr-only">
                    Configure your Pomodoro timer settings including work duration, break duration, and other preferences
                </div>
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
