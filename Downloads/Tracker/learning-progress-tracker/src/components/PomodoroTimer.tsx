import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Progress from '@/components/ui/progress';
import { Timer, Pause, Play, SkipForward, Settings2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import {
  startPomodoro,
  completePomodoro,
  getPomodoroSettings,
  updatePomodoroSettings, 
  getPomodoroStats
} from '@/lib/database';
import type { PomodoroSettings, Pomodoro, PomodoroStats } from '@/types';

const TIMER_STATES = {
  IDLE: 'idle',
  RUNNING: 'running',
  PAUSED: 'paused',
  BREAK: 'break'
} as const;

type TimerState = typeof TIMER_STATES[keyof typeof TIMER_STATES];

interface Props {
  onComplete?: () => void;
}

export default function PomodoroTimer({ onComplete }: Props) {
  const { toast } = useToast();
  const [settings, setSettings] = useState<PomodoroSettings | null>(null);
  const [timerState, setTimerState] = useState<TimerState>(TIMER_STATES.IDLE);
  const [timeLeft, setTimeLeft] = useState(0);
  const [currentPomodoro, setCurrentPomodoro] = useState<Pomodoro | null>(null);
  const [stats, setStats] = useState<PomodoroStats | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  // Load settings and stats
  useEffect(() => {
    const loadData = async () => {
      try {
        const [settingsData, statsData] = await Promise.all([
          getPomodoroSettings(),
          getPomodoroStats()
        ]);
        setSettings(settingsData);
        setStats(statsData);
        setTimeLeft(settingsData.work_duration * 60);
      } catch (error) {
        console.error('Error loading Pomodoro data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load Pomodoro settings',
          variant: 'destructive',
        });
      }
    };
    loadData();
  }, []);

  // Timer logic
  useEffect(() => {
    if (timerState !== TIMER_STATES.RUNNING) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleTimerComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timerState]);

  const handleTimerComplete = async () => {
    if (!currentPomodoro || !settings) return;

    try {
      await completePomodoro(currentPomodoro.id);
      playSound();

      if (currentPomodoro.type === 'work') {
        const completedPomodoros = (stats?.completedPomodoros || 0) + 1;
        const isLongBreak = completedPomodoros % settings.pomodoros_until_long_break === 0;
        const breakDuration = isLongBreak ? settings.long_break_duration : settings.break_duration;

        toast({
          title: 'Pomodoro Complete! 🎉',
          description: `Time for a ${isLongBreak ? 'long ' : ''}break!`,
        });

        if (settings.auto_start_breaks) {
          startBreak();
        } else {
          setTimerState(TIMER_STATES.IDLE);
          setTimeLeft(breakDuration * 60);
        }
      } else {
        toast({
          title: 'Break Complete!',
          description: 'Ready to start another Pomodoro?',
        });

        if (settings.auto_start_pomodoros) {
          startTimer('work');
        } else {
          setTimerState(TIMER_STATES.IDLE);
          setTimeLeft(settings.work_duration * 60);
        }
      }

      // Refresh stats
      const newStats = await getPomodoroStats();
      setStats(newStats);
    } catch (error) {
      console.error('Error completing Pomodoro:', error);
      toast({
        title: 'Error',
        description: 'Failed to complete Pomodoro session',
        variant: 'destructive',
      });
    } finally {
      if (onComplete) {
        onComplete();
      }
    }
  };

  const startTimer = async (type: 'work' | 'break' = 'work') => {
    if (!settings) return;

    try {
      const pomodoro = await startPomodoro(type);
      setCurrentPomodoro(pomodoro);
      setTimerState(TIMER_STATES.RUNNING);
      setTimeLeft(type === 'work' ? settings.work_duration * 60 : 
        (type === 'break' && stats?.completedPomodoros && 
         stats.completedPomodoros % settings.pomodoros_until_long_break === 0)
          ? settings.long_break_duration * 60
          : settings.break_duration * 60
      );
    } catch (error) {
      console.error('Error starting Pomodoro:', error);
      toast({
        title: 'Error',
        description: 'Failed to start Pomodoro session',
        variant: 'destructive',
      });
    }
  };

  const pauseTimer = () => {
    setTimerState(TIMER_STATES.PAUSED);
  };

  const resumeTimer = () => {
    setTimerState(TIMER_STATES.RUNNING);
  };

  const skipTimer = async () => {
    if (!currentPomodoro) return;
    await handleTimerComplete();
  };

  const startBreak = () => {
    startTimer('break');
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const calculateProgress = (): number => {
    if (!settings || !currentPomodoro) return 0;
    const totalSeconds = currentPomodoro.type === 'work'
      ? settings.work_duration * 60
      : settings.break_duration * 60;
    return ((totalSeconds - timeLeft) / totalSeconds) * 100;
  };

  const playSound = () => {
    if (!settings?.sound_enabled) return;
    // You can implement different sounds for work/break completion
    const audio = new Audio('/notification.mp3');
    audio.play().catch(console.error);
  };

  const handleSettingsSave = async (newSettings: Partial<PomodoroSettings>) => {
    try {
      const updatedSettings = await updatePomodoroSettings(newSettings);
      setSettings(updatedSettings);
      setShowSettings(false);
      toast({
        title: 'Settings Updated',
        description: 'Your Pomodoro settings have been saved',
      });
    } catch (error) {
      console.error('Error updating settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to update settings',
        variant: 'destructive',
      });
    }
  };

  if (!settings) return null;

  return (
    <Card className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">
          {currentPomodoro?.type === 'break' ? 'Break Time' : 'Focus Time'}
        </h3>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowSettings(true)}
        >
          <Settings2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-4">
        <div className="text-center">
          <span className="text-4xl font-bold">{formatTime(timeLeft)}</span>
        </div>

        <div className="h-2">
          <Progress value={calculateProgress()} />
        </div>

        <div className="flex justify-center gap-2">
          {timerState === TIMER_STATES.IDLE && (
            <Button onClick={() => startTimer('work')}>
              <Play className="h-4 w-4 mr-2" />
              Start Pomodoro
            </Button>
          )}

          {timerState === TIMER_STATES.RUNNING && (
            <>
              <Button onClick={pauseTimer}>
                <Pause className="h-4 w-4 mr-2" />
                Pause
              </Button>
              <Button variant="outline" onClick={skipTimer}>
                <SkipForward className="h-4 w-4" />
              </Button>
            </>
          )}

          {timerState === TIMER_STATES.PAUSED && (
            <Button onClick={resumeTimer}>
              <Play className="h-4 w-4 mr-2" />
              Resume
            </Button>
          )}
        </div>

        {stats && (
          <div className="pt-4 border-t space-y-2 text-sm text-muted-foreground">
            <div className="flex justify-between">
              <span>Completed Today:</span>
              <span>{stats.completedPomodoros}</span>
            </div>
            <div className="flex justify-between">
              <span>Focus Time:</span>
              <span>{Math.round(stats.totalWorkMinutes / 60)}h {stats.totalWorkMinutes % 60}m</span>
            </div>
            <div className="flex justify-between">
              <span>Current Streak:</span>
              <span>{stats.currentStreak} days</span>
            </div>
          </div>
        )}
      </div>

      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pomodoro Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Work Duration (minutes)</Label>
              <Input
                type="number"
                value={settings.work_duration}
                onChange={(e) => handleSettingsSave({ work_duration: parseInt(e.target.value) })}
                min={1}
                max={60}
              />
            </div>
            <div className="space-y-2">
              <Label>Break Duration (minutes)</Label>
              <Input
                type="number"
                value={settings.break_duration}
                onChange={(e) => handleSettingsSave({ break_duration: parseInt(e.target.value) })}
                min={1}
                max={30}
              />
            </div>
            <div className="space-y-2">
              <Label>Long Break Duration (minutes)</Label>
              <Input
                type="number"
                value={settings.long_break_duration}
                onChange={(e) => handleSettingsSave({ long_break_duration: parseInt(e.target.value) })}
                min={1}
                max={60}
              />
            </div>
            <div className="space-y-2">
              <Label>Pomodoros until Long Break</Label>
              <Input
                type="number"
                value={settings.pomodoros_until_long_break}
                onChange={(e) => handleSettingsSave({ pomodoros_until_long_break: parseInt(e.target.value) })}
                min={1}
                max={10}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Auto-start Breaks</Label>
              <Switch
                id="auto-start-breaks"
                checked={settings.auto_start_breaks}
                isOn={settings.auto_start_breaks}
                onColor="#4CAF50"
                handleToggle={() => handleSettingsSave({ auto_start_breaks: !settings.auto_start_breaks })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Auto-start Pomodoros</Label>
              <Switch
                id="auto-start-pomodoros"
                checked={settings.auto_start_pomodoros}
                isOn={settings.auto_start_pomodoros}
                onColor="#4CAF50"
                handleToggle={() => handleSettingsSave({ auto_start_pomodoros: !settings.auto_start_pomodoros })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Sound Notifications</Label>
              <Switch
                id="sound-notifications"
                checked={settings.sound_enabled}
                isOn={settings.sound_enabled}
                onColor="#4CAF50"
                handleToggle={() => handleSettingsSave({ sound_enabled: !settings.sound_enabled })}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
