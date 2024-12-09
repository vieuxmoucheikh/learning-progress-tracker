import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import Progress from '@/components/ui/progress';
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import Label from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';

interface PomodoroTimerProps {
  onSessionComplete?: (sessionData: { duration: number; label: string; type: 'work' | 'break' }) => void;
}

interface PomodoroState {
  last_update: string;
  time: number;
  is_active: boolean;
  is_break: boolean;
  current_pomodoro_id: string;
}

export function PomodoroTimer({ onSessionComplete }: PomodoroTimerProps) {
  const [time, setTime] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [settings, setSettings] = useState<PomodoroSettings | null>(null);
  const [stats, setStats] = useState<PomodoroStats | null>(null);
  const [currentPomodoroId, setCurrentPomodoroId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [focusLabel, setFocusLabel] = useState<string>('');
  const [dailyGoal, setDailyGoal] = useState<number>(8);
  const timerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();

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

  // Handle visibility change
  useEffect(() => {
    let lastTimestamp = Date.now();
    
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Save the current timestamp when tab becomes hidden
        lastTimestamp = Date.now();
        localStorage.setItem('pomodoroLastTimestamp', lastTimestamp.toString());
      } else {
        // Calculate elapsed time when tab becomes visible
        const storedTimestamp = parseInt(localStorage.getItem('pomodoroLastTimestamp') || lastTimestamp.toString());
        const elapsedSeconds = Math.floor((Date.now() - storedTimestamp) / 1000);
        
        if (isActive && elapsedSeconds > 0) {
          setTime(prevTime => Math.max(0, prevTime - elapsedSeconds));
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isActive]);

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

  // Sync timer state with Supabase
  const syncWithSupabase = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('pomodoro_states')
        .upsert({
          user_id: user.id,
          time,
          is_active: isActive,
          is_break: isBreak,
          current_pomodoro_id: currentPomodoroId,
          last_update: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      // Only update if the remote state is newer
      if (data && new Date(data.last_update) > new Date(localStorage.getItem('lastUpdate') || '')) {
        setTime(data.time);
        setIsActive(data.is_active);
        setIsBreak(data.is_break);
        setCurrentPomodoroId(data.current_pomodoro_id);
        localStorage.setItem('lastUpdate', data.last_update);
      }
    } catch (error) {
      console.error('Error syncing with Supabase:', error);
    }
  }, [user?.id, time, isActive, isBreak, currentPomodoroId, supabase]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('pomodoro_states')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pomodoro_states',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const newState: PomodoroState = payload.new as PomodoroState;
          if (new Date(newState.last_update) > new Date(localStorage.getItem('lastUpdate') || '')) {
            setTime(newState.time);
            setIsActive(newState.is_active);
            setIsBreak(newState.is_break);
            setCurrentPomodoroId(newState.current_pomodoro_id);
            localStorage.setItem('lastUpdate', newState.last_update);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, supabase]);

  // Sync periodically
  useEffect(() => {
    const syncInterval = setInterval(syncWithSupabase, 5000);
    return () => clearInterval(syncInterval);
  }, [syncWithSupabase]);

  const playNotificationSound = useCallback(async () => {
    try {
      if (!settings?.sound_enabled) return;

      // Resume audio context if suspended
      if (audioContextRef.current?.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      const context = audioContextRef.current || new AudioContext();
      const oscillator = context.createOscillator();
      const gainNode = context.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(context.destination);

      // Use a more pleasant notification sound
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(440, context.currentTime); // A4 note
      gainNode.gain.setValueAtTime(0.1, context.currentTime);

      oscillator.start(context.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.00001, context.currentTime + 0.5);
      oscillator.stop(context.currentTime + 0.5);

      // Show notification if permission granted
      if (Notification.permission === 'granted') {
        new Notification(isBreak ? 'Break time!' : 'Focus time!', {
          body: isBreak ? 'Time to take a break!' : 'Time to focus!',
          icon: '/favicon.ico',
          silent: true // We're handling the sound ourselves
        });
      }
    } catch (error) {
      console.error('Error playing notification:', error);
      // Fallback to system notification with sound
      if (Notification.permission === 'granted') {
        new Notification(isBreak ? 'Break time!' : 'Focus time!', {
          body: isBreak ? 'Time to take a break!' : 'Time to focus!',
          icon: '/favicon.ico',
          silent: false
        });
      }
    }
  }, [settings?.sound_enabled, isBreak]);

  // Request notification permission on mount
  useEffect(() => {
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Handle visibility change
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.hidden) {
        // Tab is hidden, sync state immediately
        await syncWithSupabase();
      } else {
        // Tab is visible again, sync and resume audio context
        await syncWithSupabase();
        if (audioContextRef.current?.state === 'suspended') {
          await audioContextRef.current.resume();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [syncWithSupabase]);

  // Timer logic with improved reliability
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;

    if (isActive && time > 0) {
      timer = setInterval(() => {
        setTime((prevTime) => {
          const newTime = Math.max(0, prevTime - 1);
          if (newTime === 0) {
            handleTimerComplete();
          }
          return newTime;
        });
      }, 1000);

      // Sync immediately when timer starts
      syncWithSupabase();
    }

    return () => {
      if (timer) {
        clearInterval(timer);
      }
    };
  }, [isActive]);

  const handleTimerComplete = async () => {
    if (!settings) return;

    try {
      // Stop the timer
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
    } catch (error) {
      console.error('Error completing timer:', error);
      toast({
        title: 'Error',
        description: 'Failed to complete the timer session',
        variant: 'destructive',
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

  return (
    <Card className="p-6 max-w-md mx-auto">
      <div className="flex flex-col items-center space-y-6">
        <div className="flex items-center justify-between w-full">
          <h2 className="text-2xl font-bold">
            {isBreak ? 'Break Time' : 'Focus Time'}
          </h2>
          {stats && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Badge variant={stats.completedPomodoros >= dailyGoal ? "secondary" : "default"}>
                    <Target className="w-4 h-4 mr-1" />
                    {stats.completedPomodoros}/{dailyGoal}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  Daily Pomodoro Goal
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        {!isBreak && !isActive && (
          <div className="w-full">
            <Label htmlFor="focusLabel">What are you focusing on?</Label>
            <Input
              id="focusLabel"
              value={focusLabel}
              onChange={(e) => setFocusLabel(e.target.value)}
              placeholder="e.g., React Hooks, Algorithm Practice"
              className="mt-1"
            />
          </div>
        )}
        
        <div className="relative" ref={timerRef}>
          <div className="text-6xl font-mono z-10 relative">
            {formatTime(time)}
          </div>
          <div className="absolute inset-0 -m-4">
            <div className="h-2">
              <Progress value={calculateProgress()} />
            </div>
          </div>
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
      />
    </Card>
  );
}
