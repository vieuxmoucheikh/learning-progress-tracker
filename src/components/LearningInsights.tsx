import React, { useEffect, useState } from 'react';
import { Session } from '../types';
import { getSessions } from '../lib/database';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card.tsx';
import { Progress } from '../ui/progress.tsx';
import { format, differenceInDays, parseISO, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns';

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
  });

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        setLoading(true);
        setError(null);
        const fetchedSessions = await getSessions(goalId);
        setSessions(fetchedSessions);
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
      });
      return;
    }

    // Calculate total time
    const totalMinutes = sessions.reduce((total, session) => {
      return total + (session.duration.hours * 60 + session.duration.minutes);
    }, 0);

    // Calculate unique active days
    const uniqueDays = new Set(sessions.map(session => format(parseISO(session.date), 'yyyy-MM-dd')));

    // Calculate recent progress
    const now = new Date();
    const thirtyDaysAgo = new Date(now.setDate(now.getDate() - 30));
    const recentSessions = sessions.filter(session => {
      const sessionDate = parseISO(session.date);
      return isAfter(sessionDate, thirtyDaysAgo) && isBefore(sessionDate, endOfDay(new Date()));
    });

    const recentTotalMinutes = recentSessions.reduce((total, session) => {
      return total + (session.duration.hours * 60 + session.duration.minutes);
    }, 0);

    // Calculate average session length
    const averageMinutes = Math.round(totalMinutes / sessions.length);

    // Find last session date
    const lastSession = sessions.length > 0 ? format(parseISO(sessions[0].date), 'PPP') : null;

    setAnalytics({
      totalTime: {
        hours: Math.floor(totalMinutes / 60),
        minutes: totalMinutes % 60,
      },
      sessionsCount: sessions.length,
      averageSessionLength: {
        hours: Math.floor(averageMinutes / 60),
        minutes: averageMinutes % 60,
      },
      activeDays: uniqueDays.size,
      recentProgress: Math.min(100, Math.round((recentTotalMinutes / (30 * 60)) * 100)), // Target: 1 hour per day
      lastSession,
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
            {analytics.recentProgress}% of target (1 hour/day)
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
