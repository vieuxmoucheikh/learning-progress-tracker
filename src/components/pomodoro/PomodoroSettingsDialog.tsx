import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Switch } from '../ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Button } from '../ui/button';
import type { PomodoroSettings } from '../../types';

type Theme = 'light' | 'dark' | 'system';

interface PomodoroSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSettingsUpdate: (settings: Partial<PomodoroSettings>) => void;
  initialSettings: PomodoroSettings | null;
  isActive: boolean;
  children?: React.ReactNode;
}

export function PomodoroSettingsDialog({
  open,
  onOpenChange,
  onSettingsUpdate,
  initialSettings,
  isActive,
  children
}: PomodoroSettingsDialogProps) {
  const [settings, setSettings] = React.useState<Partial<PomodoroSettings>>({});

  // Theme handling
  const applyTheme = (theme: Theme) => {
    const root = document.documentElement;
    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.remove('light', 'dark');
      root.classList.add(systemTheme);
    } else {
      root.classList.remove('light', 'dark');
      root.classList.add(theme);
    }
    localStorage.setItem('theme', theme);
  };

  // Initialize theme from localStorage or system preference
  useEffect(() => {
    const savedTheme = (localStorage.getItem('theme') as Theme) || 'system';
    setSettings(prev => ({ ...prev, theme: savedTheme }));
    applyTheme(savedTheme);
  }, []);

  // Watch for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = (e: MediaQueryListEvent) => {
      if (settings.theme === 'system') {
        applyTheme(e.matches ? 'dark' : 'light');
      }
    };
    mediaQuery.addEventListener('change', handleSystemThemeChange);
    return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
  }, [settings.theme]);

  React.useEffect(() => {
    if (initialSettings) {
      setSettings(initialSettings);
    }
  }, [initialSettings]);

  const handleChange = (key: keyof PomodoroSettings, value: unknown) => {
    if (key === 'theme' && !['light', 'dark', 'system'].includes(value as string)) {
      return;
    }
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    
    // Apply theme immediately when changed
    if (key === 'theme' && typeof value === 'string' && ['light', 'dark', 'system'].includes(value)) {
      applyTheme(value as Theme);
    }
  };

  const handleSave = () => {
    onSettingsUpdate(settings);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto"
        aria-describedby="settings-description"
      >
        <DialogHeader>
          <DialogTitle>Pomodoro Settings</DialogTitle>
          <p id="settings-description" className="text-sm text-muted-foreground">
            Customize your Pomodoro timer settings and preferences.
          </p>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="workDuration">Work Duration (minutes)</Label>
            <Input
              id="workDuration"
              type="number"
              value={settings.work_duration || 25}
              onChange={(e) => handleChange('work_duration', parseInt(e.target.value))}
              min={1}
              max={60}
            />
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="breakDuration">Break Duration (minutes)</Label>
            <Input
              id="breakDuration"
              type="number"
              value={settings.break_duration || 5}
              onChange={(e) => handleChange('break_duration', parseInt(e.target.value))}
              min={1}
              max={30}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="longBreakDuration">Long Break Duration (minutes)</Label>
            <Input
              id="longBreakDuration"
              type="number"
              value={settings.long_break_duration || 15}
              onChange={(e) => handleChange('long_break_duration', parseInt(e.target.value))}
              min={1}
              max={60}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="pomodorosUntilLongBreak">Pomodoros until Long Break</Label>
            <Input
              id="pomodorosUntilLongBreak"
              type="number"
              value={settings.pomodoros_until_long_break || 4}
              onChange={(e) => handleChange('pomodoros_until_long_break', parseInt(e.target.value))}
              min={1}
              max={10}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="dailyGoal">Daily Pomodoro Goal</Label>
            <Input
              id="dailyGoal"
              type="number"
              value={settings.daily_goal || 8}
              onChange={(e) => handleChange('daily_goal', parseInt(e.target.value))}
              min={1}
              max={20}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="soundEnabled">Sound Notifications</Label>
            <Switch
              id="soundEnabled"
              checked={settings.sound_enabled ?? false}
              handleToggle={() => handleChange('sound_enabled', !settings.sound_enabled)}
              isOn={settings.sound_enabled ?? false}
              onColor="green"
            />
          </div>

          {settings.sound_enabled && (
            <div className="grid gap-2">
              <Label htmlFor="soundEnabled">Sound Enabled</Label>
              <p className="text-sm text-muted-foreground">
                Default sound will be used for notifications
              </p>
            </div>
          )}

          <div className="flex items-center justify-between">
            <Label htmlFor="notificationEnabled">Desktop Notifications</Label>
            <Switch
              id="notificationEnabled"
              checked={settings.notification_enabled ?? false}
              handleToggle={() => handleChange('notification_enabled', !(settings.notification_enabled ?? false))}
              isOn={settings.notification_enabled ?? false}
              onColor="green"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="vibrationEnabled">Vibration</Label>
            <Switch
              id="vibrationEnabled"
              checked={settings.vibration_enabled ?? false}
              handleToggle={() => handleChange('vibration_enabled', !(settings.vibration_enabled ?? false))}
              isOn={settings.vibration_enabled ?? false}
              onColor="green"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="autoStartBreaks">Auto-start Breaks</Label>
            <Switch
              id="autoStartBreaks"
              checked={!!(settings.auto_start_breaks ?? false)}
              handleToggle={() => handleChange('auto_start_breaks', !(settings.auto_start_breaks ?? false))}
              isOn={!!(settings.auto_start_breaks ?? false)}
              onColor="green"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="autoStartPomodoros">Auto-start Pomodoros</Label>
            <Switch
              id="autoStartPomodoros"
              checked={settings.auto_start_pomodoros ?? false}
              handleToggle={() => handleChange('auto_start_pomodoros', !(settings.auto_start_pomodoros ?? false))}
              isOn={settings.auto_start_pomodoros ?? false}
              onColor="green"
            />
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="theme">Theme</Label>
            <Select
              value={settings.theme || 'system'}
              onValueChange={(value) => handleChange('theme', value)}
            >
              <SelectTrigger id="theme">
                <SelectValue placeholder="Select theme" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end gap-4">
          <Button 
            onClick={() => onOpenChange(false)}
            className="border border-slate-600 text-slate-200 hover:bg-slate-700 hover:text-white"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            className="bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/20"
          >
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
