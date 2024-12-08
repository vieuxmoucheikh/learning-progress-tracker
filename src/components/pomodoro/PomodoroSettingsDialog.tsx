import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Label from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import Switch from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type { PomodoroSettings } from '@/types';

interface PomodoroSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSettingsUpdate: (settings: Partial<PomodoroSettings>) => void;
  initialSettings: PomodoroSettings | null;
}

export function PomodoroSettingsDialog({
  open,
  onOpenChange,
  onSettingsUpdate,
  initialSettings
}: PomodoroSettingsDialogProps) {
  const [settings, setSettings] = React.useState<Partial<PomodoroSettings>>({});

  React.useEffect(() => {
    if (initialSettings) {
      setSettings(initialSettings);
    }
  }, [initialSettings]);

  const handleChange = (key: keyof PomodoroSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
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
