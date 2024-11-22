export interface Time {
  hours: number;
  minutes: number;
}

export interface Session {
  startTime: string;
  endTime?: string;
  duration?: Time;
  date: string;
  notes?: string[];
}

export interface Progress {
  current: Time;
  total?: Time;
  lastAccessed?: string;
  sessions: Session[];
}

export interface LearningItem {
  id: string;
  title: string;
  type: 'video' | 'pdf' | 'url' | 'book' | 'course' | 'article';
  progress: Progress;
  url?: string;
  notes?: string;
  completed: boolean;
  completed_at?: string | null;
  archived_at?: string | null;
  category: string;
  priority: 'low' | 'medium' | 'high';
  due_date?: string;
  tags: string[];
  date: string;
  difficulty: 'easy' | 'medium' | 'hard';
  status: 'not_started' | 'in_progress' | 'completed' | 'on_hold' | 'archived';
  rating?: 1 | 2 | 3 | 4 | 5;
  user_id?: string;
  lastTimestamp?: number | null;
}

export type LearningItemFormData = Omit<LearningItem, 'id' | 'progress'> & {
  current: Time;
  total?: Time;
  goal?: { hours: number; minutes: number };
  unit: 'hours' | 'pages' | 'percent';
};

export interface StreakData {
  user_id: string;
  current_streak: number;
  longest_streak: number;
  last_activity_date?: string;
  history: {
    date: string;
    minutesSpent: number;
    itemsCompleted: number;
  }[];
}

export interface TimeStats {
  totalTime: { hours: number; minutes: number };
  averageDaily: { hours: number; minutes: number };
  byCategory: Record<string, { hours: number; minutes: number }>;
  byType: Record<string, { hours: number; minutes: number }>;
  mostProductiveDay: string;
  mostProductiveTime: string;
}