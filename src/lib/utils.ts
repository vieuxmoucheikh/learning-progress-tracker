import type { Progress, LearningItem, Session, GoalSession } from '../types';
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

export function getTotalMinutes(sessions: (Session | GoalSession)[]): number {
  return sessions.reduce((total, session) => {
    if (session.duration) {
      return total + (session.duration.hours * 60) + session.duration.minutes;
    }
    if ('startTime' in session && session.startTime) {
      const start = new Date(session.startTime);
      const end = session.endTime ? new Date(session.endTime) : new Date();
      const minutes = Math.floor((end.getTime() - start.getTime()) / (1000 * 60));
      return total + minutes;
    }
    return total;
  }, 0);
}

export function formatDuration(time: { hours: number; minutes: number } | number | undefined): string {
  if (!time) return '0h 0m';
  
  if (typeof time === 'object') {
    const hours = time.hours || 0;
    const minutes = time.minutes || 0;
    if (hours === 0) return `${minutes}m`;
    if (minutes === 0) return `${hours}h`;
    return `${hours}h ${minutes}m`;
  } else {
    const hours = Math.floor(time / 60);
    const minutes = time % 60;
    if (hours === 0) return `${minutes}m`;
    if (minutes === 0) return `${hours}h`;
    return `${hours}h ${minutes}m`;
  }
}

export function calculateProgress(item: LearningItem): number {
  if (!item.progress?.sessions || !item.progress?.total) return 0;
  
  const totalSpentMinutes = getTotalMinutes(item.progress.sessions);
  const totalTargetMinutes = (item.progress.total.hours * 60) + item.progress.total.minutes;
  
  if (totalTargetMinutes === 0) return 0;
  return Math.min(Math.round((totalSpentMinutes / totalTargetMinutes) * 100), 100);
}

export function calculateDuration(startTime: Date, endTime: Date) {
  const diffMinutes = Math.floor((endTime.getTime() - startTime.getTime()) / (1000 * 60));
  return {
    hours: Math.floor(diffMinutes / 60),
    minutes: diffMinutes % 60
  };
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
    const category = item.category || "Uncategorized";
    if (!categoryTimes[category]) {
      categoryTimes[category] = 0;
    }

    // Add time from completed sessions
    const sessionMinutes = (item.progress?.sessions || []).reduce((total, session) => {
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

// Fonction améliorée pour calculer le streak avec une meilleure gestion des erreurs
export function calculateStreak(items: LearningItem[]): { currentStreak: number; longestStreak: number; lastActiveDate: string | null } {
  try {
    // Sort all sessions by date in descending order
    const sessions = items
      .flatMap(item => item.progress?.sessions || [])
      .filter(session => Boolean(session.date || session.startTime)) // Assurez-vous que la date existe
      .sort((a, b) => {
        const dateA = new Date(a.date || a.startTime || '').getTime();
        const dateB = new Date(b.date || b.startTime || '').getTime();
        return dateB - dateA;
      });

    if (sessions.length === 0) {
      return { currentStreak: 0, longestStreak: 0, lastActiveDate: null };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let currentStreak = 0;
    let longestStreak = 0;
    let currentDate = today;
    let streakBroken = false;
    let lastActiveDate = sessions[0].date || sessions[0].startTime || null;

    // Check if there's activity today
    const todayStr = today.toISOString().split('T')[0];
    const hasActivityToday = sessions.some(s => {
      const sessionDate = s.date || s.startTime || '';
      return sessionDate.startsWith(todayStr);
    });
    
    if (!hasActivityToday) {
      // If no activity today, start checking from yesterday
      currentDate.setDate(currentDate.getDate() - 1);
    }

    while (!streakBroken) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const hasSession = sessions.some(s => {
        const sessionDate = s.date || s.startTime || '';
        return sessionDate.startsWith(dateStr);
      });
      
      if (!hasSession) {
        streakBroken = true;
      } else {
        currentStreak++;
        longestStreak = Math.max(longestStreak, currentStreak);
        currentDate.setDate(currentDate.getDate() - 1);
      }
    }

    return { currentStreak, longestStreak, lastActiveDate };
  } catch (error) {
    console.error("Error calculating streak:", error);
    return { currentStreak: 0, longestStreak: 0, lastActiveDate: null };
  }
}

// Fonction sûre pour calculer le pourcentage avec protection contre division par zéro
export function safePercentage(value: number, total: number, defaultValue = 0): number {
  if (total === 0 || isNaN(value) || isNaN(total)) {
    return defaultValue;
  }
  return Math.min(100, Math.round((value / total) * 100));
}

// Fonction utilitaire pour extraire la date à partir de différents formats
export function extractDateString(dateValue: string | undefined): string | null {
  if (!dateValue) return null;
  
  try {
    if (dateValue.includes('T')) {
      return dateValue.split('T')[0];
    }
    
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) {
      return null;
    }
    
    return date.toISOString().split('T')[0];
  } catch (error) {
    console.error("Error extracting date:", error);
    return null;
  }
}

// Fonction pour vérifier si deux dates sont le même jour
export function isSameDay(date1: Date | string, date2: Date | string): boolean {
  try {
    const d1 = typeof date1 === 'string' ? new Date(date1) : date1;
    const d2 = typeof date2 === 'string' ? new Date(date2) : date2;
    
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  } catch (error) {
    return false;
  }
}
