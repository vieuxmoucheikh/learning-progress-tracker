import { useMemo } from 'react';
import { LearningItem, Session } from '../types';
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
  bestStreak: number;
  totalSessions: number;
  daysActive: number;
}

interface Recommendation {
  type: 'schedule' | 'focus' | 'habit' | 'improvement';
  title: string;
  description: string;
  action?: string;
  impact: 'high' | 'medium' | 'low';
  icon: JSX.Element;
}

const calculateLearningVelocity = (sessions: Session[]): number => {
  if (!sessions || sessions.length === 0) {
    console.log('No sessions available for velocity calculation');
    return 0;
  }

  console.log('Calculating learning velocity from sessions:', sessions);

  try {
    // Sort sessions by date
    const sortedSessions = [...sessions].sort((a, b) => {
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });

    // Calculate total time invested
    const totalMinutes = sortedSessions.reduce((total, session) => {
      if (!session.duration) {
        console.log('Session missing duration:', session);
        return total;
      }
      const minutes = (session.duration.hours * 60) + session.duration.minutes;
      console.log(`Session duration: ${minutes} minutes`);
      return total + minutes;
    }, 0);

    // Calculate time span in days
    const firstSession = sortedSessions[0];
    const lastSession = sortedSessions[sortedSessions.length - 1];
    
    if (!firstSession?.date || !lastSession?.date) {
      console.log('Missing date information for velocity calculation');
      return 0;
    }

    const firstDate = new Date(firstSession.date);
    const lastDate = new Date(lastSession.date);
    const daysDiff = Math.max(1, Math.ceil((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)));
    
    console.log(`Time span: ${daysDiff} days`);
    console.log(`Total minutes: ${totalMinutes}`);
    
    // Calculate average minutes per day
    const velocity = Math.round(totalMinutes / daysDiff);
    console.log(`Calculated velocity: ${velocity} minutes per day`);
    
    return velocity;
  } catch (e) {
    console.error('Error calculating learning velocity:', e);
    return 0;
  }
};

const calculateStreakConsistency = (sessions: Session[]): number => {
  if (!sessions || sessions.length === 0) {
    console.log('No sessions available for streak consistency calculation');
    return 0;
  }

  console.log('Calculating streak consistency from sessions:', sessions);

  try {
    // Get unique dates and sort them
    const uniqueDates = Array.from(new Set(
      sessions
        .map(s => s.date?.split('T')[0])
        .filter(Boolean)
    )).map(dateStr => new Date(dateStr));

    uniqueDates.sort((a, b) => a.getTime() - b.getTime());
    
    if (uniqueDates.length <= 1) {
      console.log('Not enough sessions for streak consistency calculation');
      return 0;
    }

    // Calculate gaps between consecutive sessions
    let totalGaps = 0;
    let maxGap = 0;
    
    for (let i = 1; i < uniqueDates.length; i++) {
      const gap = Math.floor(
        (uniqueDates[i].getTime() - uniqueDates[i-1].getTime()) / (1000 * 60 * 60 * 24)
      ) - 1; // Subtract 1 to get the gap (e.g., consecutive days have a gap of 0)
      
      totalGaps += gap;
      maxGap = Math.max(maxGap, gap);
      
      console.log(`Gap between ${uniqueDates[i-1].toISOString()} and ${uniqueDates[i].toISOString()}: ${gap} days`);
    }

    const timeSpan = Math.floor(
      (uniqueDates[uniqueDates.length - 1].getTime() - uniqueDates[0].getTime()) / (1000 * 60 * 60 * 24)
    );
    
    console.log(`Total time span: ${timeSpan} days`);
    console.log(`Total gaps: ${totalGaps} days`);
    console.log(`Maximum gap: ${maxGap} days`);
    
    // Calculate consistency score (0-100)
    // Lower gaps and more frequent sessions result in higher consistency
    const consistencyScore = Math.round(
      (1 - (totalGaps / Math.max(timeSpan, 1))) * 100
    );
    
    console.log(`Calculated consistency score: ${consistencyScore}%`);
    
    return Math.max(0, Math.min(100, consistencyScore));
  } catch (e) {
    console.error('Error calculating streak consistency:', e);
    return 0;
  }
};

const calculateCurrentStreak = (date: string, streakDays: string[]) => {
  const today = new Date(date);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  let currentStreak = 0;
  let tempStreak = 0;

  if (streakDays.includes(today.toISOString().split('T')[0])) {
    currentStreak = 1;
  }

  for (let i = 1; i < streakDays.length; i++) {
    const curr = new Date(streakDays[i]);
    const prev = new Date(streakDays[i - 1]);
    const diffDays = Math.floor((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      tempStreak++;
      if (curr.getTime() === today.getTime() || curr.getTime() === yesterday.getTime()) {
        currentStreak = tempStreak;
      }
    } else {
      tempStreak = 1; // Reset to 1 (not 0) as this day still counts
    }
  }

  return currentStreak;
};

export function LearningInsights({ items, isLoading, error }: Props) {
  const patterns = useMemo((): LearningPattern => {
    console.log('Processing items for analytics:', items);
    
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
    let allSessions: Session[] = [];

    // Collect all sessions from items
    items.forEach(item => {
      if (item.progress?.sessions) {
        allSessions = [...allSessions, ...item.progress.sessions];
      }
    });

    // Sort sessions by date
    allSessions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    console.log('Total sessions collected:', allSessions.length);

    // Process each session
    allSessions.forEach(session => {
      if (!session?.date || !session?.duration) {
        console.log('Invalid session data:', session);
        return;
      }

      try {
        const sessionDate = new Date(session.date);
        const duration = ((session.duration?.hours || 0) * 60) + (session.duration?.minutes || 0);

        // Update time distributions
        const hour = sessionDate.getHours();
        const day = sessionDate.toLocaleDateString('en-US', { weekday: 'long' });
        timeByHour[hour] = (timeByHour[hour] || 0) + duration;
        timeByDay[day] = (timeByDay[day] || 0) + duration;
        
        // Track unique days for streaks
        streakDays.add(sessionDate.toISOString().split('T')[0]);
        
        totalTime += duration;
        totalSessions++;

      } catch (e) {
        console.error('Error processing session:', e);
      }
    });

    // Calculate learning velocity
    const learningVelocity = calculateLearningVelocity(allSessions);

    // Calculate streak consistency
    const streakConsistency = calculateStreakConsistency(allSessions);

    // Find best time of day
    const bestHour = Object.entries(timeByHour)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || '9';
    
    // Find most productive day
    const mostProductiveDay = Object.entries(timeByDay)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || 'Monday';

    // Calculate average session length
    const averageSessionLength = totalSessions > 0 ? Math.round(totalTime / totalSessions) : 0;

    // Get preferred categories
    const preferredCategories = Object.entries(categoryCount)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);

    // Calculate completion rate
    const completionRate = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;

    return {
      bestTimeOfDay: `${bestHour}:00`,
      mostProductiveDay,
      averageSessionLength,
      preferredCategories,
      completionRate,
      learningVelocity,
      focusedCategories: Object.entries(categoryTime)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([category]) => category),
      neglectedCategories: Object.entries(categoryTime)
        .sort(([, a], [, b]) => a - b)
        .slice(0, 3)
        .map(([category]) => category),
      streakConsistency,
      bestStreak: Math.max(...Array.from(streakDays).map(date => {
        const streak = calculateCurrentStreak(date, Array.from(streakDays));
        return streak;
      }), 0),
      totalSessions,
      daysActive: streakDays.size
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
                    {patterns.learningVelocity.toFixed(1)} minutes/day
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
