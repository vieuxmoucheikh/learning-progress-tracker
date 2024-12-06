import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Label from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import Switch from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { updatePomodoroSettings } from '@/lib/database';
import type { PomodoroSettings } from '@/types';

interface PomodoroSettingsDialogProps { 
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: PomodoroSettings | null;
  onSettingsChange: (settings: PomodoroSettings) => void;
}

export function PomodoroSettingsDialog({
  open,
  onOpenChange,
  settings,
  onSettingsChange,
}: PomodoroSettingsDialogProps) {
  const { toast } = useToast();

  const handleSettingChange = async (
    key: keyof PomodoroSettings,
    value: number | boolean
  ) => {
    if (!settings) return;

    try {
      const updatedSettings = {
        ...settings,
        [key]: value,
      };

      const result = await updatePomodoroSettings(updatedSettings);
      onSettingsChange(result);

      toast({
        title: "Settings Updated",
        description: "Your Pomodoro settings have been saved.",
      });
    } catch (error) {
      console.error('Error updating settings:', error);
      toast({
        title: "Error",
        description: "Failed to update settings",
        variant: "destructive",
      });
    }
  };

  if (!settings) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Pomodoro Settings</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 items-center gap-4">
            <Label htmlFor="workDuration">Work Duration (minutes)</Label>
            <Input
              id="workDuration"
              type="number"
              value={settings.work_duration}
              onChange={(e) => handleSettingChange('work_duration', parseInt(e.target.value))}
              min={1}
              max={60}
            />
          </div>
          <div className="grid grid-cols-2 items-center gap-4">
            <Label htmlFor="breakDuration">Break Duration (minutes)</Label>
            <Input
              id="breakDuration"
              type="number"
              value={settings.break_duration}
              onChange={(e) => handleSettingChange('break_duration', parseInt(e.target.value))}
              min={1}
              max={30}
            />
          </div>
          <div className="grid grid-cols-2 items-center gap-4">
            <Label htmlFor="longBreakDuration">Long Break Duration (minutes)</Label>
            <Input
              id="longBreakDuration"
              type="number"
              value={settings.long_break_duration}
              onChange={(e) => handleSettingChange('long_break_duration', parseInt(e.target.value))}
              min={1}
              max={60}
            />
          </div>
          <div className="grid grid-cols-2 items-center gap-4">
            <Label htmlFor="pomodorosUntilLongBreak">Pomodoros until Long Break</Label>
            <Input
              id="pomodorosUntilLongBreak"
              type="number"
              value={settings.pomodoros_until_long_break}
              onChange={(e) => handleSettingChange('pomodoros_until_long_break', parseInt(e.target.value))}
              min={1}
              max={10}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="autoStartBreaks">Auto-start Breaks</Label>
            <Switch
              id="autoStartBreaks"
              checked={settings.auto_start_breaks}
              handleToggle={() => handleSettingChange('auto_start_breaks', !settings.auto_start_breaks)}
              isOn={settings.auto_start_breaks}
              onColor="green"
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="autoStartPomodoros">Auto-start Pomodoros</Label>
            <Switch
              id="autoStartPomodoros"
              checked={settings.auto_start_pomodoros}
              handleToggle={() => handleSettingChange('auto_start_pomodoros', !settings.auto_start_pomodoros)}
              isOn={settings.auto_start_pomodoros}
              onColor="green"
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="soundEnabled">Sound Notifications</Label>
            <Switch
              id="soundEnabled"
              checked={settings.sound_enabled}
              handleToggle={() => handleSettingChange('sound_enabled', !settings.sound_enabled)}
              isOn={settings.sound_enabled}
              onColor="green"
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
