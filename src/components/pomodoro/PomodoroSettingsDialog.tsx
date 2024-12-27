import React, { useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import Label from '../ui/label';
import { Input } from '../ui/input';
import Switch from '../ui/switch';
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
          {/* Existing settings fields... */}
          
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
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
