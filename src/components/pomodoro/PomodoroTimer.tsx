import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import {
  startPomodoro, 
  completePomodoro,
  getPomodoroSettings,
  getPomodoroStats
} from '@/lib/database';
import { PomodoroSettings, PomodoroStats } from '@/types';
import { PomodoroSettingsDialog } from './PomodoroSettingsDialog';
import { PomodoroStats as PomodoroStatsComponent } from './PomodoroStats';
import { PlayIcon, PauseIcon, SkipForwardIcon, Settings2Icon } from 'lucide-react';

export function PomodoroTimer() {
  const [time, setTime] = useState(25 * 60); // Default 25 minutes in seconds
  const [isActive, setIsActive] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [settings, setSettings] = useState<PomodoroSettings | null>(null);
  const [stats, setStats] = useState<PomodoroStats | null>(null);
  const [currentPomodoroId, setCurrentPomodoroId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { toast } = useToast();

  // Load settings and stats
  useEffect(() => {
    const loadData = async () => {
      try {
        const pomodoroSettings = await getPomodoroSettings();
        setSettings(pomodoroSettings);
        setTime(pomodoroSettings.work_duration * 60);
        
        const pomodoroStats = await getPomodoroStats();
        setStats(pomodoroStats);
      } catch (error) {
        console.error('Error loading Pomodoro data:', error);
        toast({
          title: "Error",
          description: "Failed to load Pomodoro settings",
          variant: "destructive",
        });
      }
    };
    loadData();
  }, []);

  // Timer logic
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isActive && time > 0) {
      interval = setInterval(() => {
        setTime((time) => time - 1);
      }, 1000);
    } else if (time === 0) {
      handleTimerComplete();
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, time]);

  const handleTimerComplete = async () => {
    if (!settings) return;

    // Ensure currentPomodoroId is available
    if (!currentPomodoroId) {
      console.error('Missing currentPomodoroId');
      return;
    }

    // Play sound if enabled
    if (settings.sound_enabled) {
      playNotificationSound();
    }

    try {
      await completePomodoro(currentPomodoroId);
      // Refresh stats
      const newStats = await getPomodoroStats();
      setStats(newStats);
    } catch (error) {
      console.error('Error completing Pomodoro:', error);
    }

    // Switch between work and break
    setIsBreak(!isBreak);
    if (!isBreak) {
      // Work period completed, start break
      const breakDuration = settings.break_duration;
      setTime(breakDuration * 60);
      if (settings.auto_start_breaks) {
        startNewPomodoro('break');
      } else {
        setIsActive(false);
      }
    } else {
      // Break completed, start work
      setTime(settings.work_duration * 60);
      if (settings.auto_start_pomodoros) {
        startNewPomodoro('work');
      } else {
        setIsActive(false);
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
        title: "Error",
        description: "Failed to start Pomodoro session",
        variant: "destructive",
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
    setTime(0);
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const playNotificationSound = () => {
    const audio = new Audio('/notification.mp3'); // Make sure to add this sound file to your public folder
    audio.play().catch(error => console.error('Error playing sound:', error));
  };

  return (
    <Card className="p-6 max-w-md mx-auto">
      <div className="flex flex-col items-center space-y-6">
        <h2 className="text-2xl font-bold">
          {isBreak ? 'Break Time' : 'Focus Time'}
        </h2>
        
        <div className="text-6xl font-mono">
          {formatTime(time)}
        </div>

        <div className="flex space-x-4">
          <Button
            onClick={toggleTimer}
            variant="default"
            size="lg"
            className="w-24"
          >
            {isActive ? <PauseIcon className="h-6 w-6" /> : <PlayIcon className="h-6 w-6" />}
          </Button>

          <Button
            onClick={skipCurrentInterval}
            variant="outline"
            size="lg"
          >
            <SkipForwardIcon className="h-6 w-6" />
          </Button>

          <Button
            onClick={() => setSettingsOpen(true)}
            variant="outline"
            size="lg"
          >
            <Settings2Icon className="h-6 w-6" />
          </Button>
        </div>

        {stats && <PomodoroStatsComponent stats={stats} />}
      </div>

      <PomodoroSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        settings={settings}
        onSettingsChange={setSettings}
      />
    </Card>
  );
}
