import { Flame } from 'lucide-react';
import { StreakData } from '../types';

interface Props {
  streak: StreakData;
}

export function StreakDisplay({ streak }: Props) {
  return (
    <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white p-4 rounded-xl shadow-lg">
      <div className="flex items-center gap-3">
        <Flame className="w-6 h-6" />
        <div>
          <div className="text-2xl font-bold">{streak.currentStreak} Days</div>
          <div className="text-sm opacity-90">Current Streak</div>
        </div>
      </div>
      <div className="mt-2 text-sm opacity-90">
        Longest streak: {streak.longestStreak} days
      </div>
    </div>
  );
} 