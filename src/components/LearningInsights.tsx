import { useMemo } from 'react';
import { LearningItem } from '../types';
import { Brain, Lightbulb, Zap, TrendingUp, Clock, Calendar, Target, BarChart3 } from 'lucide-react';

interface Props {
  items: LearningItem[];
  isLoading?: boolean;
  error?: string;
}

interface LearningPattern {
  bestTimeOfDay: string;
  mostProductiveDay: string;
  averageSessionLength: number;
  preferredCategories: { category: string; count: number }[];
  completionRate: number;
  learningVelocity: number; // Items completed per week
  focusedCategories: string[];
  neglectedCategories: string[];
  streakConsistency: number;
}

interface Recommendation {
  type: 'schedule' | 'focus' | 'habit' | 'improvement';
  title: string;
  description: string;
  action?: string;
  impact: 'high' | 'medium' | 'low';
  icon: JSX.Element;
}

export function LearningInsights({ items, isLoading, error }: Props) {
  const patterns = useMemo((): LearningPattern => {
    const now = new Date();
    const timeByHour: { [key: number]: number } = {};
    const timeByDay: { [key: string]: number } = {};
    const categoryCount: { [key: string]: number } = {};
    const categoryTime: { [key: string]: number } = {};
    let totalSessions = 0;
    let totalTime = 0;
    let completedItems = 0;
    let totalItems = items.length;
    let streakDays = new Set<string>();

    // Analyze all sessions
    items.forEach(item => {
      if (item.category) {
        categoryCount[item.category] = (categoryCount[item.category] || 0) + 1;
      }

      if (item.completed) {
        completedItems++;
      }

      // Get sessions from progress
      const sessions = item.progress?.sessions || [];
      sessions.forEach(session => {
        if (!session.date) return;

        const date = new Date(session.date);
        const hour = date.getHours();
        const day = date.toLocaleDateString('en-US', { weekday: 'long' });
        const duration = session.duration || { hours: 0, minutes: 0 };
        const minutes = (duration.hours * 60) + duration.minutes;

        timeByHour[hour] = (timeByHour[hour] || 0) + minutes;
        timeByDay[day] = (timeByDay[day] || 0) + minutes;
        totalTime += minutes;
        totalSessions++;
        streakDays.add(date.toISOString().split('T')[0]);

        if (item.category) {
          categoryTime[item.category] = (categoryTime[item.category] || 0) + minutes;
        }
      });
    });

    // Find best time of day
    const bestHour = Object.entries(timeByHour)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || '9';

    // Find most productive day
    const bestDay = Object.entries(timeByDay)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || 'Monday';

    // Calculate average session length (in minutes)
    const avgSessionLength = totalSessions ? Math.round(totalTime / totalSessions) : 0;

    // Sort categories by time spent
    const sortedCategories = Object.entries(categoryTime)
      .sort(([, a], [, b]) => b - a)
      .map(([category]) => category);

    // Calculate learning velocity (items completed per week)
    const oldestItemDate = items.length > 0 
      ? Math.min(...items.map(item => new Date(item.date).getTime()))
      : now.getTime();
    const weeksDiff = Math.max(1, Math.ceil((now.getTime() - oldestItemDate) / (1000 * 60 * 60 * 24 * 7)));
    const learningVelocity = completedItems / weeksDiff;

    // Calculate streak consistency
    const streakDaysArray = Array.from(streakDays)
      .map(dateStr => new Date(dateStr))
      .sort((a, b) => b.getTime() - a.getTime());

    let currentStreak = 0;
    let maxStreak = 0;
    let tempStreak = 0;

    // Calculate current streak (must include today or yesterday)
    const mostRecentDate = streakDaysArray[0];
    if (mostRecentDate) {
      const daysSinceLastSession = Math.floor((now.getTime() - mostRecentDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysSinceLastSession <= 1) { // Count streak if last session was today or yesterday
        currentStreak = 1;
        for (let i = 1; i < streakDaysArray.length; i++) {
          const daysBetween = Math.floor(
            (streakDaysArray[i-1].getTime() - streakDaysArray[i].getTime()) / (1000 * 60 * 60 * 24)
          );
          if (daysBetween === 1) {
            currentStreak++;
          } else {
            break;
          }
        }
      }
    }

    // Calculate max streak
    tempStreak = 1; // Start with 1 for the first day
    for (let i = 1; i < streakDaysArray.length; i++) {
      const daysBetween = Math.floor(
        (streakDaysArray[i-1].getTime() - streakDaysArray[i].getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysBetween === 1) {
        tempStreak++;
      } else {
        maxStreak = Math.max(maxStreak, tempStreak);
        tempStreak = 1;
      }
    }
    maxStreak = Math.max(maxStreak, tempStreak, currentStreak);

    // Calculate streak consistency as a percentage of days with learning activity
    const streakConsistency = streakDays.size > 0
      ? Math.min(100, (streakDays.size / Math.ceil((now.getTime() - oldestItemDate) / (1000 * 60 * 60 * 24))) * 100)
      : 0;

    return {
      bestTimeOfDay: `${parseInt(bestHour)}:00`,
      mostProductiveDay: bestDay,
      averageSessionLength: avgSessionLength,
      preferredCategories: Object.entries(categoryCount)
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count),
      completionRate: totalItems > 0 ? (completedItems / totalItems) * 100 : 0,
      learningVelocity,
      focusedCategories: sortedCategories.slice(0, 2),
      neglectedCategories: sortedCategories.slice(-2),
      streakConsistency
    };
  }, [items]);

  const recommendations = useMemo((): Recommendation[] => {
    const recs: Recommendation[] = [];

    // Schedule-based recommendations
    recs.push({
      type: 'schedule',
      title: 'Optimal Learning Time',
      description: `Schedule focused learning sessions around ${patterns.bestTimeOfDay}, your most productive time.`,
      action: `Block ${patterns.bestTimeOfDay} for deep learning sessions`,
      impact: 'high',
      icon: <Clock className="w-5 h-5 text-blue-500" />
    });

    // Focus recommendations
    if (patterns.neglectedCategories.length > 0) {
      recs.push({
        type: 'focus',
        title: 'Balance Your Learning',
        description: `Consider spending more time on ${patterns.neglectedCategories.join(', ')}.`,
        action: 'Add new items from these categories',
        impact: 'medium',
        icon: <Target className="w-5 h-5 text-purple-500" />
      });
    }

    // Habit recommendations
    if (patterns.streakConsistency < 70) {
      recs.push({
        type: 'habit',
        title: 'Build Consistency',
        description: 'Regular learning sessions, even if short, are more effective than irregular long sessions.',
        action: 'Set daily learning reminders',
        impact: 'high',
        icon: <TrendingUp className="w-5 h-5 text-green-500" />
      });
    }

    // Performance recommendations
    if (patterns.completionRate < 60) {
      recs.push({
        type: 'improvement',
        title: 'Completion Rate Boost',
        description: 'Try breaking down larger learning items into smaller, manageable tasks.',
        action: 'Review and split large tasks',
        impact: 'high',
        icon: <Zap className="w-5 h-5 text-yellow-500" />
      });
    }

    return recs;
  }, [patterns]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border-2 border-gray-100 dark:border-gray-700 p-4 sm:p-6">
      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : error ? (
        <div className="text-red-500 text-center p-4">{error}</div>
      ) : (
        <>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg">
              <Brain className="w-6 h-6 text-white" aria-hidden="true" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Learning Insights</h2>
          </div>

          {/* Patterns Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-500" aria-hidden="true" />
                Learning Patterns
              </h3>
              <div className="space-y-3 bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Best learning time: <span className="font-semibold text-gray-800 dark:text-gray-100">{patterns.bestTimeOfDay}</span>
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Most productive day: <span className="font-semibold text-gray-800 dark:text-gray-100">{patterns.mostProductiveDay}</span>
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Average session: <span className="font-semibold text-gray-800 dark:text-gray-100">
                    {Math.floor(patterns.averageSessionLength / 60)}h {patterns.averageSessionLength % 60}m
                  </span>
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Learning velocity: <span className="font-semibold text-gray-800 dark:text-gray-100">
                    {patterns.learningVelocity.toFixed(1)} items/week
                  </span>
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
                <Target className="w-5 h-5 text-purple-500" aria-hidden="true" />
                Focus Areas
              </h3>
              <div className="space-y-3 bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Top categories: <span className="font-semibold text-gray-800 dark:text-gray-100">
                    {patterns.focusedCategories.join(', ')}
                  </span>
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Needs attention: <span className="font-semibold text-gray-800 dark:text-gray-100">
                    {patterns.neglectedCategories.join(', ')}
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Recommendations */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-yellow-500" aria-hidden="true" />
              Personalized Recommendations
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {recommendations.map((rec, index) => (
                <div
                  key={index}
                  className="p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-600 hover:border-blue-100 dark:hover:border-blue-500/30 transition-all duration-200"
                  role="article"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-1 flex-shrink-0">{rec.icon}</div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-800 dark:text-gray-100 mb-2">{rec.title}</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">{rec.description}</p>
                      {rec.action && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-100">
                            Suggestion: {rec.action}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
