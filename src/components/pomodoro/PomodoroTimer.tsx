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

interface PomodoroTimerProps {
  onSessionComplete?: (sessionData: { duration: number; label: string; type: 'work' | 'break' }) => void;
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

  // Load timer state from localStorage and start background sync
  useEffect(() => {
    const loadTimerState = async () => {
      try {
        const pomodoroSettings = await getPomodoroSettings();
        setSettings(pomodoroSettings);
        
        const savedState = localStorage.getItem('pomodoroState');
        if (savedState) {
          const { time, isActive, isBreak, currentPomodoroId, startTime } = JSON.parse(savedState);
          
          if (isActive && startTime) {
            const now = Date.now();
            const elapsed = Math.floor((now - startTime) / 1000);
            const remainingTime = Math.max(0, time - elapsed);
            
            setTime(remainingTime);
            setIsActive(true);
            setIsBreak(isBreak);
            if (currentPomodoroId) {
              setCurrentPomodoroId(currentPomodoroId);
            }
          } else {
            const defaultTime = isBreak ? 
              (pomodoroSettings.break_duration * 60) : 
              (pomodoroSettings.work_duration * 60);
            setTime(defaultTime);
            setIsBreak(isBreak);
            setIsActive(false);
          }
        } else {
          setTime(pomodoroSettings.work_duration * 60);
          setIsBreak(false);
          setIsActive(false);
        }

        const pomodoroStats = await getPomodoroStats();
        setStats(pomodoroStats);
      } catch (error) {
        console.error('Error loading timer state:', error);
      }
    };

    loadTimerState();

    // Set up background sync
    const syncInterval = setInterval(() => {
      const savedState = localStorage.getItem('pomodoroState');
      if (savedState) {
        const { isActive, startTime } = JSON.parse(savedState);
        if (isActive && startTime) {
          const now = Date.now();
          const elapsed = Math.floor((now - startTime) / 1000);
          setTime(prev => Math.max(0, prev - elapsed));
        }
      }
    }, 1000);

    return () => clearInterval(syncInterval);
  }, []);

  // Save timer state with accurate timestamps
  useEffect(() => {
    if (time >= 0) {
      const state = {
        time,
        isActive,
        isBreak,
        currentPomodoroId,
        startTime: isActive ? Date.now() - ((settings?.work_duration || 25) * 60 - time) * 1000 : null
      };
      localStorage.setItem('pomodoroState', JSON.stringify(state));
    }
  }, [time, isActive, isBreak, currentPomodoroId, settings]);

  // Timer logic
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isActive && time > 0) {
      const startTime = Date.now();
      
      interval = setInterval(() => {
        const currentTime = Date.now();
        const elapsedSeconds = Math.floor((currentTime - startTime) / 1000);
        
        setTime((prevTime) => {
          const newTime = Math.max(0, prevTime - 1);
          
          // Save state to localStorage
          const state = {
            time: newTime,
            isActive,
            isBreak,
            currentPomodoroId,
            startTime: currentTime - ((settings?.work_duration || 25) * 60 - newTime) * 1000
          };
          localStorage.setItem('pomodoroState', JSON.stringify(state));
          
          if (newTime === 0) {
            handleTimerComplete();
          }
          return newTime;
        });
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isActive, isBreak]);

  // Handle visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && isActive) {
        const savedState = localStorage.getItem('pomodoroState');
        if (savedState) {
          const { time: savedTime, startTime } = JSON.parse(savedState);
          if (startTime) {
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            const remainingTime = Math.max(0, savedTime - elapsed);
            setTime(remainingTime);
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isActive]);

  const handleTimerComplete = async () => {
    if (!settings) return;

    try {
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
      let newTime;
      if (newIsBreak) {
        const completedPomodoros = (stats?.completedPomodoros || 0) + 1;
        const isLongBreak = completedPomodoros % settings.pomodoros_until_long_break === 0;
        newTime = (isLongBreak ? settings.long_break_duration : settings.break_duration) * 60;
      } else {
        newTime = settings.work_duration * 60;
      }

      // Update time and state
      setTime(newTime);
      setIsActive(false);

      // Start new session if auto-start is enabled
      if ((newIsBreak && settings.auto_start_breaks) || (!newIsBreak && settings.auto_start_pomodoros)) {
        const newPomodoro = await startPomodoro(newIsBreak ? 'break' : 'work');
        setCurrentPomodoroId(newPomodoro.id);
        setIsActive(true);
      }

      // Refresh stats
      const newStats = await getPomodoroStats();
      setStats(newStats);

      // Show completion notification
      toast({
        title: newIsBreak ? 'Time for a break! 🎉' : 'Break complete!',
        description: newIsBreak ? 'Great work! Take some time to rest.' : 'Ready to focus again?',
      });

      // Update localStorage
      localStorage.setItem('pomodoroState', JSON.stringify({
        time: newTime,
        isActive: (newIsBreak && settings.auto_start_breaks) || (!newIsBreak && settings.auto_start_pomodoros),
        isBreak: newIsBreak,
        currentPomodoroId: null,
        startTime: Date.now()
      }));

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
      
      // Update localStorage
      localStorage.setItem('pomodoroState', JSON.stringify({
        time,
        isActive: true,
        isBreak: type === 'break',
        currentPomodoroId: pomodoro.id,
        startTime: Date.now()
      }));
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
    if (!isActive && !currentPomodoroId) {
      await startNewPomodoro(isBreak ? 'break' : 'work');
    } else {
      setIsActive(!isActive);
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

  const playNotificationSound = () => {
    try {
      // Use a simple beep sound as a fallback
      const beep = () => {
        const context = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = context.createOscillator();
        const gainNode = context.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(context.destination);
        
        oscillator.type = 'sine';
        oscillator.frequency.value = 800;
        gainNode.gain.value = 0.1;
        
        oscillator.start(0);
        gainNode.gain.exponentialRampToValueAtTime(0.00001, context.currentTime + 0.5);
        
        setTimeout(() => {
          oscillator.stop();
          context.close();
        }, 500);
      };

      // Only play if sound is enabled in settings
      if (settings?.sound_enabled) {
        beep();
        
        // Also show notification if available
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Pomodoro Timer', {
            body: isBreak ? 'Break time is over!' : 'Time to take a break!',
          });
        }
      }
    } catch (error) {
      console.error('Error with audio:', error);
      // Fallback to just notification if audio fails
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Pomodoro Timer', {
          body: isBreak ? 'Break time is over!' : 'Time to take a break!',
        });
      }
    }
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
