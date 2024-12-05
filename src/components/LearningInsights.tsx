import { useMemo, useEffect, useState } from 'react';
import { LearningItem, Session } from '../types';
import { Brain, Clock, Calendar } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { getSessions } from '@/lib/database';

interface Props {
  goalId?: string;
}

interface Analytics {
  totalTime: {
    hours: number;
    minutes: number;
  };
  sessionsCount: number;
  averageSessionTime: {
    hours: number;
    minutes: number;
  };
  activeDays: number;
}

export function LearningInsights({ goalId }: Props) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSessions() {
      if (!goalId) return;
      
      setIsLoading(true);
      setError(null);
      try {
        const goalSessions = await getSessions(goalId);
        setSessions(goalSessions);
      } catch (error) {
        console.error('Error fetching sessions:', error);
        setError('Failed to load learning sessions');
      } finally {
        setIsLoading(false);
      }
    }
    fetchSessions();
  }, [goalId]);

  const analytics = useMemo((): Analytics => {
    if (!sessions.length) {
      return {
        totalTime: { hours: 0, minutes: 0 },
        sessionsCount: 0,
        averageSessionTime: { hours: 0, minutes: 0 },
        activeDays: 0
      };
    }

    // Calculate total time
    const totalMinutes = sessions.reduce((total, session) => {
      return total + (session.duration.hours * 60) + session.duration.minutes;
    }, 0);

    const totalHours = Math.floor(totalMinutes / 60);
    const remainingMinutes = totalMinutes % 60;

    // Calculate average session time
    const avgMinutes = Math.round(totalMinutes / sessions.length);
    const avgHours = Math.floor(avgMinutes / 60);
    const avgMinutesRemaining = avgMinutes % 60;

    // Count unique active days
    const uniqueDays = new Set(sessions.map(s => s.date.split('T')[0])).size;

    return {
      totalTime: {
        hours: totalHours,
        minutes: remainingMinutes
      },
      sessionsCount: sessions.length,
      averageSessionTime: {
        hours: avgHours,
        minutes: avgMinutesRemaining
      },
      activeDays: uniqueDays
    };
  }, [sessions]);

  if (isLoading) {
    return <div className="p-4">Loading analytics...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 space-y-2">
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4 text-blue-500" />
            <h3 className="text-sm font-medium">Total Time Invested</h3>
          </div>
          <p className="text-2xl font-bold">
            {analytics.totalTime.hours}h {analytics.totalTime.minutes}m
          </p>
        </Card>

        <Card className="p-4 space-y-2">
          <div className="flex items-center space-x-2">
            <Brain className="h-4 w-4 text-green-500" />
            <h3 className="text-sm font-medium">Learning Sessions</h3>
          </div>
          <p className="text-2xl font-bold">{analytics.sessionsCount}</p>
          <p className="text-sm text-muted-foreground">
            Avg: {analytics.averageSessionTime.hours}h {analytics.averageSessionTime.minutes}m
          </p>
        </Card>

        <Card className="p-4 space-y-2">
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-purple-500" />
            <h3 className="text-sm font-medium">Active Days</h3>
          </div>
          <p className="text-2xl font-bold">{analytics.activeDays}</p>
        </Card>
      </div>
    </div>
  );
}
