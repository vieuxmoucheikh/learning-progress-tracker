import React, { useEffect, useState } from 'react';
import { Session } from '../types';
import { getSessions } from '../lib/database';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Progress } from '../ui/progress';
import { format, differenceInDays, parseISO, isAfter, isBefore, startOfDay, endOfDay, eachDayOfInterval, isSameDay, subDays } from 'date-fns';

interface LearningInsightsProps {
  goalId: string;
}

interface Analytics {
  totalTime: {
    hours: number;
    minutes: number;
  };
  sessionsCount: number;
  averageSessionLength: {
    hours: number;
    minutes: number;
  };
  activeDays: number;
  recentProgress: number;
  lastSession: string | null;
  currentStreak: number;
  longestStreak: number;
  weeklyAverage: {
    hours: number;
    minutes: number;
  };
}

export function LearningInsights({ goalId }: LearningInsightsProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<Analytics>({
    totalTime: { hours: 0, minutes: 0 },
    sessionsCount: 0,
    averageSessionLength: { hours: 0, minutes: 0 },
    activeDays: 0,
    recentProgress: 0,
    lastSession: null,
    currentStreak: 0,
    longestStreak: 0,
    weeklyAverage: { hours: 0, minutes: 0 },
  });

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        setLoading(true);
        setError(null);
        const fetchedSessions = await getSessions(goalId);
        setSessions(fetchedSessions.sort((a, b) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        ));
        calculateAnalytics(fetchedSessions);
      } catch (err) {
        console.error('Error fetching sessions:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch sessions');
      } finally {
        setLoading(false);
      }
    };

    if (goalId) {
      fetchSessions();
    }
  }, [goalId]);

  const calculateAnalytics = (sessions: Session[]) => {
    if (!sessions.length) {
      setAnalytics({
        totalTime: { hours: 0, minutes: 0 },
        sessionsCount: 0,
        averageSessionLength: { hours: 0, minutes: 0 },
        activeDays: 0,
        recentProgress: 0,
        lastSession: null,
        currentStreak: 0,
        longestStreak: 0,
        weeklyAverage: { hours: 0, minutes: 0 },
      });
      return;
    }

    // Sort sessions by date (newest first)
    const sortedSessions = [...sessions].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    // Calculate total time
    const totalMinutes = sortedSessions.reduce((total, session) => 
      total + (session.duration.hours * 60 + session.duration.minutes), 0
    );

    // Group sessions by day
    const sessionsByDay = sortedSessions.reduce((acc, session) => {
      const dateKey = format(new Date(session.date), 'yyyy-MM-dd');
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(session);
      return acc;
    }, {} as Record<string, Session[]>);

    // Calculate streaks
    const today = startOfDay(new Date());
    const yesterday = startOfDay(subDays(today, 1));
    const dates = Object.keys(sessionsByDay)
      .map(date => new Date(date))
      .sort((a, b) => b.getTime() - a.getTime());
    
    // Calculate current streak
    let currentStreak = 0;
    if (dates.length > 0) {
      const lastSessionDate = dates[0];
      if (isSameDay(lastSessionDate, today) || isSameDay(lastSessionDate, yesterday)) {
        currentStreak = 1;
        let checkDate = isSameDay(lastSessionDate, today) ? today : yesterday;
        
        for (let i = 1; i < dates.length; i++) {
          const prevDate = dates[i];
          if (differenceInDays(checkDate, prevDate) === 1) {
            currentStreak++;
            checkDate = prevDate;
          } else {
            break;
          }
        }
      }
    }

    // Calculate longest streak
    let longestStreak = 0;
    let tempStreak = 0;
    dates.forEach((date, index) => {
      if (index === 0) {
        tempStreak = 1;
      } else {
        if (differenceInDays(dates[index - 1], date) === 1) {
          tempStreak++;
        } else {
          longestStreak = Math.max(longestStreak, tempStreak);
          tempStreak = 1;
        }
      }
    });
    longestStreak = Math.max(longestStreak, tempStreak, currentStreak);

    // Calculate recent progress (last 30 days)
    const thirtyDaysAgo = subDays(today, 30);
    const recentSessions = sortedSessions.filter(session => {
      const sessionDate = new Date(session.date);
      return isAfter(sessionDate, thirtyDaysAgo) && isBefore(sessionDate, endOfDay(today));
    });

    const recentTotalMinutes = recentSessions.reduce((total, session) => 
      total + (session.duration.hours * 60 + session.duration.minutes), 0
    );

    // Calculate weekly average
    const weeklyTotalMinutes = recentTotalMinutes / 4.285714; // 30 days / 7 days per week

    // Calculate average session length
    const averageMinutes = Math.round(totalMinutes / sortedSessions.length);

    // Find last session date
    const lastSession = sortedSessions.length > 0 
      ? format(new Date(sortedSessions[0].date), 'PPP') 
      : null;

    setAnalytics({
      totalTime: {
        hours: Math.floor(totalMinutes / 60),
        minutes: totalMinutes % 60,
      },
      sessionsCount: sortedSessions.length,
      averageSessionLength: {
        hours: Math.floor(averageMinutes / 60),
        minutes: averageMinutes % 60,
      },
      activeDays: Object.keys(sessionsByDay).length,
      recentProgress: Math.min(100, Math.round((recentTotalMinutes / (30 * 45)) * 100)), // Target: 45 minutes per day
      lastSession,
      currentStreak,
      longestStreak,
      weeklyAverage: {
        hours: Math.floor(weeklyTotalMinutes / 60),
        minutes: Math.round(weeklyTotalMinutes % 60),
      },
    });
  };

  if (loading) {
    return (
      <div className="space-y-4 p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-500">
        <p>Error loading insights: {error}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="mt-2 text-sm text-blue-500 hover:text-blue-700"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle>Total Time Invested</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {analytics.totalTime.hours}h {analytics.totalTime.minutes}m
          </div>
          <p className="text-xs text-muted-foreground">
            Across {analytics.sessionsCount} sessions
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Weekly Average</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {analytics.weeklyAverage.hours}h {analytics.weeklyAverage.minutes}m
          </div>
          <p className="text-xs text-muted-foreground">
            Based on last 30 days
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Learning Streak</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {analytics.currentStreak} days
          </div>
          <p className="text-xs text-muted-foreground">
            Longest streak: {analytics.longestStreak} days
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Average Session</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {analytics.averageSessionLength.hours}h {analytics.averageSessionLength.minutes}m
          </div>
          <p className="text-xs text-muted-foreground">
            Per learning session
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Active Days</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {analytics.activeDays}
          </div>
          <p className="text-xs text-muted-foreground">
            Days with recorded sessions
          </p>
        </CardContent>
      </Card>

      <Card className="md:col-span-2 lg:col-span-3">
        <CardHeader>
          <CardTitle>30-Day Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <Progress value={analytics.recentProgress} className="h-2" />
          <p className="mt-2 text-sm text-muted-foreground">
            {analytics.recentProgress}% of target (45 min/day)
          </p>
          {analytics.lastSession && (
            <p className="mt-1 text-sm text-muted-foreground">
              Last session: {analytics.lastSession}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
