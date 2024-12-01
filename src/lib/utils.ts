import type { Progress, LearningItem, Session } from '../types';
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

export function calculateTotalTimeSpent(sessions: Session[]): number {
  return sessions.reduce((total, session) => {
    if (session.duration) {
      return total + (session.duration.hours * 60) + session.duration.minutes;
    }
    return total;
  }, 0);
}

export function formatDuration(time: { hours: number; minutes: number } | number | undefined): string {
  if (!time) return '0h 0m';
  
  if (typeof time === 'object') {
    const totalMinutes = (time.hours * 60) + time.minutes;
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return hours === 0 ? `${mins}m` : mins === 0 ? `${hours}h` : `${hours}h ${mins}m`;
  } else {
    const hours = Math.floor(time / 60);
    const mins = time % 60;
    return hours === 0 ? `${mins}m` : mins === 0 ? `${hours}h` : `${hours}h ${mins}m`;
  }
}

export function calculateProgress(progress: Progress): number {
  if (!progress.sessions) return 0;
  
  const totalSpentMinutes = calculateTotalTimeSpent(progress.sessions);
  const totalTargetMinutes = progress.total ? (progress.total.hours * 60) + progress.total.minutes : 0;
  
  if (totalTargetMinutes === 0) return 0;
  return Math.min(Math.round((totalSpentMinutes / totalTargetMinutes) * 100), 100);
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

export function calculateStreak(items: LearningItem[]): { currentStreak: number; longestStreak: number; lastActiveDate: string | null } {
  // Sort all sessions by date in descending order
  const sessions = items
    .flatMap(item => item.progress.sessions || [])
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (sessions.length === 0) {
    return { currentStreak: 0, longestStreak: 0, lastActiveDate: null };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  let currentStreak = 0;
  let longestStreak = 0;
  let currentDate = today;
  let streakBroken = false;
  let lastActiveDate = sessions[0].date;

  // Check if there's activity today
  const todayStr = today.toISOString().split('T')[0];
  const hasActivityToday = sessions.some(s => s.date.split('T')[0] === todayStr);
  
  if (!hasActivityToday) {
    // If no activity today, start checking from yesterday
    currentDate.setDate(currentDate.getDate() - 1);
  }

  while (!streakBroken) {
    const dateStr = currentDate.toISOString().split('T')[0];
    const hasSession = sessions.some(s => s.date.split('T')[0] === dateStr);
    
    if (!hasSession) {
      streakBroken = true;
    } else {
      currentStreak++;
      longestStreak = Math.max(longestStreak, currentStreak);
      currentDate.setDate(currentDate.getDate() - 1);
    }
  }

  return { currentStreak, longestStreak, lastActiveDate };
}
