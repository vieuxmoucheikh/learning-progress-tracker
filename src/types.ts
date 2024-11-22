export interface Session {
  startTime: string;
  endTime?: string;
  duration?: { hours: number; minutes: number };
  date: string;
}

export interface Progress {
  current: { hours: number; minutes: number };
  total: { hours: number; minutes: number };
  lastAccessed: string;
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
}

export type LearningItemFormData = Omit<LearningItem, 'id' | 'progress'> & {
  current: { hours: number; minutes: number; pages?: number };
  total?: { hours: number; minutes: number };
  goal?: { hours: number; minutes: number };
  unit: 'hours' | 'pages' | 'percent';
};

export interface StreakData {
  currentStreak: number;
  lastActivityDate: string | null;
  longestStreak: number;
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