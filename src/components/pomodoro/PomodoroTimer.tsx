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
import { RefreshCwIcon } from 'lucide-react';

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
    const [soundEnabled, setSoundEnabled] = useState(settings?.sound_enabled || false);
    const [activeOscillator, setActiveOscillator] = useState<OscillatorNode | null>(null);
    const [activeGainNode, setActiveGainNode] = useState<GainNode | null>(null);
    const [oscillator, setOscillator] = useState<OscillatorNode | null>(null);
    const [isCompleted, setIsCompleted] = useState(false);
    const [pomodoroCount, setPomodoroCount] = useState(0); // Ajouter ce state
    const [lastSoundTime, setLastSoundTime] = useState<number>(0);
    const [isCompleting, setIsCompleting] = useState(false);

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

    // Audio state
    const [audioContextState, setAudioContextState] = useState<AudioContext | null>(null);
    const [soundEnabledState, setSoundEnabledState] = useState(settings?.sound_enabled || false);
    const [activeOscillatorState, setActiveOscillatorState] = useState<OscillatorNode | null>(null);
    const [activeGainNodeState, setActiveGainNodeState] = useState<GainNode | null>(null);

    // Sound control functions
    const stopSound = useCallback(() => {
        if (activeOscillatorState) {
            try {
                activeOscillatorState.stop();
                activeOscillatorState.disconnect();
            } catch (error) {
                console.error('Error stopping oscillator:', error);
            }
            setActiveOscillatorState(null);
        }
        if (activeGainNodeState) {
            try {
                activeGainNodeState.disconnect();
            } catch (error) {
                console.error('Error disconnecting gain node:', error);
            }
            setActiveGainNodeState(null);
        }
    }, [activeOscillatorState, activeGainNodeState]);

    // Initialize audio context
    useEffect(() => {
        let context: AudioContext | null = null;
        
        const initAudio = async () => {
            if (settings?.sound_enabled) {
                try {
                    context = new (window.AudioContext || (window as any).webkitAudioContext)();
                    await context.resume();
                    setAudioContextState(context);
                    setSoundEnabledState(true);
                } catch (error) {
                    console.error('Failed to create audio context:', error);
                    setSoundEnabledState(false);
                }
            } else {
                setSoundEnabledState(false);
            }
        };

        initAudio();

        return () => {
            if (context) {
                if (activeOscillatorState || activeGainNodeState) {
                    stopSound();
                }
                context.close().catch(console.error);
            }
        };
    }, [settings?.sound_enabled, stopSound, activeOscillatorState, activeGainNodeState]);

    const playSound = useCallback(async (frequency: number = 440, duration: number = 0.5) => {
        if (!soundEnabledState || !audioContextState || audioContextState.state === 'closed') {
            console.log('Sound disabled or context closed');
            return;
        }
        
        try {
            // Resume context if suspended
            if (audioContextState.state === 'suspended') {
                await audioContextState.resume();
            }

            // Stop any existing sound
            stopSound();

            const oscillator = audioContextState.createOscillator();
            const gainNode = audioContextState.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContextState.destination);
            
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(frequency, audioContextState.currentTime);
            
            gainNode.gain.setValueAtTime(0.1, audioContextState.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContextState.currentTime + duration);
            
            setActiveOscillatorState(oscillator);
            setActiveGainNodeState(gainNode);

            oscillator.start(audioContextState.currentTime);
            oscillator.stop(audioContextState.currentTime + duration);
            
            // Cleanup after duration
            setTimeout(() => {
                stopSound();
            }, duration * 1000 + 100);
            
        } catch (error) {
            console.error('Error playing sound:', error);
            stopSound();
        }
    }, [soundEnabledState, audioContextState, stopSound]);

    const handleTimerComplete = useCallback(async () => {
        try {
            // Play completion sound if enabled
            if (settings?.sound_enabled && audioContextState && Date.now() - lastSoundTime > 1000) {
                await playSound(440, 0.2);
                setLastSoundTime(Date.now());
            }

            // Handle task completion for work sessions
            if (!isBreak) {
                const currentTask = tasks.find(t => t.id === activeTaskId);
                const workDuration = settings?.work_duration || 25;
                
                // Update task metrics
                if (currentTask) {
                    const updatedTasks = tasks.map(task => {
                        if (task.id === activeTaskId) {
                            return {
                                ...task,
                                completed: true,
                                metrics: {
                                    totalMinutes: (task.metrics?.totalMinutes || 0) + workDuration,
                                    completedPomodoros: (task.metrics?.completedPomodoros || 0) + 1,
                                    currentStreak: (task.metrics?.currentStreak || 0) + 1
                                }
                            };
                        }
                        return task;
                    });
                    setTasks(updatedTasks);
                    localStorage.setItem('pomodoroTasks', JSON.stringify(updatedTasks));
                }

                // Update pomodoro stats
                const newStreak = streak + 1;
                const newPomodoroCount = pomodoroCount + 1;
                setStreak(newStreak);
                setPomodoroCount(newPomodoroCount);
                localStorage.setItem('pomodoroStreak', newStreak.toString());
                localStorage.setItem('lastPomodoroDate', new Date().toDateString());

                // Handle Supabase sync
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
            }

            // Show completion notification
            toast({
                title: isBreak ? "Break completed!" : "Pomodoro completed!",
                description: isBreak ? "Ready to focus again?" : "Time for a break!",
            });

            // Set up next session
            const nextIsBreak = !isBreak;
            const isLongBreak = nextIsBreak && 
                              settings?.pomodoros_until_long_break && 
                              pomodoroCount > 0 && 
                              pomodoroCount % (settings.pomodoros_until_long_break || 4) === 0;

            // Calculate next duration
            const nextDuration = nextIsBreak 
                ? (isLongBreak ? settings?.long_break_duration : settings?.break_duration) || 5
                : settings?.work_duration || 25;

            // Update session state
            setTime(nextDuration * 60);
            setIsBreak(nextIsBreak);

            // Only auto-start if explicitly enabled
            const shouldAutoStart = nextIsBreak 
                ? settings?.auto_start_breaks === true
                : settings?.auto_start_pomodoros === true;

            if (shouldAutoStart) {
                // Use a longer delay and add a notification sound
                setTimeout(() => {
                    if (settings?.sound_enabled) {
                        playSound(440, 0.2);
                    }
                    setIsActive(true);
                }, 2000);
            }

        } catch (error) {
            console.error('Error in handleTimerComplete:', error);
            stopSound();
            setIsActive(false);
            toast({
                title: "Error",
                description: "There was an error completing the session",
                variant: "destructive",
            });
        }
    }, [
        isBreak, settings, audioContextState, lastSoundTime,
        activeTaskId, currentPomodoroId, pomodoroCount,
        tasks, streak, completePomodoro, getPomodoroStats,
        playSound
    ]);

    const onButtonClick = useCallback((event: React.FormEvent<HTMLButtonElement>) => {
        const buttonName = event.currentTarget.name;
        
        switch (buttonName) {
            case 'start':
            case 'pause':
                if (time === 0) {
                    // Reset timer based on current mode
                    const duration = !isBreak 
                        ? settings?.work_duration || 25 
                        : settings?.break_duration || 5;
                    setTime(duration * 60);
                }
                setIsActive(prev => !prev);
                // Stop sound when pausing
                if (isActive) {
                    stopSound();
                }
                break;
                
            case 'reset':
                // Stop the timer and sound
                setIsActive(false);
                stopSound();
                
                // Reset to current mode duration
                const duration = !isBreak 
                    ? settings?.work_duration || 25 
                    : settings?.break_duration || 5;
                setTime(duration * 60);
                break;
                
            case 'skip':
                handleTimerComplete();
                break;
                
            case 'settings':
                setSettingsOpen(true);
                break;
        }
    }, [time, isBreak, settings, handleTimerComplete, stopSound, isActive]);

    // Timer worker logic
    useEffect(() => {
        let workerInstance: Worker | undefined = undefined;
        
        const initializeWorker = () => {
            const worker = new Worker(new URL('./timerWorker.js', import.meta.url));
            worker.onmessage = (e) => {
                if (e.data.type === 'tick') {
                    setTime(prevTime => {
                        const newTime = Math.max(0, prevTime - 1);
                        if (newTime === 0 && prevTime > 0 && isActive) {
                            worker.postMessage({ command: 'stop' });
                            setIsActive(false);
                            stopSound();
                            handleTimerComplete();
                        }
                        return newTime;
                    });
                }
            };
            return worker;
        };

        if (isActive && time > 0) {
            try {
                workerInstance = initializeWorker();
                workerInstance.postMessage({ command: 'start' });
            } catch (error) {
                console.error('Error initializing timer worker:', error);
                setIsActive(false);
                stopSound();
            }
        }

        return () => {
            if (workerInstance) {
                workerInstance.terminate();
            }
            if (isActive) {
                stopSound();
            }
        };
    }, [isActive, time, stopSound, handleTimerComplete]);

    // Initial Supabase state load
    useEffect(() => {
        const loadInitialState = async () => {
            if (!user) return;

            try {
                const { data, error } = await supabase
                    .from('pomodoros')
                    .select()
                    .eq('user_id', user.id)
                    .eq('completed', false)
                    .order('created_at', { ascending: false })
                    .limit(1);

                if (error) throw error;

                const pomodoro = data && data.length > 0 ? data[0] : null;

                if (pomodoro) {
                    setCurrentPomodoroId(pomodoro.id);
                    setTime(pomodoro.current_time || (settings?.work_duration || 25) * 60);
                    setIsBreak(pomodoro.is_break || false);
                    setIsActive(false); // Don't auto-start
                } else {
                    // Create new pomodoro if none exists
                    const { data: newPomodoro, error: createError } = await supabase
                        .from('pomodoros')
                        .insert([{
                            user_id: user.id,
                            current_time: (settings?.work_duration || 25) * 60,
                            is_break: false,
                            completed: false,
                            created_at: new Date().toISOString()
                        }])
                        .select()
                        .single();

                    if (createError) throw createError;

                    if (newPomodoro) {
                        setCurrentPomodoroId(newPomodoro.id);
                        setTime((settings?.work_duration || 25) * 60);
                        setIsBreak(false);
                        setIsActive(false);
                    }
                }
            } catch (error: any) {
                console.error('Error loading initial state:', error);
                // Set default state on error
                setTime((settings?.work_duration || 25) * 60);
                setIsBreak(false);
                setIsActive(false);
            }
        };

        loadInitialState();
    }, [user, settings?.work_duration]);

    // Update Supabase state
    const updateSupabaseState = useCallback(async () => {
        if (!user || !currentPomodoroId) return;

        try {
            const { error } = await supabase
                .from('pomodoros')
                .update({
                    current_time: time,
                    is_active: isActive,
                    is_break: isBreak,
                    last_updated: new Date().toISOString()
                })
                .eq('id', currentPomodoroId)
                .select()
                .single();

            if (error) throw error;
        } catch (error) {
            console.error('Error updating Supabase state:', error);
        }
    }, [user, currentPomodoroId, time, isActive, isBreak]);

    // Sync interval
    useEffect(() => {
        if (!isActive || !currentPomodoroId) return;

        const syncInterval = setInterval(updateSupabaseState, 30000);
        updateSupabaseState(); // Initial sync

        return () => clearInterval(syncInterval);
    }, [updateSupabaseState, isActive, currentPomodoroId]);

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

    useEffect(() => {
        if (tasks && tasks.length > 0) {
            localStorage.setItem('pomodoroTasks', JSON.stringify(tasks));
        }
    }, [tasks]);

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
                                                    {formatTotalTime(task.metrics?.totalMinutes || 0)}
                                                </span>
                                                <span>*</span>
                                                <span className="flex items-center gap-1">
                                                    <Target className="w-3 h-3" />
                                                    {task.metrics?.completedPomodoros || 0} pomodoros
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
                        totalTime={
                            !isBreak
                                ? (settings?.work_duration || 25) * 60
                                : (settings?.break_duration || 5) * 60
                        }
                        isBreak={isBreak}
                    />
                </div>
                <div className="flex justify-center space-x-4">
                    <Button
                        name={isActive ? 'pause' : 'start'}
                        onClick={onButtonClick}
                        variant={isActive ? "destructive" : "default"}
                        className="w-24"
                    >
                        {isActive ? (
                            <><PauseIcon className="h-4 w-4 mr-2" /> Stop</>
                        ) : (
                            <><PlayIcon className="h-4 w-4 mr-2" /> Start</>
                        )}
                    </Button>
                    <Button
                        name="reset"
                        onClick={onButtonClick}
                        variant="outline"
                        className="w-24"
                        disabled={isActive}
                    >
                        <RefreshCwIcon className="h-4 w-4 mr-2" /> Reset
                    </Button>
                    <Button
                        name="settings"
                        onClick={onButtonClick}
                        variant="outline"
                        className="w-10"
                    >
                        <Settings2Icon className="h-4 w-4" />
                    </Button>
                </div>
                {activeTaskId && (
                    <TaskProgress 
                        task={tasks.find(t => t.id === activeTaskId)!} 
                        settings={settings}
                    />
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
function getProgressStats(task: Task | null | undefined, settings?: PomodoroSettings | null) {
    if (!task) {
        return { streakPercentage: 0, dailyGoalPercentage: 0 };
    }
    const dailyGoal = settings?.daily_goal || 8;
    const metrics = task.metrics || { currentStreak: 0, completedPomodoros: 0, totalMinutes: 0 };
    const streakPercentage = Math.min((metrics.currentStreak / 4) * 100, 100);
    const dailyGoalPercentage = Math.min((metrics.completedPomodoros / dailyGoal) * 100, 100);
    return { streakPercentage, dailyGoalPercentage };
}

// Modifier le composant TaskProgress pour recevoir les settings
function TaskProgress({ task, settings }: { task: Task | null | undefined; settings: PomodoroSettings | null }) {
    if (!task) {
        return null;
    }
    
    const { streakPercentage, dailyGoalPercentage } = getProgressStats(task, settings);
    const metrics = task.metrics || { currentStreak: 0, completedPomodoros: 0, totalMinutes: 0 };
    
    return (
        <div className="p-6 rounded-xl bg-blue-600/20 border border-blue-400/30 shadow-lg">
            <div className="flex items-center justify-between mb-4">
                <div className="text-sm font-medium">
                    <span className="text-blue-300">Current Task:</span>
                    <span className="ml-2 text-blue-100">{task.text}</span>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-blue-500/20 text-blue-200 border-blue-400/30">
                        {metrics.currentStreak}
                    </Badge>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-6">
                <div className="text-center p-4 rounded-lg bg-blue-500/10 relative overflow-hidden">
                    <div className="relative z-10">
                        <div className="text-3xl font-bold text-blue-100 mb-1">
                            {metrics.currentStreak}
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
                    {getMotivationalMessage(metrics.currentStreak)}
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
