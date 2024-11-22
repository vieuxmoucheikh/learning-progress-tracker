import type { Progress, LearningItem } from '../types';
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

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

export function calculateTimeByCategory(items: LearningItem[]): Record<string, { hours: number; minutes: number }> {
  const categoryTimes: Record<string, number> = {};

  items.forEach(item => {
    const category = item.category;
    if (!categoryTimes[category]) {
      categoryTimes[category] = 0;
    }

    // Add time from completed sessions
    const sessionMinutes = item.progress.sessions.reduce((total, session) => {
      if (session.duration) {
        return total + (session.duration.hours * 60) + session.duration.minutes;
      }
      return total;
    }, 0);

    categoryTimes[category] += sessionMinutes;
  });

  // Convert minutes to hours and minutes format
  return Object.entries(categoryTimes).reduce((acc, [category, totalMinutes]) => {
    acc[category] = {
      hours: Math.floor(totalMinutes / 60),
      minutes: totalMinutes % 60
    };
    return acc;
  }, {} as Record<string, { hours: number; minutes: number }>);
}
