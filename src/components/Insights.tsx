import { useMemo } from 'react';
import { LearningItem } from '../types';
import { 
  BarChart3, 
  Brain, 
  Clock, 
  Flame, 
  Star, 
  Target
} from 'lucide-react';

interface Props {
  items: LearningItem[];
}

interface InsightMetric {
  title: string;
  value: string | number;
  description: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  icon: React.ReactNode;
  color: string;
}

interface LearningPattern {
  pattern: string;
  recommendation: string;
  impact: 'high' | 'medium' | 'low';
}

export function Insights({ items }: Props) {
  const metrics = useMemo(() => {
    // Calculate total study time
    const totalMinutes = items.reduce((acc, item) => {
      return acc + (item.progress.sessions?.reduce((mins, session) => {
        return mins + ((session.duration?.hours || 0) * 60 + (session.duration?.minutes || 0));
      }, 0) || 0);
    }, 0);

    // Calculate completion rate
    const completedItems = items.filter(item => item.completed).length;
    const completionRate = items.length ? (completedItems / items.length) * 100 : 0;

    // Calculate streak
    const sessions = items
      .flatMap(item => item.progress.sessions || [])
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    const today = new Date();
    let streak = 0;
    let currentDate = today;
    
    while (true) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const hasSession = sessions.some(s => s.date.split('T')[0] === dateStr);
      
      if (!hasSession) break;
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    }

    // Calculate average daily study time
    const uniqueDates = new Set(sessions.map(s => s.date.split('T')[0]));
    const avgDailyMinutes = uniqueDates.size ? totalMinutes / uniqueDates.size : 0;

    // Calculate most productive time
    const hourCounts: { [hour: number]: number } = {};
    sessions.forEach(session => {
      const hour = new Date(session.date).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    const mostProductiveHour = Object.entries(hourCounts)
      .sort(([, a], [, b]) => b - a)[0]?.[0];

    const formatTime = (hour: number) => {
      const period = hour >= 12 ? 'PM' : 'AM';
      const adjustedHour = hour % 12 || 12;
      return `${adjustedHour}${period}`;
    };

    return [
      {
        title: 'Total Learning Time',
        value: `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`,
        description: 'Total time invested in learning',
        icon: <Clock className="w-5 h-5" />,
        color: 'text-blue-500',
      },
      {
        title: 'Current Streak',
        value: streak,
        description: 'Consecutive days of learning',
        icon: <Flame className="w-5 h-5" />,
        color: 'text-orange-500',
        trend: {
          value: streak,
          isPositive: streak > 0,
        },
      },
      {
        title: 'Completion Rate',
        value: `${Math.round(completionRate)}%`,
        description: 'Tasks completed vs total tasks',
        icon: <Target className="w-5 h-5" />,
        color: 'text-green-500',
        trend: {
          value: completionRate,
          isPositive: completionRate > 70,
        },
      },
      {
        title: 'Daily Average',
        value: `${Math.round(avgDailyMinutes)} min`,
        description: 'Average daily learning time',
        icon: <BarChart3 className="w-5 h-5" />,
        color: 'text-purple-500',
      },
      {
        title: 'Peak Performance',
        value: mostProductiveHour ? formatTime(parseInt(mostProductiveHour)) : 'N/A',
        description: 'Most productive time of day',
        icon: <Star className="w-5 h-5" />,
        color: 'text-yellow-500',
      },
      {
        title: 'Active Topics',
        value: new Set(items.map(item => item.category)).size,
        description: 'Number of topics being learned',
        icon: <Brain className="w-5 h-5" />,
        color: 'text-indigo-500',
      },
    ] as InsightMetric[];
  }, [items]);

  const learningPatterns = useMemo(() => {
    const patterns: LearningPattern[] = [];

    // Analyze session consistency
    const sessions = items
      .flatMap(item => item.progress.sessions || [])
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const dailyMinutes = sessions.reduce((acc, session) => {
      const date = session.date.split('T')[0];
      acc[date] = (acc[date] || 0) + ((session.duration?.hours || 0) * 60 + (session.duration?.minutes || 0));
      return acc;
    }, {} as { [date: string]: number });

    const avgMinutes = Object.values(dailyMinutes).reduce((a, b) => a + b, 0) / Object.keys(dailyMinutes).length;

    if (avgMinutes < 30) {
      patterns.push({
        pattern: 'Short Learning Sessions',
        recommendation: 'Try to extend your learning sessions to at least 45 minutes for better knowledge retention.',
        impact: 'high',
      });
    }

    // Analyze completion patterns
    const incompleteTasks = items.filter(item => !item.completed);
    if (incompleteTasks.length > items.length * 0.7) {
      patterns.push({
        pattern: 'Low Task Completion Rate',
        recommendation: 'Consider breaking down larger tasks into smaller, manageable subtasks.',
        impact: 'high',
      });
    }

    // Analyze learning consistency
    const dates = Object.keys(dailyMinutes).sort();
    if (dates.length >= 2) {
      const gaps = dates.slice(1).map((date, i) => {
        const prev = new Date(dates[i]);
        const curr = new Date(date);
        return (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
      });

      const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
      if (avgGap > 2) {
        patterns.push({
          pattern: 'Irregular Learning Schedule',
          recommendation: 'Try to maintain a more consistent daily learning schedule, even if for shorter durations.',
          impact: 'medium',
        });
      }
    }

    return patterns;
  }, [items]);

  return (
    <div className="space-y-8">
      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {metrics.map((metric, index) => (
          <div
            key={index}
            className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm text-gray-500 mb-1">{metric.title}</div>
                <div className="text-2xl font-semibold">{metric.value}</div>
                <div className="text-sm text-gray-500 mt-1">{metric.description}</div>
              </div>
              <div className={`${metric.color} bg-opacity-10 p-3 rounded-lg`}>
                {metric.icon}
              </div>
            </div>
            {metric.trend && (
              <div className="mt-4 flex items-center gap-2">
                <div
                  className={`flex items-center gap-1 text-sm ${
                    metric.trend.isPositive ? 'text-green-500' : 'text-red-500'
                  }`}
                >
                  {metric.trend.isPositive ? (
                    <Star className="w-4 h-4" />
                  ) : (
                    <Star className="w-4 h-4 transform rotate-180" />
                  )}
                  <span>{metric.trend.value}%</span>
                </div>
                <span className="text-sm text-gray-500">
                  vs target
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Learning Patterns */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-6">
          <Brain className="w-5 h-5 text-purple-500" />
          <h2 className="text-lg font-semibold">Learning Patterns & Recommendations</h2>
        </div>
        <div className="space-y-4">
          {learningPatterns.map((pattern, index) => (
            <div
              key={index}
              className="border-l-4 pl-4 py-2"
              style={{
                borderColor:
                  pattern.impact === 'high'
                    ? '#EF4444'
                    : pattern.impact === 'medium'
                    ? '#F59E0B'
                    : '#10B981',
              }}
            >
              <div className="flex items-center gap-2 mb-1">
                {pattern.impact === 'high' && <Star className="w-4 h-4 text-red-500" />}
                {pattern.impact === 'medium' && <Star className="w-4 h-4 text-amber-500" />}
                {pattern.impact === 'low' && <Star className="w-4 h-4 text-emerald-500" />}
                <h3 className="font-medium">{pattern.pattern}</h3>
              </div>
              <p className="text-gray-600 text-sm">{pattern.recommendation}</p>
            </div>
          ))}
          {learningPatterns.length === 0 && (
            <div className="text-center text-gray-500 py-4">
              Keep learning! Patterns will emerge as you track more activities.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
