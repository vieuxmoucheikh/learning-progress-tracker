import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import Progress from '@/components/ui/progress';
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label"; // Update import to use named export
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogTitle, DialogContent } from '@radix-ui/react-dialog';
import {
    startPomodoro,
    completePomodoro,
    getPomodoroSettings,
    getPomodoroStats,
    updatePomodoroSettings,
    getPomodoroTasks,
    createPomodoroTask,
    updatePomodoroTask,
    deletePomodoroTask
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

// Define interfaces
interface Task {
    id: string;
    text: string;
    completed: boolean;
    metrics: {
        totalMinutes: number;
        completedPomodoros: number;
        currentStreak: number;
    };
    user_id?: string;
    created_at?: string;
    updated_at?: string;
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

interface FailedCompletion {
    pomodoroId: string;
    timestamp: string;
}

// Ajouter une fonction pour le son de célébration
const playGoalAchievedSound = async (audioContext: AudioContext) => {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Séquence de notes joyeuses
    const notes = [523.25, 659.25, 783.99, 1046.50]; // Do, Mi, Sol, Do (octave supérieure)
    const startTime = audioContext.currentTime;
    
    notes.forEach((freq, index) => {
      const noteOscillator = audioContext.createOscillator();
      const noteGain = audioContext.createGain();
      
      noteOscillator.connect(noteGain);
      noteGain.connect(audioContext.destination);
      
      noteOscillator.frequency.value = freq;
      noteGain.gain.value = 0.1;
      
      noteOscillator.start(startTime + index * 0.2);
      noteOscillator.stop(startTime + (index * 0.2) + 0.2);
    });
    
    return new Promise(resolve => setTimeout(resolve, notes.length * 200));
  };

// Helper function to format total time
function formatTotalTime(totalMinutes: number): string {
    if (totalMinutes < 60) { 
        return `${totalMinutes}m`;
    }
    
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    if (minutes === 0) {
        return `${hours}h`;
    } 
    
    return `${hours}h ${minutes}m`;
}

// Helper function to get motivational messages based on streak
function getMotivationalMessage(streak: number): string {
    if (streak === 0) return "Let's get started!";
    if (streak <= 2) return "Great start! Keep going!";
    if (streak <= 4) return "You're on fire!";
    return "Incredible streak! You're unstoppable!";
}

// Helper function to calculate progress stats
function getProgressStats(task: Task, settings?: PomodoroSettings | null) {
    const dailyGoal = settings?.daily_goal || 8; // Utiliser la valeur des settings ou 8 par défaut
    
    // Check if metrics exists before accessing its properties
    if (!task.metrics) {
        return { streakPercentage: 0, dailyGoalPercentage: 0 };
    }
    
    const streakPercentage = Math.min((task.metrics.currentStreak / 4) * 100, 100);
    const dailyGoalPercentage = Math.min((task.metrics.completedPomodoros / dailyGoal) * 100, 100);
    return { streakPercentage, dailyGoalPercentage };
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
    const [pomodoroCount, setPomodoroCount] = useState(0); // Ajouter ce state
    const timerWorkerRef = useRef<Worker | null>(null);

    // Load tasks from Supabase on mount
    useEffect(() => {
        const loadTasks = async () => {
            try {
                // Only attempt to load tasks if user is authenticated
                if (user) {
                    const supabaseTasks = await getPomodoroTasks();
                    if (supabaseTasks && supabaseTasks.length > 0) {
                        // Convert PomodoroTask[] to Task[]
                        const convertedTasks: Task[] = supabaseTasks.map(task => ({
                            id: task.id,
                            text: task.text,
                            completed: task.completed,
                            metrics: task.metrics,
                            user_id: task.user_id,
                            created_at: task.created_at,
                            updated_at: task.updated_at,
                        }));
                        setTasks(convertedTasks);
                        console.log("Tasks loaded from Supabase:", convertedTasks);
                    } else {
                        // Migrate from localStorage if available
                        const savedTasks = localStorage.getItem('pomodoroTasks');
                        if (savedTasks) {
                            const parsedTasks = JSON.parse(savedTasks);
                            const tasksWithMetrics = parsedTasks.map((task: any) => ({
                                id: task.id,
                                text: task.text,
                                completed: task.completed,
                                metrics: task.metrics || {
                                    totalMinutes: 0,
                                    completedPomodoros: 0,
                                    currentStreak: 0
                                }
                            }));
                            
                            // Save migrated tasks to Supabase
                            for (const task of tasksWithMetrics) {
                                await createPomodoroTask(task);
                            }
                            
                            setTasks(tasksWithMetrics);
                            console.log("Tasks migrated from localStorage to Supabase");
                            
                            // Clear localStorage after migration
                            localStorage.removeItem('pomodoroTasks');
                        }
                    }
                } else {
                    // Fallback to localStorage if user is not authenticated
                    const savedTasks = localStorage.getItem('pomodoroTasks');
                    if (savedTasks) {
                        const parsedTasks = JSON.parse(savedTasks);
                        const tasksWithMetrics = parsedTasks.map((task: any) => ({
                            id: task.id,
                            text: task.text,
                            completed: task.completed,
                            metrics: task.metrics || {
                                totalMinutes: 0,
                                completedPomodoros: 0,
                                currentStreak: 0
                            }
                        }));
                        setTasks(tasksWithMetrics);
                    }
                }
            } catch (error) {
                console.error('Error loading tasks:', error);
                toast({
                    title: "Error loading tasks",
                    description: "Could not load your tasks. Please try again later.",
                    variant: "destructive",
                });
            }
        };
        loadTasks();
    }, [user, toast]);

    // Load daily goal completion status from localStorage
    useEffect(() => {
        try {
            const dailyGoalCompleted = localStorage.getItem('dailyGoalCompleted') === 'true';
            const completedDate = localStorage.getItem('dailyGoalCompletedDate');
            const today = new Date().toDateString();
            
            // Only consider it completed if it was completed today
            if (dailyGoalCompleted && completedDate === today) {
                setIsCompleted(true);
                console.log("Daily goal completion status loaded from localStorage: completed");
            } else {
                // Reset completion status if it's a new day
                setIsCompleted(false);
                localStorage.removeItem('dailyGoalCompleted');
                localStorage.removeItem('dailyGoalCompletedDate');
                console.log("Daily goal completion status reset for new day");
            }
        } catch (error) {
            console.error('Error loading daily goal completion status:', error);
        }
    }, []);

    // Define playNotificationSound function
    const playNotificationSound = useCallback(async () => {
        try {
            if (!audioContext) {
                const newAudioContext = new AudioContext();
                setAudioContext(newAudioContext);
            }
            
            if (audioContext && settings?.sound_enabled) {
                // Create a more pleasant notification sound
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);
                
                // Use a more pleasant sine wave
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(660, audioContext.currentTime); // Higher frequency for better attention
                
                // Smoother volume envelope
                gainNode.gain.setValueAtTime(0, audioContext.currentTime);
                gainNode.gain.linearRampToValueAtTime(0.2, audioContext.currentTime + 0.1);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1.0);
                
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 1.0);
                
                // Play a second tone for a more pleasant chime effect
                const oscillator2 = audioContext.createOscillator();
                const gainNode2 = audioContext.createGain();
                
                oscillator2.connect(gainNode2);
                gainNode2.connect(audioContext.destination);
                
                oscillator2.type = 'sine';
                oscillator2.frequency.setValueAtTime(880, audioContext.currentTime + 0.15); // Higher note
                
                gainNode2.gain.setValueAtTime(0, audioContext.currentTime + 0.15);
                gainNode2.gain.linearRampToValueAtTime(0.15, audioContext.currentTime + 0.25);
                gainNode2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1.0);
                
                oscillator2.start(audioContext.currentTime + 0.15);
                oscillator2.stop(audioContext.currentTime + 1.0);
                
                // Show browser notification if enabled
                if (settings.notification_enabled) {
                    if (Notification.permission === 'granted') {
                        new Notification('Pomodoro Timer', {
                            body: isBreak ? 'Break time is over!' : 'Time to take a break!',
                            icon: 'favicon.ico'
                        });
                    } else if (Notification.permission !== 'denied') {
                        // Request permission if not already granted or denied
                        Notification.requestPermission();
                    }
                }
                
                // Return a promise that resolves when the sound is finished
                return new Promise(resolve => setTimeout(resolve, 1000));
            }
        } catch (error) {
            console.error('Error playing sound:', error);
        }
    }, [isBreak, settings, audioContext]);

    // Define startNewPomodoro function
    const startNewPomodoro = useCallback(async (pomodoroType: 'work' | 'break') => {
        if (!settings) return;
        
        try {
            console.log("Starting new pomodoro of type:", pomodoroType);
            
            // Only start a new pomodoro in the database if this is a work session
            if (pomodoroType === 'work') {
                console.log("Starting new work pomodoro in database");
                const pomodoro = await startPomodoro(pomodoroType);
                setCurrentPomodoroId(pomodoro.id);
            } else {
                console.log("Starting break (not creating database entry)");
                // For breaks, we don't need to create a database entry
                setCurrentPomodoroId(null);
            }
            
            setIsActive(true);

            // Update the time based on the pomodoro type
            let newDuration;
            if (pomodoroType === 'work') {
                newDuration = settings.work_duration;
            } else {
                // For break, check if it should be a long break
                if (activeTaskId) {
                    const task = tasks.find(t => t.id === activeTaskId);
                    if (task) {
                        const completedPomodoros = task.metrics.completedPomodoros;
                        const isLongBreak = completedPomodoros > 0 && completedPomodoros % settings.pomodoros_until_long_break === 0;
                        newDuration = isLongBreak ? settings.long_break_duration : settings.break_duration;
                    } else {
                        newDuration = settings.break_duration;
                    }
                } else {
                    newDuration = settings.break_duration;
                }
            }

            console.log("Setting timer duration to:", newDuration, "minutes");
            setTime(newDuration * 60);
            
            // Start the timer
            if (timerWorkerRef.current) {
                console.log("Sending start command to timer worker");
                const message = {
                    command: 'start',
                    time: newDuration * 60
                };
                timerWorkerRef.current.postMessage(message);
            } else {
                console.warn("Timer worker not initialized");
            }

        } catch (error) {
            console.error('Error starting Pomodoro:', error);
            toast({
                title: 'Error',
                description: 'Failed to start Pomodoro session',
                variant: 'destructive',
            });
        }
    }, [settings, activeTaskId, tasks, toast, timerWorkerRef]);
    
    // Function to play a more prominent goal achievement sound
    const playGoalAchievedSound = useCallback((context: AudioContext) => {
        try {
            // Create a more festive celebration sound
            // First note - triumphant
            const osc1 = context.createOscillator();
            const gain1 = context.createGain();
            osc1.connect(gain1);
            gain1.connect(context.destination);
            
            osc1.type = 'triangle';
            osc1.frequency.setValueAtTime(523.25, context.currentTime); // C5
            gain1.gain.setValueAtTime(0, context.currentTime);
            gain1.gain.linearRampToValueAtTime(0.3, context.currentTime + 0.1);
            gain1.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 1.5);
            
            osc1.start(context.currentTime);
            osc1.stop(context.currentTime + 1.5);
            
            // Second note - higher
            const osc2 = context.createOscillator();
            const gain2 = context.createGain();
            osc2.connect(gain2);
            gain2.connect(context.destination);
            
            osc2.type = 'triangle';
            osc2.frequency.setValueAtTime(659.25, context.currentTime + 0.25); // E5
            gain2.gain.setValueAtTime(0, context.currentTime + 0.25);
            gain2.gain.linearRampToValueAtTime(0.3, context.currentTime + 0.35);
            gain2.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 1.75);
            
            osc2.start(context.currentTime + 0.25);
            osc2.stop(context.currentTime + 1.75);
            
            // Third note - highest
            const osc3 = context.createOscillator();
            const gain3 = context.createGain();
            osc3.connect(gain3);
            gain3.connect(context.destination);
            
            osc3.type = 'triangle';
            osc3.frequency.setValueAtTime(783.99, context.currentTime + 0.5); // G5
            gain3.gain.setValueAtTime(0, context.currentTime + 0.5);
            gain3.gain.linearRampToValueAtTime(0.3, context.currentTime + 0.6);
            gain3.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 2.0);
            
            osc3.start(context.currentTime + 0.5);
            osc3.stop(context.currentTime + 2.0);
            
            // Final triumphant chord
            const osc4 = context.createOscillator();
            const gain4 = context.createGain();
            
            osc4.connect(gain4);
            gain4.connect(context.destination);
            
            osc4.type = 'triangle';
            osc4.frequency.setValueAtTime(1046.50, context.currentTime + 0.75); // C6 (high C)
            gain4.gain.setValueAtTime(0, context.currentTime + 0.75);
            gain4.gain.linearRampToValueAtTime(0.4, context.currentTime + 0.85);
            gain4.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 2.5);
            
            osc4.start(context.currentTime + 0.75);
            osc4.stop(context.currentTime + 2.5);
            
            return new Promise(resolve => setTimeout(resolve, 2500));
        } catch (error) {
            console.error('Error playing goal achieved sound:', error);
        }
    }, []);

    // Check daily goal achievement
    const checkDailyGoal = useCallback((completedPomodoros: number) => {
        if (!settings) return; // Add a null check for settings
        
        const dailyGoal = settings.daily_goal || 8;
        
        // Check if any task has reached the daily goal
        const taskReachedGoal = tasks.some(task => task.metrics && task.metrics.completedPomodoros >= dailyGoal);
        
        if (taskReachedGoal && !isCompleted) {
            // Mark the goal as completed
            setIsCompleted(true);
            
            // Store completion status in localStorage to persist across refreshes
            localStorage.setItem('dailyGoalCompleted', 'true');
            localStorage.setItem('dailyGoalCompletedDate', new Date().toDateString());
            
            console.log("Daily goal achieved and marked as completed!");
            
            // Play celebration sound
            if (audioContext && settings.sound_enabled) {
                playGoalAchievedSound(audioContext);
            }
            
            // Show celebration toast with more emphasis
            toast({
                title: "🎉 Daily Goal Achieved! 🎉",
                description: `Congratulations! You've completed ${completedPomodoros} pomodoros today and reached your daily goal of ${dailyGoal}!`,
                variant: "default",
                duration: 8000, // Longer duration for celebration
            });
            
            // Show browser notification if enabled
            if (settings.notification_enabled) {
                if (Notification.permission === 'granted') {
                    new Notification('Daily Goal Achieved! 🎉', {
                        body: `Congratulations! You've completed your daily goal of ${dailyGoal} pomodoros!`,
                        icon: 'favicon.ico'
                    });
                }
            }
        }
    }, [settings, isCompleted, audioContext, toast, playGoalAchievedSound, tasks]);

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
            const failedCompletions: FailedCompletion[] = JSON.parse(localStorage.getItem('failedPomodoroCompletions') || '[]');
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

    // Function to retry failed pomodoro completions
    const retryFailedCompletions = useCallback(async () => {
        try {
            const failedCompletions: FailedCompletion[] = JSON.parse(localStorage.getItem('failedPomodoroCompletions') || '[]');
            if (failedCompletions.length === 0) return;
            
            console.log(`Attempting to sync ${failedCompletions.length} failed pomodoro completions`);
            
            const successfulIds: string[] = [];
            
            for (const completion of failedCompletions) {
                try {
                    await completePomodoro(completion.pomodoroId);
                    successfulIds.push(completion.pomodoroId);
                    console.log(`Successfully synced pomodoro: ${completion.pomodoroId}`);
                } catch (error) {
                    console.error(`Failed to sync pomodoro: ${completion.pomodoroId}`, error);
                    // Keep this one in the failed list
                }
            }
            
            if (successfulIds.length > 0) {
                // Remove successful completions from the failed list
                const remainingFailures = failedCompletions.filter(
                    completion => !successfulIds.includes(completion.pomodoroId)
                );
                
                localStorage.setItem('failedPomodoroCompletions', JSON.stringify(remainingFailures));
                
                if (successfulIds.length === failedCompletions.length) {
                    toast({
                        title: "Sync Complete",
                        description: `Successfully synced ${successfulIds.length} pomodoro sessions.`,
                        duration: 3000,
                    });
                } else {
                    toast({
                        title: "Partial Sync",
                        description: `Synced ${successfulIds.length} of ${failedCompletions.length} pomodoro sessions.`,
                        duration: 3000,
                    });
                }
            }
        } catch (error) {
            console.error("Error retrying failed completions:", error);
        }
    }, [toast]);

    // Add online/offline event listeners
    useEffect(() => {
        const handleOnline = () => {
            console.log("App is back online, attempting to sync failed completions");
            retryFailedCompletions();
        };
        
        window.addEventListener('online', handleOnline);
        
        // Also try to sync on initial load
        if (navigator.onLine) {
            retryFailedCompletions();
        }
        
        return () => {
            window.removeEventListener('online', handleOnline);
        };
    }, [retryFailedCompletions]);

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
        timerWorkerRef.current = worker;
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

    // Add a function to sync failed task updates
    const syncFailedTaskUpdates = useCallback(async () => {
        if (!user) return;
        
        try {
            const failedUpdates = JSON.parse(localStorage.getItem('failedTaskUpdates') || '[]') as Array<{
                taskId: string;
                metrics: Task['metrics'];
                completed: boolean;
                timestamp: string;
            }>;
            
            if (failedUpdates.length === 0) return;
            
            console.log(`Attempting to sync ${failedUpdates.length} failed task updates`);
            
            const successfulSyncs: Array<{
                taskId: string;
                metrics: Task['metrics'];
                completed: boolean;
                timestamp: string;
            }> = [];
            
            for (const update of failedUpdates) {
                try {
                    await updatePomodoroTask(update.taskId, {
                        metrics: update.metrics,
                        completed: update.completed
                    });
                    successfulSyncs.push(update);
                    console.log(`Successfully synced task update for task ${update.taskId}`);
                } catch (error) {
                    console.error(`Failed to sync task update for task ${update.taskId}:`, error);
                }
            }
            
            // Remove successful syncs from the failed updates
            if (successfulSyncs.length > 0) {
                const remainingUpdates = failedUpdates.filter(
                    update => !successfulSyncs.some(sync => sync.taskId === update.taskId && sync.timestamp === update.timestamp)
                );
                localStorage.setItem('failedTaskUpdates', JSON.stringify(remainingUpdates));
                
                if (remainingUpdates.length === 0) {
                    console.log("All failed task updates successfully synced");
                    toast({
                        title: "Sync Complete",
                        description: `Successfully synced ${successfulSyncs.length} task updates.`,
                        duration: 3000,
                    });
                } else {
                    console.log(`${remainingUpdates.length} task updates still pending sync`);
                    toast({
                        title: "Partial Sync",
                        description: `Synced ${successfulSyncs.length} task updates. ${remainingUpdates.length} updates still pending.`,
                        duration: 3000,
                    });
                }
            }
        } catch (error) {
            console.error("Error syncing failed task updates:", error);
        }
    }, [user, toast]);

    // Try to sync failed updates when user logs in or when component mounts
    useEffect(() => {
        if (user) {
            syncFailedTaskUpdates();
        }
    }, [user, syncFailedTaskUpdates]);

    const addTask = async (text: string) => {
        if (!text.trim()) return;
        
        const newTaskId = crypto.randomUUID();
        const newTask: Task = {
            id: newTaskId,
            text,
            completed: false,
            metrics: {
                totalMinutes: 0,
                completedPomodoros: 0,
                currentStreak: 0
            }
        };
        
        try {
            // Save to Supabase if user is authenticated
            if (user) {
                try {
                    // Create a task object that matches the PomodoroTask interface
                    await createPomodoroTask({
                        id: newTask.id,
                        text: newTask.text,
                        completed: newTask.completed,
                        metrics: newTask.metrics
                    });
                    console.log("Task created in Supabase:", newTask);
                } catch (error) {
                    console.error("Error creating task in Supabase:", error);
                    // Save to localStorage as a fallback
                    const savedTasks = JSON.parse(localStorage.getItem('pomodoroTasks') || '[]');
                    localStorage.setItem('pomodoroTasks', JSON.stringify([...savedTasks, newTask]));
                }
            } else {
                // Save to localStorage if user is not authenticated
                const savedTasks = JSON.parse(localStorage.getItem('pomodoroTasks') || '[]');
                localStorage.setItem('pomodoroTasks', JSON.stringify([...savedTasks, newTask]));
            }
            
            // Update local state
            setTasks(prev => [...prev, newTask]);
            setActiveTaskId(newTaskId);
            setTime(settings?.work_duration ? settings.work_duration * 60 : 25 * 60);
            setIsActive(false);
            setIsBreak(false);
            
            if (currentPomodoroId) {
                await completePomodoro(currentPomodoroId);
                setCurrentPomodoroId(null);
            }
        } catch (error) {
            console.error('Error adding task:', error);
            toast({
                title: "Error adding task",
                description: "Could not add your task. Please try again later.",
                variant: "destructive",
            });
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

    const removeTask = async (taskId: string) => {
        try {
            // If this is the active task, reset the timer and clear the active task
            if (taskId === activeTaskId) {
                setActiveTaskId(null);
                setIsActive(false);
                if (currentPomodoroId) {
                    try {
                        await completePomodoro(currentPomodoroId);
                    } catch (error) {
                        console.error('Error completing active pomodoro:', error);
                    }
                    setCurrentPomodoroId(null);
                }
            }
            
            // Delete from Supabase if user is authenticated
            if (user) {
                await deletePomodoroTask(taskId);
            }
            
            // Update local state
            setTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));
        } catch (error) {
            console.error('Error removing task:', error);
            toast({
                title: "Error removing task",
                description: "Could not remove your task. Please try again later.",
                variant: "destructive",
            });
        }
    };

    const toggleTask = async (id: string) => {
        // Get the task we're trying to toggle
        const taskToToggle = tasks.find(task => task.id === id);
        
        // If task doesn't exist, do nothing
        if (!taskToToggle) return;
        
        try {
            // If task is already completed, we can toggle it back to incomplete
            if (taskToToggle.completed) {
                // Update in Supabase if user is authenticated
                if (user) {
                    await updatePomodoroTask(id, { completed: false });
                }
                
                // Update local state
                setTasks(prevTasks =>
                    prevTasks.map(task =>
                        task.id === id ? { ...task, completed: false } : task
                    )
                );
                return;
            }
            
            // If trying to mark as completed, check if this task has reached the daily goal
            const dailyGoal = settings?.daily_goal ?? 8;
            
            // Ensure metrics exists and has completedPomodoros property
            if (taskToToggle.metrics && taskToToggle.metrics.completedPomodoros >= dailyGoal) {
                // Daily goal achieved for this task, allow marking as completed
                // Update in Supabase if user is authenticated
                if (user) {
                    await updatePomodoroTask(id, { completed: true });
                }
                
                // Update local state
                setTasks(prevTasks =>
                    prevTasks.map(task =>
                        task.id === id ? { ...task, completed: true } : task
                    )
                );
                
                // Show celebration
                toast({
                    title: "Task Completed! 🎉",
                    description: `You've completed your daily goal for "${taskToToggle.text}"!`,
                    duration: 5000,
                });
                
                // Play celebration sound
                playCelebrationSound();
            } else {
                // Task hasn't reached daily goal yet, show message
                toast({
                    title: "Keep Going!",
                    description: `Complete ${dailyGoal} pomodoros to mark this task as done.`,
                    duration: 3000,
                });
            }
        } catch (error) {
            console.error('Error toggling task:', error);
            toast({
                title: "Error updating task",
                description: "Could not update your task. Please try again later.",
                variant: "destructive",
            });
        }
    };

    // Ajouter useEffect pour charger les paramètres au démarrage
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

    useEffect(() => {
        // Check if the daily goal has been reached
        if (settings?.daily_goal && activeTaskId) {
            const task = tasks.find(t => t.id === activeTaskId);
            if (task && task.metrics && task.metrics.completedPomodoros >= settings.daily_goal) {
                checkDailyGoal(task.metrics.completedPomodoros);
            }
        }
    }, [settings, activeTaskId, tasks, checkDailyGoal]);

    useEffect(() => {
        // Check if the daily goal was already completed today
        const dailyGoalCompleted = localStorage.getItem('dailyGoalCompleted') === 'true';
        const completedDate = localStorage.getItem('dailyGoalCompletedDate');
        const today = new Date().toDateString();
        
        // If the goal was completed today, mark it as completed
        if (dailyGoalCompleted && completedDate === today) {
            setIsCompleted(true);
            console.log("Daily goal was already completed today");
        } else if (completedDate !== today) {
            // Reset completion status if it's a new day
            setIsCompleted(false);
            localStorage.removeItem('dailyGoalCompleted');
            localStorage.removeItem('dailyGoalCompletedDate');
            console.log("New day, resetting daily goal completion status");
        }
    }, []);

    const skipCurrentInterval = async () => {
        if (!isActive || !activeTaskId || !settings) return;
        
        try {
            // If we're in a work interval, complete it but don't count it as a full pomodoro
            if (!isBreak && currentPomodoroId) {
                // Just complete the pomodoro without incrementing the counter
                await completePomodoro(currentPomodoroId);
                setCurrentPomodoroId(null);
                
                // We don't increment the pomodoro count or update task metrics for skipped pomodoros
            }
            
            // Reset the timer state
            setIsActive(false);
            setIsBreak(!isBreak);
            
            // Set the appropriate time for the next interval
            if (isBreak) {
                // Switching to work mode
                setTime(settings.work_duration * 60);
            } else {
                // Switching to break mode
                const activeTask = tasks.find(t => t.id === activeTaskId);
                const completedPomodoros = activeTask?.metrics?.completedPomodoros || 0;
                const isLongBreak = completedPomodoros > 0 && completedPomodoros % settings.pomodoros_until_long_break === 0;
                setTime(isLongBreak ? settings.long_break_duration * 60 : settings.break_duration * 60);
            }
            
            toast({
                title: "Interval Skipped",
                description: `Switched to ${isBreak ? "work" : "break"} mode`,
                variant: "default",
            });
        } catch (error) {
            console.error('Error skipping interval:', error);
            toast({
                title: 'Error',
                description: 'Failed to skip interval',
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

    const handleButtonClick = (event: React.FormEvent<HTMLButtonElement>) => {
        const action = event.currentTarget.name;
        switch (action) {
            case 'start':
                if (!isActive) {
                    startNewPomodoro(isBreak ? 'break' : 'work');
                } else {
                    setIsActive(false); // Permettre la pause
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

    // Ajouter une initialisation de l'AudioContext au montage du composant
    useEffect(() => {
        // Créer l'AudioContext au premier rendu
        if (!audioContext) {
            const newAudioContext = new AudioContext();
            setAudioContext(newAudioContext);
        }
        
        // Cleanup
        return () => {
            if (audioContext) {
                audioContext.close();
            }
        };
    }, []);

    // Modifier handleTimerComplete pour mieux gérer les paramètres
    const handleTimerComplete = useCallback(async () => {
        if (!settings) return;

        try {
            console.log("Timer complete. Current state:", { isBreak, activeTaskId, pomodoroCount });
            
            // S'assurer que l'AudioContext est créé si nécessaire
            if (!audioContext) {
                try {
                    const newAudioContext = new AudioContext();
                    setAudioContext(newAudioContext);
                } catch (error) {
                    console.warn("Could not create AudioContext, possibly on mobile:", error);
                    // Continue without audio
                }
            }

            // Jouer le son avant toute autre opération si activé
            if (settings?.sound_enabled && audioContext) {
                try {
                    await playNotificationSound();
                } catch (error) {
                    console.warn("Error playing notification sound:", error);
                    // Continue without sound
                }
            }

            // Arrêter le timer actif
            setIsActive(false);
            
            // Compléter le pomodoro actuel uniquement s'il s'agit d'une session de travail
            if (currentPomodoroId && !isBreak) {
                console.log("Completing work pomodoro:", currentPomodoroId);
                try {
                    await completePomodoro(currentPomodoroId);
                } catch (error) {
                    console.error("Error completing pomodoro in database:", error);
                    // Store failed completion to retry later
                    const failedCompletions: FailedCompletion[] = JSON.parse(localStorage.getItem('failedPomodoroCompletions') || '[]');
                    failedCompletions.push({
                        pomodoroId: currentPomodoroId,
                        timestamp: new Date().toISOString()
                    });
                    localStorage.setItem('failedPomodoroCompletions', JSON.stringify(failedCompletions));
                    
                    // Show a warning toast but continue with the local updates
                    toast({
                        title: "Warning",
                        description: "Pomodoro completed offline. Will sync when connection is restored.",
                        variant: "default",
                        duration: 3000,
                    });
                    
                    // Even if there's an error, try to update the local state
                    if (activeTaskId) {
                        try {
                            // Update local metrics as a fallback
                            const updatedTasks = tasks.map(task => {
                                if (task.id === activeTaskId) {
                                    return {
                                        ...task,
                                        metrics: {
                                            ...task.metrics,
                                            completedPomodoros: task.metrics.completedPomodoros + 1,
                                            totalMinutes: task.metrics.totalMinutes + (settings?.work_duration ?? 25)
                                        }
                                    };
                                }
                                return task;
                            });
                            
                            setTasks(updatedTasks);
                            localStorage.setItem('pomodoroTasks', JSON.stringify(updatedTasks));
                            console.log("Emergency fallback: Tasks updated locally despite error");
                        } catch (fallbackError) {
                            console.error("Critical error: Even fallback update failed:", fallbackError);
                        }
                    }
                }
                setCurrentPomodoroId(null);
            }

            // Determine if we're finishing a work session or a break
            const finishingWorkSession = !isBreak;
            
            console.log("Finishing work session:", finishingWorkSession);

            // Mettre à jour les métriques uniquement à la fin d'une session de travail (pas de pause)
            if (finishingWorkSession && activeTaskId) {
                console.log("Updating metrics for task:", activeTaskId);
                
                // Get current task before updating
                const currentTask = tasks.find(t => t.id === activeTaskId);
                console.log("Current task metrics before update:", currentTask?.metrics);
                
                // Always update local count even if database update failed
                const newPomodoroCount = pomodoroCount + 1;
                setPomodoroCount(newPomodoroCount);
                
                // Update tasks with new metrics
                const updatedTasks = tasks.map(task => {
                    if (task.id === activeTaskId) {
                        const newCompletedPomodoros = task.metrics.completedPomodoros + 1;
                        
                        console.log("Updating pomodoro count from", task.metrics.completedPomodoros, "to", newCompletedPomodoros);
                        
                        // Check if this task has reached the daily goal
                        const dailyGoal = settings?.daily_goal ?? 8; // Fix TypeScript error by using nullish coalescing operator
                        const hasReachedDailyGoal = newCompletedPomodoros >= dailyGoal;
                        
                        // If this task has reached the daily goal, mark it as completed
                        const shouldMarkCompleted = hasReachedDailyGoal && !task.completed;
                        
                        // Check if goal is achieved for any task
                        if (hasReachedDailyGoal && !isCompleted) {
                            try {
                                // Set the overall completion status
                                setIsCompleted(true);
                                localStorage.setItem('dailyGoalCompleted', 'true');
                                localStorage.setItem('dailyGoalCompletedDate', new Date().toDateString());
                                
                                // Show celebration toast
                                toast({
                                    title: "🎉 Daily Goal Achieved! 🎉",
                                    description: `Congratulations! You've completed ${newCompletedPomodoros} pomodoros for this task and reached your daily goal of ${dailyGoal}!`,
                                    variant: "default",
                                    duration: 8000,
                                });
                                
                                // Play celebration sound
                                if (audioContext && settings?.sound_enabled) {
                                    playGoalAchievedSound(audioContext);
                                }
                            } catch (error) {
                                console.warn("Error handling daily goal achievement:", error);
                            }
                        }
                        
                        // Create updated metrics object
                        const updatedMetrics = {
                            ...task.metrics,
                            currentStreak: task.metrics.currentStreak + 1,
                            completedPomodoros: newCompletedPomodoros,
                            totalMinutes: task.metrics.totalMinutes + (settings?.work_duration ?? 25)
                        };
                        
                        // Update task in Supabase if user is authenticated
                        if (user) {
                            (async () => {
                                try {
                                    await updatePomodoroTask(task.id, {
                                        metrics: updatedMetrics,
                                        completed: shouldMarkCompleted ? true : task.completed
                                    });
                                    console.log("Task metrics updated in Supabase:", task.id);
                                } catch (error) {
                                    console.error("Error updating task metrics in Supabase:", error);
                                    
                                    // Store failed update for later sync
                                    try {
                                        const failedUpdates = JSON.parse(localStorage.getItem('failedTaskUpdates') || '[]');
                                        failedUpdates.push({
                                            taskId: task.id,
                                            metrics: updatedMetrics,
                                            completed: shouldMarkCompleted ? true : task.completed,
                                            timestamp: new Date().toISOString()
                                        });
                                        localStorage.setItem('failedTaskUpdates', JSON.stringify(failedUpdates));
                                    } catch (storageError) {
                                        console.error("Failed to store update for later sync:", storageError);
                                    }
                                }
                            })();
                        }
                        
                        return {
                            ...task,
                            completed: shouldMarkCompleted ? true : task.completed,
                            metrics: updatedMetrics
                        };
                    }
                    return task;
                });
                
                // Set tasks state with the updated tasks
                setTasks(updatedTasks);
                
                // Save tasks to localStorage as a backup
                try {
                    localStorage.setItem('pomodoroTasks', JSON.stringify(updatedTasks));
                    console.log("Tasks updated in localStorage as backup");
                } catch (error) {
                    console.error("Error saving tasks to localStorage:", error);
                    toast({
                        title: "Error",
                        description: "Could not save backup progress. Please check your device storage.",
                        variant: "destructive",
                        duration: 3000,
                    });
                }
            }

            // Basculer entre focus et pause
            const newIsBreak = !isBreak;
            setIsBreak(newIsBreak);
            console.log("Switched to:", newIsBreak ? "break" : "work");

            // Calculer la durée suivante
            let newDuration;
            if (newIsBreak) {
                // If we're switching to break mode
                if (activeTaskId) {
                    const task = tasks.find(t => t.id === activeTaskId);
                    if (task) {
                        const completedPomodoros = task.metrics.completedPomodoros;
                        const isLongBreak = completedPomodoros > 0 && completedPomodoros % settings.pomodoros_until_long_break === 0;
                        newDuration = isLongBreak ? settings.long_break_duration : settings.break_duration;
                        console.log("Break duration:", newDuration, isLongBreak ? "(long break)" : "(short break)");
                    } else {
                        newDuration = settings.break_duration;
                        console.log("Break duration (default):", newDuration);
                    }
                } else {
                    newDuration = settings.break_duration;
                    console.log("Break duration (no active task):", newDuration);
                }
            } else {
                // If we're switching to work mode
                newDuration = settings.work_duration;
                console.log("Work duration:", newDuration);
            }

            setTime(newDuration * 60);

            // Afficher une notification avec le message approprié
            const title = finishingWorkSession ? "Time for a break!" : "Break complete!";
            const description = finishingWorkSession
                ? `Taking a ${newDuration}-minute break.`
                : "Ready for another focused session!";
            
            toast({
                title,
                description,
                duration: 3000,
            });

            // Démarrer automatiquement avec un délai
            const shouldAutoStart = finishingWorkSession ? settings.auto_start_breaks : settings.auto_start_pomodoros;
            if (shouldAutoStart) {
                console.log("Auto-starting next session:", newIsBreak ? "break" : "work");
                // Attendre que les états soient mis à jour
                setTimeout(async () => {
                    try {
                        await startNewPomodoro(newIsBreak ? 'break' : 'work');
                    } catch (error) {
                        console.error('Error auto-starting next session:', error);
                        toast({
                            title: "Error",
                            description: "Failed to auto-start next session. Try starting manually.",
                            variant: "destructive",
                            duration: 3000,
                        });
                    }
                }, 1000);
            }
        } catch (error) {
            console.error('Error completing timer:', error);
            toast({
                title: 'Error',
                description: 'Failed to complete timer session. Your progress has been saved locally.',
                variant: 'destructive',
                duration: 5000,
            });
            
            // Even if there's an error, try to update the local state
            if (!isBreak && activeTaskId) {
                try {
                    // Update local metrics as a fallback
                    const updatedTasks = tasks.map(task => {
                        if (task.id === activeTaskId) {
                            return {
                                ...task,
                                metrics: {
                                    ...task.metrics,
                                    completedPomodoros: task.metrics.completedPomodoros + 1,
                                    totalMinutes: task.metrics.totalMinutes + (settings?.work_duration ?? 25)
                                }
                            };
                        }
                        return task;
                    });
                    
                    setTasks(updatedTasks);
                    localStorage.setItem('pomodoroTasks', JSON.stringify(updatedTasks));
                    console.log("Emergency fallback: Tasks updated locally despite error");
                } catch (fallbackError) {
                    console.error("Critical error: Even fallback update failed:", fallbackError);
                }
            }
        }
    }, [isBreak, settings, currentPomodoroId, activeTaskId, pomodoroCount, audioContext, playNotificationSound, isCompleted, tasks, startNewPomodoro]);

    // Add keyboard shortcut handling
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Only handle shortcuts if not typing in an input field
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
                return;
            }

            switch (e.key.toLowerCase()) {
                case ' ': // Space bar to start/pause
                    e.preventDefault();
                    if (activeTaskId) {
                        toggleTimer();
                    }
                    break;
                case 's': // 's' to skip current interval
                    e.preventDefault();
                    if (activeTaskId && isActive) {
                        skipCurrentInterval();
                    }
                    break;
                case 'n': // 'n' to focus on new task input
                    e.preventDefault();
                    const taskInput = document.getElementById('new-task-input');
                    if (taskInput) {
                        (taskInput as HTMLInputElement).focus();
                    }
                    break;
                case 'escape': // Escape to close settings if open
                    if (settingsOpen) {
                        setSettingsOpen(false);
                    }
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [activeTaskId, isActive, toggleTimer, skipCurrentInterval, settingsOpen]);

    // Play a celebration sound when a task is completed
    const playCelebrationSound = useCallback(async () => {
        try {
            if (!settings?.sound_enabled) return;
            
            if (audioContext) {
                // Create a more festive sound for celebration
                const oscillator1 = audioContext.createOscillator();
                const oscillator2 = audioContext.createOscillator();
                const oscillator3 = audioContext.createOscillator();
                
                const gainNode1 = audioContext.createGain();
                const gainNode2 = audioContext.createGain();
                const gainNode3 = audioContext.createGain();
                
                oscillator1.connect(gainNode1);
                oscillator2.connect(gainNode2);
                oscillator3.connect(gainNode3);
                
                gainNode1.connect(audioContext.destination);
                gainNode2.connect(audioContext.destination);
                gainNode3.connect(audioContext.destination);
                
                // First note
                oscillator1.type = 'sine';
                oscillator1.frequency.value = 523.25; // C5
                gainNode1.gain.value = 0;
                gainNode1.gain.linearRampToValueAtTime(0.2, audioContext.currentTime + 0.1);
                gainNode1.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
                
                // Second note
                oscillator2.type = 'sine';
                oscillator2.frequency.value = 659.25; // E5
                gainNode2.gain.value = 0;
                gainNode2.gain.linearRampToValueAtTime(0.2, audioContext.currentTime + 0.3);
                gainNode2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.7);
                
                // Third note
                oscillator3.type = 'sine';
                oscillator3.frequency.value = 783.99; // G5
                gainNode3.gain.value = 0;
                gainNode3.gain.linearRampToValueAtTime(0.2, audioContext.currentTime + 0.5);
                gainNode3.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.9);
                
                oscillator1.start();
                oscillator2.start();
                oscillator3.start();
                
                oscillator1.stop(audioContext.currentTime + 0.5);
                oscillator2.stop(audioContext.currentTime + 0.7);
                oscillator3.stop(audioContext.currentTime + 0.9);
                
                // Show browser notification if enabled
                if (settings.notification_enabled) {
                    if (Notification.permission === 'granted') {
                        new Notification('Task Completed! 🎉', {
                            body: 'Congratulations! You\'ve completed your daily goal for this task!',
                            icon: 'favicon.ico'
                        });
                    } else if (Notification.permission !== 'denied') {
                        Notification.requestPermission();
                    }
                }
                
                // Return a promise that resolves when the sound is finished
                return new Promise(resolve => setTimeout(resolve, 1000));
            }
        } catch (error) {
            console.error('Error playing celebration sound:', error);
        }
    }, [settings, audioContext]);

    return (
        <Card className="p-4 md:p-6 max-w-md mx-auto backdrop-blur-sm bg-slate-900/90 border-slate-700/30 shadow-2xl rounded-xl mt-8">
            <div className="pomodoro-timer space-y-6 md:space-y-8">
                <div className="pomodoro-status flex justify-center items-center mb-2">
                    <div className="px-4 py-1.5 rounded-full shadow-lg bg-blue-600/90 backdrop-blur-sm">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full animate-pulse bg-blue-300" />
                            <span className="text-sm font-medium text-white">
                                {isBreak ? "Break Time" : "Focus Time"}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="w-full">
                    <div className="flex items-center gap-2 mb-4">
                        <Input
                            type="text"
                            value={currentTask}
                            onChange={(e) => setCurrentTask(e.target.value)}
                            placeholder="Add a new task..."
                            className="flex h-10 w-full rounded-md border border-slate-600/50 bg-slate-800/90 px-3 py-2
                            text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium
                            placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 text-blue-50"
                            id="new-task-input"
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
                    <div className="flex justify-between items-center mb-4">
                        <div className="text-sm font-medium">
                            <span className="text-blue-300">Current Task:</span>
                            <span className="ml-2 text-blue-100">{currentTask || "No task selected"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Badge className="bg-blue-500/30 text-blue-200 border-blue-400/30">
                                {tasks.length > 0 ? tasks.filter(t => !t.completed).length : 0} active tasks
                            </Badge>
                        </div>
                    </div>
                    <ul className="space-y-2">
                        {tasks
                            .filter(task => {
                                // Only show completed tasks if showCompletedTasks is true
                                if (task.completed) {
                                    return showCompletedTasks;
                                }
                                // Always show non-completed tasks
                                return true;
                            })
                            .map(task => (
                                <li key={task.id} className="flex items-center gap-3 p-4 rounded-xl transition-all duration-200 bg-slate-800/40 hover:bg-slate-800/60 border border-slate-700/30">
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
                                            {task.completed && task.metrics && task.metrics.completedPomodoros >= (settings?.daily_goal ?? 8) && (
                                                <Badge className="ml-2 bg-green-600 text-white">
                                                    <Trophy className="h-3 w-3 mr-1" />
                                                    Completed!
                                                </Badge>
                                            )}
                                        </div>
                                        {activeTaskId === task.id && task.metrics && (
                                            <div className="text-xs text-blue-200 mt-1 flex items-center gap-2">
                                                <span className="flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {formatTotalTime(task.metrics.totalMinutes)}
                                                </span>
                                                <span>•</span>
                                                <span className="flex items-center gap-1">
                                                    <Target className="w-3 h-3" />
                                                    {task.metrics.completedPomodoros} pomodoros
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
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
                                            onClick={() => removeTask(task.id)}
                                            className="h-9 px-3 bg-red-500/10 text-red-200 hover:bg-red-500/20 hover:text-red-100 border border-red-500/30 rounded-md"
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
                        totalTime={isBreak ? (settings?.break_duration ?? 5) * 60 : (settings?.work_duration ?? 25) * 60}
                        isBreak={isBreak}
                    />
                </div>
                <div className="flex justify-center gap-4 mb-4">
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    name={isActive ? 'pause' : 'start'}
                                    onClick={handleButtonClick}
                                    disabled={!activeTaskId}
                                    className={cn(
                                        "w-24 transition-all duration-300 shadow-lg rounded-full",
                                        isActive
                                            ? "bg-blue-500 hover:bg-blue-600 shadow-blue-500/30"
                                            : "bg-green-500 hover:bg-green-600 shadow-green-500/30",
                                        !activeTaskId && "opacity-50"
                                    )}
                                >
                                    {isActive ? <PauseIcon className="h-6 w-6" /> : <PlayIcon className="h-6 w-6" />}
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent className="bg-blue-600 text-white border-blue-700">
                                {activeTaskId ? `Space to ${isActive ? 'Pause' : 'Start'}` : 'Select a task first'}
                            </TooltipContent> 
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    name="skip"
                                    onClick={handleButtonClick}
                                    disabled={!activeTaskId || !isActive}
                                    className="border-slate-600/50 hover:border-slate-500 hover:bg-slate-700/50 rounded-full"
                                >
                                    <SkipForwardIcon className="h-6 w-6" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent className="bg-blue-600 text-white border-blue-700">
                                Press 'S' to Skip
                            </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    name="settings"
                                    onClick={() => setSettingsOpen(true)}
                                    className="border-slate-600/50 hover:border-slate-500 hover:bg-slate-700/50 rounded-full"
                                >
                                    <Settings2Icon className="h-6 w-6" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent className="bg-blue-600 text-white border-blue-700">
                                Settings
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
                {activeTaskId && (
                    <div className="mt-6">
                        {/* Only render TaskProgress if we can find the active task */}
                        {tasks.find(t => t.id === activeTaskId) && (
                            <TaskProgress 
                                task={tasks.find(t => t.id === activeTaskId)!} 
                                settings={settings} 
                            />
                        )}
                    </div>
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
    const minutes = Math.floor(time / 60);
    const seconds = time % 60;
    const progress = ((totalTime - time) / totalTime) * 100;
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

// Modifier le composant TaskProgress pour recevoir les settings
function TaskProgress({ task, settings }: { task: Task; settings: PomodoroSettings | null }) {
    const { streakPercentage, dailyGoalPercentage } = getProgressStats(task, settings);
    const dailyGoal = settings?.daily_goal ?? 8; // Fix TypeScript error by using nullish coalescing operator
    
    // Initialize metrics if they don't exist at all
    const metrics = task.metrics || { completedPomodoros: 0, currentStreak: 0, totalMinutes: 0 };
    
    return (
        <div className="p-6 rounded-xl bg-blue-600/20 border border-blue-400/30 shadow-lg">
            <div className="flex items-center justify-between mb-4">
                <div className="text-sm font-medium">
                    <span className="text-blue-300">Current Task:</span>
                    <span className="ml-2 text-blue-100">{task.text}</span>
                </div>
                <div className="flex items-center gap-2">
                    <Badge className="bg-blue-500/20 text-blue-200 border-blue-400/30">
                        {metrics.completedPomodoros} pomodoros
                    </Badge>
                </div>
            </div>
            
            {/* Progress bars instead of the grid */}
            <div className="space-y-4 mb-4">
                {/* Daily Goal Progress Bar */}
                <div>
                    <div className="flex justify-between mb-1">
                        <span className="text-xs text-blue-300">Daily Goal</span>
                        <span className="text-xs text-blue-200">{metrics.completedPomodoros} / {dailyGoal}</span>
                    </div>
                    <div className="w-full bg-blue-500/10 rounded-full h-2.5 overflow-hidden">
                        <div 
                            className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2.5 rounded-full transition-all duration-500 ease-out"
                            style={{ width: `${dailyGoalPercentage}%` }}
                        ></div>
                    </div>
                </div>
                
                {/* Streak Progress Bar */}
                <div>
                    <div className="flex justify-between mb-1">
                        <span className="text-xs text-blue-300">Current Streak</span>
                        <span className="text-xs text-blue-200">{metrics.currentStreak} consecutive</span>
                    </div>
                    <div className="w-full bg-blue-500/10 rounded-full h-2.5 overflow-hidden">
                        <div 
                            className="bg-gradient-to-r from-green-500 to-emerald-500 h-2.5 rounded-full transition-all duration-500 ease-out"
                            style={{ width: `${streakPercentage}%` }}
                        ></div>
                    </div>
                </div>
            </div>
            
            <div className="flex justify-between items-center">
                <div className="text-sm text-blue-200">
                    <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTotalTime(metrics.totalMinutes)} total focus time
                    </span>
                </div>
                <div>
                    <span className="text-xs font-medium text-blue-200 bg-blue-500/20 px-2 py-1 rounded-full">
                        {getMotivationalMessage(metrics.currentStreak)}
                    </span>
                </div>
            </div>
        </div>
    );
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
    const [workDuration, setWorkDuration] = useState(initialSettings?.work_duration ?? 25);
    const [breakDuration, setBreakDuration] = useState(initialSettings?.break_duration ?? 5);
    const [dailyGoal, setDailyGoal] = useState(initialSettings?.daily_goal ?? 4);
    const [autoStartPomodoros, setAutoStartPomodoros] = useState<boolean>(initialSettings?.auto_start_pomodoros ?? false);
    const [autoStartBreaks, setAutoStartBreaks] = useState<boolean>(initialSettings?.auto_start_breaks ?? false);
    const [soundEnabled, setSoundEnabled] = useState<boolean>(initialSettings?.sound_enabled ?? true);
    const [notificationEnabled, setNotificationEnabled] = useState<boolean>(initialSettings?.notification_enabled ?? true);
    const [longBreakDuration, setLongBreakDuration] = useState(initialSettings?.long_break_duration ?? 15);
    const [pomodorosUntilLongBreak, setPomodorosUntilLongBreak] = useState(initialSettings?.pomodoros_until_long_break ?? 4);

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
