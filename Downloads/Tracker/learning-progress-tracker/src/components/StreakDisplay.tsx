import { Flame, Calendar, Trophy, AlertCircle } from 'lucide-react';
import { LearningItem } from '../types';
import { calculateStreak } from '../lib/utils';

interface Props {
  items: LearningItem[];
}

export function StreakDisplay({ items }: Props) {
  const { currentStreak, longestStreak, lastActiveDate } = calculateStreak(items);
  const lastActive = lastActiveDate ? new Date(lastActiveDate) : null;
  const today = new Date();
  const isActiveToday = lastActive?.toDateString() === today.toDateString();

  return (
    <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white p-6 rounded-xl shadow-lg">
      <div className="flex items-center gap-4 mb-4">
        <div className={`p-3 rounded-full ${isActiveToday ? 'bg-yellow-400 animate-pulse' : 'bg-white/10'}`}>
          <Flame className={`w-8 h-8 ${isActiveToday ? 'text-orange-600' : 'text-white'}`} />
        </div>
        <div>
          <div className="text-3xl font-bold">{currentStreak}</div>
          <div className="text-sm opacity-90">Day Streak</div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm">
          <Trophy className="w-4 h-4" />
          <span>Longest streak: {longestStreak} days</span>
        </div>
        
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="w-4 h-4" />
          <span>
            {isActiveToday 
              ? "You're active today!" 
              : lastActive 
                ? `Last active: ${lastActive.toLocaleDateString()}`
                : "No activity yet"}
          </span>
        </div>

        {!isActiveToday && currentStreak > 0 && (
          <div className="flex items-center gap-2 text-sm bg-white/10 p-2 rounded-lg">
            <AlertCircle className="w-4 h-4" />
            <span>Complete an activity today to keep your streak!</span>
          </div>
        )}
      </div>
    </div>
  );
}