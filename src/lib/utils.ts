import type { Progress } from '../types';

export function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(remainingSeconds)}`;
}

export function calculateProgress(progress: Progress): number {
  const currentMinutes = (progress.current.hours * 60) + progress.current.minutes;
  const totalMinutes = progress.total ? (progress.total.hours * 60) + progress.total.minutes : 0;
  
  if (totalMinutes === 0) return 0;
  
  const progressPercentage = (currentMinutes / totalMinutes) * 100;
  return Math.min(Math.max(progressPercentage, 0), 100);
}

export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}

export function getTotalMinutes(time: { hours: number; minutes: number }): number {
  return (time.hours * 60) + time.minutes;
}

export function minutesToTime(minutes: number): { hours: number; minutes: number } {
  return {
    hours: Math.floor(minutes / 60),
    minutes: minutes % 60
  };
}
